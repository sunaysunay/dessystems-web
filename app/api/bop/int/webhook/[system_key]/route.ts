/**
 * POST /api/bop/int/webhook/[system_key]
 *
 * Inbound webhook receiver for any registered int_systems entry.
 * - Verifies HMAC-SHA256 signature using the system's secret (env var named by system.secret_ref)
 * - Inserts an int_messages row for async processing by die-worker
 * - Returns 200 immediately (fire-and-forget queue pattern)
 *
 * Signature header conventions per system:
 *   marktplaats  → X-Marktplaats-Signature: sha256=<hex>
 *   autoscout24  → X-AS24-Signature: sha256=<hex>
 *   generic      → X-DES-Signature: sha256=<hex>
 *
 * To register a new webhook source: add an int_systems row + int_flows row with
 * trigger_event='webhook' and flow_key='{system_key}.webhook_event'.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { createHmac } from 'crypto';

const SIG_HEADERS: Record<string, string> = {
  marktplaats: 'x-marktplaats-signature',
  autoscout24: 'x-as24-signature',
};

function verifySignature(body: string, secret: string, sigHeader: string | null): boolean {
  if (!sigHeader) return false;
  const expected = 'sha256=' + createHmac('sha256', secret).update(body, 'utf8').digest('hex');
  // Constant-time comparison
  if (expected.length !== sigHeader.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sigHeader.charCodeAt(i);
  return diff === 0;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ system_key: string }> }
) {
  const { system_key } = await params;
  const supabase    = getServerClient();
  const rawBody     = await req.text();

  // Resolve system
  const { data: sys } = await supabase
    .from('int_systems')
    .select('id, system_key, secret_ref, status')
    .eq('system_key', system_key)
    .maybeSingle();

  if (!sys || sys.status === 'disabled')
    return NextResponse.json({ error: 'Unknown or disabled system' }, { status: 404 });

  // Verify signature if system has a secret configured
  if (sys.secret_ref) {
    const secret    = process.env[sys.secret_ref];
    const sigHeader = (req.headers.get(SIG_HEADERS[system_key] ?? 'x-des-signature') ?? '').toLowerCase();
    if (!secret || !verifySignature(rawBody, secret, sigHeader)) {
      console.warn(`[DIE webhook] Signature verification failed for system: ${system_key}`);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  }

  // Parse body
  let payload: unknown;
  try {
    payload = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    payload = { raw: rawBody };
  }

  // Resolve webhook flow
  const flow_key = `${system_key}.webhook_event`;
  const { data: flow } = await supabase
    .from('int_flows')
    .select('id')
    .eq('flow_key', flow_key)
    .eq('active', true)
    .maybeSingle();

  // Enqueue — even if no specific flow found, we record it with flow_id null
  const { error: msgErr } = await supabase.from('int_messages').insert({
    flow_id:         flow?.id ?? null,
    system_id:       sys.id,
    message_type:    'webhook_event',
    entity_type:     (payload as any)?.entity_type ?? null,
    entity_id:       (payload as any)?.entity_id ?? (payload as any)?.id ?? null,
    priority:        3,
    status:          'pending',
    max_attempts:    1,
    next_attempt_at: new Date().toISOString(),
    payload:         payload as any,
  });

  if (msgErr) {
    console.error('[DIE webhook] Failed to enqueue:', msgErr.message);
    return NextResponse.json({ error: 'Enqueue failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}

// Some platforms send a GET to verify the webhook URL
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ system_key: string }> }
) {
  const { system_key } = await params;
  const challenge = req.nextUrl.searchParams.get('challenge') ?? req.nextUrl.searchParams.get('hub.challenge');
  if (challenge) return new NextResponse(challenge, { status: 200 });
  return NextResponse.json({ ok: true, system: system_key });
}

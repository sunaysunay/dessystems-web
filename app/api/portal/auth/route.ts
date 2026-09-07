export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import {
  PORTAL_COOKIE, SESSION_DAYS,
  hashCode, normalizeCode, makeSessionToken,
  getPortalClient, logPortalEvent, requestMeta,
} from '@/lib/portal/auth';

const FAIL_LIMIT = 8;
const FAIL_WINDOW_MS = 15 * 60 * 1000;

// GET → current session (used by portal pages to redirect when logged out)
export async function GET(req: NextRequest) {
  const client = await getPortalClient(req);
  if (!client) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({
    ok: true,
    client: { slug: client.slug, name: client.name, contact_name: client.contact_name, locale: client.locale },
  });
}

// POST { slug, code } → set session cookie
export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const { ip, user_agent } = requestMeta(req);

  let body: { slug?: string; code?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 }); }

  const slug = String(body.slug || '').toLowerCase().trim();
  const code = normalizeCode(body.code || '');
  if (!slug || !code) return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 });

  // Rate limit per ip: failed unlocks in the last window
  const since = new Date(Date.now() - FAIL_WINDOW_MS).toISOString();
  const { count } = await supabase
    .from('portal_events')
    .select('id', { count: 'exact', head: true })
    .eq('type', 'login_failed')
    .eq('ip', ip)
    .gte('created_at', since);
  if ((count ?? 0) >= FAIL_LIMIT) {
    return NextResponse.json({ ok: false, error: 'too_many' }, { status: 429 });
  }

  const { data: client } = await supabase
    .from('portal_clients')
    .select('id, slug, name, locale, status, expires_at, code_salt, code_hash')
    .eq('slug', slug)
    .single();

  const fail = async (error: string, status: number) => {
    await logPortalEvent({ clientId: client?.id ?? null, type: 'login_failed', detail: slug, ip, userAgent: user_agent });
    return NextResponse.json({ ok: false, error }, { status });
  };

  if (!client || client.status === 'closed') return fail('invalid', 401);
  if (client.status !== 'active') return fail('invalid', 401);
  if (client.expires_at && new Date(client.expires_at) < new Date()) {
    return NextResponse.json({ ok: false, error: 'expired' }, { status: 403 });
  }
  if (hashCode(code, client.code_salt) !== client.code_hash) return fail('invalid', 401);

  await logPortalEvent({ clientId: client.id, type: 'login', ip, userAgent: user_agent });

  const res = NextResponse.json({ ok: true, redirect: '/portal', locale: client.locale });
  res.cookies.set(PORTAL_COOKIE, makeSessionToken(client.id), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 3600,
  });
  return res;
}

// DELETE → sign out
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(PORTAL_COOKIE, '', { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 0 });
  return res;
}

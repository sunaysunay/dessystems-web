// app/api/bop/mkt/studio/sessions/[id]/process/route.ts
// Enqueue pipeline steps for all selected images; enforce cost cap
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { callerUid } from '@/lib/api-guard';
import { STEP_ORDER } from '@/lib/studio/types';

export const dynamic = 'force-dynamic';
type Ctx = { params: Promise<{ id: string }> };

const PROVIDER_RATE_CENTS = parseInt(process.env.STUDIO_COMPOSE_RATE_CENTS ?? '5', 10); // per image
const MAX_COST = parseInt(process.env.STUDIO_MAX_COST_CENTS_PER_SESSION ?? '500', 10);

export async function POST(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const uid = await callerUid();
  if (!uid) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const sb = getServerClient();

  const { data: session, error: sErr } = await sb
    .from('bop_studio_sessions')
    .select('*, bop_studio_images(*)')
    .eq('id', id)
    .eq('created_by', uid)
    .single();

  if (sErr || !session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  if (!['draft', 'review'].includes(session.status)) {
    return NextResponse.json({ error: `Cannot process session in status "${session.status}"` }, { status: 409 });
  }

  const images = (session.bop_studio_images ?? []).filter((img: { selected: boolean }) => img.selected);
  if (!images.length) return NextResponse.json({ error: 'No selected images' }, { status: 400 });

  // Cost guard
  const estimatedCents = images.length * PROVIDER_RATE_CENTS;
  if (estimatedCents > MAX_COST) {
    return NextResponse.json(
      { error: 'Estimated cost exceeds session cap', estimated_cents: estimatedCents, cap_cents: MAX_COST },
      { status: 402 },
    );
  }

  // Update session cost estimate + status
  await sb.from('bop_studio_sessions').update({
    status: 'processing',
    cost_cents: estimatedCents,
    updated_at: new Date().toISOString(),
  }).eq('id', id);

  // Enqueue steps for each selected image
  let enqueued = 0;
  for (const img of images) {
    await sb.from('bop_studio_images').update({ status: 'processing', error: null }).eq('id', img.id);

    for (let stepNo = 0; stepNo < STEP_ORDER.length; stepNo++) {
      const kind = STEP_ORDER[stepNo]!;
      const settings = { ...session.settings, ...(img.overrides ?? {}) };

      const { data: step } = await sb
        .from('bop_studio_steps')
        .upsert({
          image_id: img.id,
          step_no: stepNo,
          kind,
          input: { presetCode: img.overrides?.presetCode ?? session.preset_code, ...settings },
          status: 'pending',
          output: null,
          started_at: null,
          finished_at: null,
          cost_cents: 0,
        }, { onConflict: 'image_id,step_no' })
        .select('id')
        .single();

      if (step) {
        // Only enqueue the first step; worker chains the rest
        if (stepNo === 0) {
          await sb.from('bop_studio_jobs').insert({ step_id: step.id, run_after: new Date().toISOString() });
        }
      }
    }
    enqueued++;
  }

  return NextResponse.json({ ok: true, enqueued, estimated_cents: estimatedCents });
}

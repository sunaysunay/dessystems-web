// app/api/bop/mkt/studio/images/[id]/rerun/route.ts
// POST { fromStep: number } — invalidate steps ≥ fromStep and re-enqueue
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { callerUid } from '@/lib/api-guard';
import { STEP_ORDER } from '@/lib/studio/types';

export const dynamic = 'force-dynamic';
type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const uid = await callerUid();
  if (!uid) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const fromStep: number = body.fromStep ?? 0;

  if (fromStep < 0 || fromStep >= STEP_ORDER.length) {
    return NextResponse.json({ error: `fromStep must be 0–${STEP_ORDER.length - 1}` }, { status: 400 });
  }

  const sb = getServerClient();

  // Verify ownership
  const { data: img } = await sb
    .from('bop_studio_images')
    .select('id, session_id, bop_studio_sessions!inner(created_by, status)')
    .eq('id', id)
    .single();

  if (!img) return NextResponse.json({ error: 'Image not found' }, { status: 404 });
  const session = (img as unknown as { bop_studio_sessions: { created_by: string; status: string } }).bop_studio_sessions;
  if (session.created_by !== uid) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  // Reset steps ≥ fromStep
  await sb.from('bop_studio_steps').update({
    status: 'pending', output: null, started_at: null, finished_at: null, cost_cents: 0,
  }).eq('image_id', id).gte('step_no', fromStep);

  // Delete pending/running jobs for these steps
  const { data: stepsToReset } = await sb
    .from('bop_studio_steps')
    .select('id')
    .eq('image_id', id)
    .gte('step_no', fromStep);

  const stepIds = (stepsToReset ?? []).map((s: { id: string }) => s.id);
  if (stepIds.length) {
    await sb.from('bop_studio_jobs').delete().in('step_id', stepIds);
  }

  // Enqueue the fromStep job
  const { data: firstStep } = await sb
    .from('bop_studio_steps')
    .select('id')
    .eq('image_id', id)
    .eq('step_no', fromStep)
    .single();

  if (firstStep) {
    await sb.from('bop_studio_jobs').insert({ step_id: firstStep.id, run_after: new Date().toISOString() });
  }

  // Reset image + session status
  await sb.from('bop_studio_images').update({ status: 'processing', error: null }).eq('id', id);
  await sb.from('bop_studio_sessions').update({ status: 'processing', updated_at: new Date().toISOString() }).eq('id', img.session_id);

  return NextResponse.json({ ok: true, rerunFromStep: fromStep });
}

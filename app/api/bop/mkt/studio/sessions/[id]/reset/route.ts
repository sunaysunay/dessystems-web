// app/api/bop/mkt/studio/sessions/[id]/reset/route.ts — reset all steps + re-queue pipeline
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { callerUid } from '@/lib/api-guard';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const uid = await callerUid();
  if (!uid) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const sb = getServerClient();
  const { data: session } = await sb
    .from('bop_studio_sessions').select('id')
    .eq('id', id).eq('created_by', uid).single();
  if (!session) return NextResponse.json({ error: 'not found' }, { status: 404 });

  // Get all images for this session
  const { data: images } = await sb
    .from('bop_studio_images').select('id').eq('session_id', id);

  if (images?.length) {
    const imageIds = images.map(i => i.id);

    // Reset all images to pending
    await sb.from('bop_studio_images')
      .update({ status: 'pending', error: null })
      .in('id', imageIds);

    // Reset all steps to pending
    await sb.from('bop_studio_steps')
      .update({ status: 'pending', started_at: null, finished_at: null, output: null, provider: null, cost_cents: 0 })
      .in('image_id', imageIds);

    // Clear any existing jobs, then re-queue step 0 for each image
    const { data: allSteps } = await sb.from('bop_studio_steps').select('id').in('image_id', imageIds);
    if (allSteps?.length) {
      await sb.from('bop_studio_jobs').delete().in('step_id', allSteps.map(s => s.id));
    }

    for (const img of images) {
      const { data: firstStep } = await sb
        .from('bop_studio_steps').select('id')
        .eq('image_id', img.id).eq('step_no', 0).single();
      if (firstStep) {
        await sb.from('bop_studio_jobs').insert({ step_id: firstStep.id, run_after: new Date().toISOString() });
      }
    }
  }

  // Set session to processing
  await sb.from('bop_studio_sessions')
    .update({ status: 'processing', cost_cents: 0, updated_at: new Date().toISOString() })
    .eq('id', id);

  return NextResponse.json({ ok: true });
}

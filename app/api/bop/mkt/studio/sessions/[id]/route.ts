// app/api/bop/mkt/studio/sessions/[id]/route.ts — session detail, patch, delete
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { callerUid } from '@/lib/api-guard';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

// GET — full session with images + steps
export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const uid = await callerUid();
  if (!uid) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const sb = getServerClient();
  const { data: session, error } = await sb
    .from('bop_studio_sessions')
    .select('*, bop_studio_images(*, bop_studio_steps(*))')
    .eq('id', id)
    .eq('created_by', uid)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ session });
}

// PATCH — update session settings or preset
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const uid = await callerUid();
  if (!uid) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const sb = getServerClient();

  const allowed = ['preset_code', 'settings', 'listing_id'];
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const k of allowed) if (k in body) patch[k] = body[k];

  const { data, error } = await sb
    .from('bop_studio_sessions')
    .update(patch)
    .eq('id', id)
    .eq('created_by', uid)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ session: data });
}

// DELETE — hard delete session + cascade storage files
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const uid = await callerUid();
  if (!uid) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const sb = getServerClient();

  // Verify ownership
  const { data: session } = await sb
    .from('bop_studio_sessions').select('id')
    .eq('id', id).eq('created_by', uid).single();
  if (!session) return NextResponse.json({ error: 'not found' }, { status: 404 });

  // Collect and remove all storage files under this session prefix
  const { data: topLevel } = await sb.storage.from('studio').list(id, { limit: 200 });
  if (topLevel?.length) {
    const allPaths: string[] = [];
    for (const entry of topLevel) {
      if (entry.id) {
        // It is a file
        allPaths.push(`${id}/${entry.name}`);
      } else {
        // It is a sub-folder (image id folder contains composed/plated/branded/export files)
        const { data: sub } = await sb.storage.from('studio').list(`${id}/${entry.name}`, { limit: 200 });
        if (sub?.length) {
          for (const sf of sub) {
            if (sf.id) allPaths.push(`${id}/${entry.name}/${sf.name}`);
            else {
              // export sub-folder
              const { data: deep } = await sb.storage.from('studio').list(`${id}/${entry.name}/${sf.name}`, { limit: 200 });
              if (deep?.length) for (const df of deep) allPaths.push(`${id}/${entry.name}/${sf.name}/${df.name}`);
            }
          }
        }
      }
    }
    if (allPaths.length) await sb.storage.from('studio').remove(allPaths);
  }

  // Hard delete row — FK ON DELETE CASCADE removes bop_studio_images + steps + jobs
  const { error } = await sb
    .from('bop_studio_sessions').delete()
    .eq('id', id).eq('created_by', uid);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// POST /reset — reset all steps to pending so pipeline can re-run
export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const url = new URL(req.url);
  if (url.pathname.split('/').pop() !== 'reset') {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  const uid = await callerUid();
  if (!uid) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const sb = getServerClient();
  const { data: session } = await sb
    .from('bop_studio_sessions').select('id')
    .eq('id', id).eq('created_by', uid).single();
  if (!session) return NextResponse.json({ error: 'not found' }, { status: 404 });

  // Reset all images to pending
  await sb.from('bop_studio_images')
    .update({ status: 'pending', error: null })
    .eq('session_id', id);

  // Get all image ids for this session
  const { data: images } = await sb
    .from('bop_studio_images').select('id').eq('session_id', id);

  if (images?.length) {
    const imageIds = images.map(i => i.id);
    // Reset all steps to pending
    await sb.from('bop_studio_steps')
      .update({ status: 'pending', started_at: null, finished_at: null, output: null, provider: null, cost_cents: 0 })
      .in('image_id', imageIds);
    // Remove any pending jobs then re-queue step 0 for each image
    await sb.from('bop_studio_jobs').delete().in(
      'step_id',
      (await sb.from('bop_studio_steps').select('id').in('image_id', imageIds)).data?.map(s => s.id) ?? []
    );
    for (const img of images) {
      const { data: firstStep } = await sb
        .from('bop_studio_steps').select('id')
        .eq('image_id', img.id).eq('step_no', 0).single();
      if (firstStep) {
        await sb.from('bop_studio_jobs').insert({ step_id: firstStep.id, run_after: new Date().toISOString() });
      }
    }
  }

  // Reset session to processing
  await sb.from('bop_studio_sessions')
    .update({ status: 'processing', cost_cents: 0, updated_at: new Date().toISOString() })
    .eq('id', id);

  return NextResponse.json({ ok: true });
}

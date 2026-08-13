// app/api/bop/mkt/studio/images/[id]/route.ts — patch image overrides/selected
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { callerUid } from '@/lib/api-guard';

export const dynamic = 'force-dynamic';
type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const uid = await callerUid();
  if (!uid) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const sb = getServerClient();

  // Verify ownership via session join
  const { data: img, error: checkErr } = await sb
    .from('bop_studio_images')
    .select('id, bop_studio_sessions!inner(created_by)')
    .eq('id', id)
    .single();

  if (checkErr || !img) return NextResponse.json({ error: 'Image not found' }, { status: 404 });
  const session = (img as unknown as { bop_studio_sessions: { created_by: string } }).bop_studio_sessions;
  if (session.created_by !== uid) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const patch: Record<string, unknown> = {};
  if ('selected' in body) patch.selected = Boolean(body.selected);
  if ('overrides' in body) patch.overrides = body.overrides;

  const { data, error } = await sb
    .from('bop_studio_images')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ image: data });
}

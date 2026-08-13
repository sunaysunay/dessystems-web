import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
const BUCKET = 'bop-listings';

// PATCH — update editable metadata (currently: category tag, label)
const PATCHABLE = ['category', 'label'];
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getServerClient();
  const body = await req.json();
  const upd: any = {};
  for (const k of PATCHABLE) if (k in body) upd[k] = body[k] === '' ? null : body[k];
  if (!Object.keys(upd).length) return NextResponse.json({ error: 'nothing to update' }, { status: 400 });
  const { data, error } = await supabase.from('bop_listing_media').update(upd).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ media: data });
}

// DELETE — removes the DB row and best-effort deletes the storage object (only if it's ours)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getServerClient();
  const { data: row } = await supabase.from('bop_listing_media').select('url').eq('id', id).maybeSingle();
  const { error } = await supabase.from('bop_listing_media').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (row?.url?.includes(`/storage/v1/object/public/${BUCKET}/`)) {
    const path = row.url.split(`/storage/v1/object/public/${BUCKET}/`)[1];
    if (path) await supabase.storage.from(BUCKET).remove([path]).catch(() => {});
  }
  return NextResponse.json({ ok: true });
}

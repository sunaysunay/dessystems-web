// PATCH /api/bop/mkt/studio/preset-backgrounds/[id] — set as default
// DELETE /api/bop/mkt/studio/preset-backgrounds/[id] — delete
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { callerUid } from '@/lib/api-guard';

export const dynamic = 'force-dynamic';

export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const uid = await callerUid();
  if (!uid) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const sb = getServerClient();
  const { data: bg } = await sb
    .from('bop_studio_preset_backgrounds')
    .select('id, preset_code')
    .eq('id', id)
    .single();

  if (!bg) return NextResponse.json({ error: 'not found' }, { status: 404 });

  // Clear existing default for this preset
  await sb
    .from('bop_studio_preset_backgrounds')
    .update({ is_default: false })
    .eq('preset_code', bg.preset_code);

  // Set this one as default
  await sb
    .from('bop_studio_preset_backgrounds')
    .update({ is_default: true })
    .eq('id', id);

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const uid = await callerUid();
  if (!uid) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const sb = getServerClient();
  const { data: bg } = await sb
    .from('bop_studio_preset_backgrounds')
    .select('id, storage_path, is_default, preset_code')
    .eq('id', id)
    .single();

  if (!bg) return NextResponse.json({ error: 'not found' }, { status: 404 });

  await sb.storage.from('studio').remove([bg.storage_path]);
  await sb.from('bop_studio_preset_backgrounds').delete().eq('id', id);

  // If deleted was default, promote the next one
  if (bg.is_default) {
    const { data: next } = await sb
      .from('bop_studio_preset_backgrounds')
      .select('id')
      .eq('preset_code', bg.preset_code)
      .order('created_at')
      .limit(1)
      .maybeSingle();
    if (next) {
      await sb.from('bop_studio_preset_backgrounds').update({ is_default: true }).eq('id', next.id);
    }
  }

  return NextResponse.json({ ok: true });
}

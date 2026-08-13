// GET  /api/bop/mkt/studio/preset-backgrounds — list all presets with their backgrounds
// POST /api/bop/mkt/studio/preset-backgrounds — upload background for a preset
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { callerUid } from '@/lib/api-guard';

export const dynamic = 'force-dynamic';

export async function GET() {
  const sb = getServerClient();
  const { data: presets } = await sb
    .from('bop_studio_presets')
    .select('code, label_i18n, sort')
    .eq('active', true)
    .order('sort');

  const { data: bgs } = await sb
    .from('bop_studio_preset_backgrounds')
    .select('id, preset_code, label, storage_path, is_default, created_at')
    .order('created_at');

  return NextResponse.json({ presets: presets ?? [], backgrounds: bgs ?? [] });
}

export async function POST(req: NextRequest) {
  const uid = await callerUid();
  if (!uid) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const sb = getServerClient();
  const form = await req.formData();
  const file = form.get('file') as File | null;
  const presetCode = form.get('preset_code') as string | null;
  const label = (form.get('label') as string | null) ?? 'Background';

  if (!file || !presetCode) {
    return NextResponse.json({ error: 'file and preset_code required' }, { status: 400 });
  }

  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: 'jpeg/png/webp only' }, { status: 400 });
  }

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const id = crypto.randomUUID();
  const path = `presets/${presetCode}/${id}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());

  const { error: upErr } = await sb.storage.from('studio').upload(path, buf, {
    contentType: file.type,
    upsert: false,
  });
  if (upErr) return NextResponse.json({ error: `Storage: ${upErr.message}` }, { status: 500 });

  // Check if this preset has any backgrounds yet — if not, make this the default
  const { count } = await sb
    .from('bop_studio_preset_backgrounds')
    .select('*', { count: 'exact', head: true })
    .eq('preset_code', presetCode);

  const isDefault = (count ?? 0) === 0;

  const { data, error: dbErr } = await sb
    .from('bop_studio_preset_backgrounds')
    .insert({ id, preset_code: presetCode, label, storage_path: path, is_default: isDefault, created_by: uid })
    .select()
    .single();

  if (dbErr) {
    await sb.storage.from('studio').remove([path]);
    return NextResponse.json({ error: dbErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, background: data });
}

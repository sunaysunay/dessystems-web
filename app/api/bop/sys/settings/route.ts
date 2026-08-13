import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

// Infer module from key prefix for bop_objects registration
function moduleFromKey(key: string): string {
  if (key.startsWith('ai_')) return 'AIM';
  if (key.startsWith('imap_')) return 'SYS';
  if (key.startsWith('gdrive_')) return 'SYS';
  return 'SYS';
}

export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const key = req.nextUrl.searchParams.get('key');
  if (!key) {
    const { data } = await supabase.from('bop_settings').select('*').order('key');
    return NextResponse.json({ settings: data ?? [] });
  }
  const { data } = await supabase.from('bop_settings').select('value').eq('key', key).single();
  return NextResponse.json({ value: data?.value ?? null });
}

export async function PUT(req: NextRequest) {
  const supabase = getServerClient();
  const { key, value } = await req.json();

  // Write the setting
  const { error } = await supabase
    .from('bop_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Auto-register in bop_objects (fire-and-forget, never block the response)
  supabase
    .from('bop_objects')
    .upsert({
      object_id: `setting:${key}`,
      type: 'setting',
      module: moduleFromKey(key),
      name: key,
      status: value === '' ? 'deprecated' : 'active',
      description: `bop_settings key: ${key}`,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'object_id' })
    .then(() => {});

  return NextResponse.json({ ok: true });
}

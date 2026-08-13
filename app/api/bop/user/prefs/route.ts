import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

// GET /api/bop/user/prefs?user_id=xxx&key=yyy  → { value }
// GET /api/bop/user/prefs?user_id=xxx           → { prefs: [{key,value}] }
export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const user_id = req.nextUrl.searchParams.get('user_id');
  const key     = req.nextUrl.searchParams.get('key');

  if (!user_id) return NextResponse.json({ error: 'user_id required' }, { status: 400 });

  if (key) {
    const { data } = await supabase.from('bop_user_prefs')
      .select('value').eq('user_id', user_id).eq('key', key).single();
    return NextResponse.json({ value: data?.value ?? null });
  }

  const { data } = await supabase.from('bop_user_prefs')
    .select('key, value').eq('user_id', user_id).order('key');
  return NextResponse.json({ prefs: data ?? [] });
}

// PUT /api/bop/user/prefs  body: { user_id, key, value }
export async function PUT(req: NextRequest) {
  const supabase = getServerClient();
  const { user_id, key, value } = await req.json();

  if (!user_id || !key) return NextResponse.json({ error: 'user_id and key required' }, { status: 400 });

  const { error } = await supabase.from('bop_user_prefs')
    .upsert({ user_id, key, value, updated_at: new Date().toISOString() }, { onConflict: 'user_id,key' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

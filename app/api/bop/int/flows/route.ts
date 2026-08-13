import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export async function GET(_req: NextRequest) {
  const supabase = getServerClient();
  const { data, error } = await supabase
    .from('int_flows')
    .select('*, int_systems(name, system_key)')
    .order('created_at');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ flows: data ?? [] });
}

export async function PATCH(req: NextRequest) {
  const supabase = getServerClient();
  const { id, ...patch } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const { error } = await supabase.from('int_flows').update(patch).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

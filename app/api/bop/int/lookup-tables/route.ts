import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const system_id = req.nextUrl.searchParams.get('system_id');
  let q = supabase
    .from('int_lookup_tables')
    .select('*, int_systems(name, system_key)')
    .order('table_key');
  if (system_id) q = (q as any).eq('system_id', system_id);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tables: data });
}

export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const b = await req.json();
  if (!b.system_id || !b.table_key)
    return NextResponse.json({ error: 'system_id and table_key required' }, { status: 400 });
  const { data, error } = await supabase.from('int_lookup_tables').insert({
    system_id: b.system_id,
    table_key: b.table_key,
    description: b.description ?? null,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

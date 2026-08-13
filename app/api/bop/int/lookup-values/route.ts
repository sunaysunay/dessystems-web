import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const table_id = req.nextUrl.searchParams.get('table_id');
  if (!table_id) return NextResponse.json({ error: 'table_id required' }, { status: 400 });
  const { data, error } = await supabase
    .from('int_lookup_values')
    .select('*')
    .eq('lookup_table_id', table_id)
    .order('source_code');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ values: data });
}

export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const b = await req.json();
  if (!b.lookup_table_id || !b.source_code || !b.target_code)
    return NextResponse.json({ error: 'lookup_table_id, source_code, target_code required' }, { status: 400 });
  const { data, error } = await supabase.from('int_lookup_values').insert({
    lookup_table_id: b.lookup_table_id,
    source_code: b.source_code,
    target_code: b.target_code,
    label: b.label ?? null,
    active: b.active ?? true,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const supabase = getServerClient();
  const { id, ...fields } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const allowed = ['source_code','target_code','label','active'];
  const patch = Object.fromEntries(Object.entries(fields).filter(([k]) => allowed.includes(k)));
  const { data, error } = await supabase.from('int_lookup_values').update(patch).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const supabase = getServerClient();
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const { error } = await supabase.from('int_lookup_values').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const flow_id = req.nextUrl.searchParams.get('flow_id');
  let q = supabase
    .from('int_mappings')
    .select('*, int_flows(flow_key, name, int_systems(name))')
    .order('sort_order');
  if (flow_id) q = (q as any).eq('flow_id', flow_id);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ mappings: data });
}

export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const b = await req.json();
  if (!b.flow_id || !b.source_field || !b.target_field)
    return NextResponse.json({ error: 'flow_id, source_field, target_field required' }, { status: 400 });
  const { data, error } = await supabase.from('int_mappings').insert({
    flow_id: b.flow_id,
    source_field: b.source_field,
    target_field: b.target_field,
    transform: b.transform ?? 'direct',
    transform_expr: b.transform_expr ?? null,
    default_val: b.default_val ?? null,
    required: b.required ?? false,
    sort_order: b.sort_order ?? 0,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const supabase = getServerClient();
  const { id, ...fields } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const allowed = ['source_field','target_field','transform','transform_expr','default_val','required','sort_order'];
  const patch = Object.fromEntries(Object.entries(fields).filter(([k]) => allowed.includes(k)));
  const { data, error } = await supabase.from('int_mappings').update(patch).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const supabase = getServerClient();
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const { error } = await supabase.from('int_mappings').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

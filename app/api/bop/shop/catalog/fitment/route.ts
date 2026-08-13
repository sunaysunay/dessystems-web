import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get('scope');
  const supabase = getServerClient();

  // --- list fitment targets ---
  if (scope === 'targets') {
    const search = searchParams.get('search');
    let q = supabase.from('shop_fitment_targets').select('*').order('make').order('model');
    if (search) q = q.or(`make.ilike.%${search}%,model.ilike.%${search}%,generation.ilike.%${search}%`);
    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  // --- list fitment for a variant ---
  const variantId = searchParams.get('variant_id');
  if (!variantId) return NextResponse.json({ error: 'variant_id required' }, { status: 400 });

  const { data, error } = await supabase
    .from('shop_fitment')
    .select('*, target:shop_fitment_targets(*)')
    .eq('variant_id', variantId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const supabase = getServerClient();

  // --- upsert fitment target ---
  if (body.action === 'upsert_target') {
    const { id, target_type, make, model, generation, body: bodyStyle, year_from, year_to, attributes } = body;
    const row = { target_type, make, model, generation, body: bodyStyle, year_from, year_to, attributes };
    const q = id
      ? supabase.from('shop_fitment_targets').update(row).eq('id', id)
      : supabase.from('shop_fitment_targets').insert(row);
    const { data, error } = await q.select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: id ? 200 : 201 });
  }

  // --- set fitment entry ---
  if (body.action === 'set_fitment') {
    const { id, variant_id, target_id, fit_type, adapter_variant_id, notes } = body;
    const row = { variant_id, target_id, fit_type, adapter_variant_id, notes };
    const q = id
      ? supabase.from('shop_fitment').update(row).eq('id', id)
      : supabase.from('shop_fitment').insert(row);
    const { data, error } = await q.select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: id ? 200 : 201 });
  }

  // --- delete fitment ---
  if (body.action === 'delete_fitment') {
    const { id } = body;
    const { error } = await supabase.from('shop_fitment').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // --- submit fitment request ---
  if (body.action === 'submit_request') {
    const { variant_id, target_description, customer_id } = body;
    const { data, error } = await supabase
      .from('shop_fitment_requests')
      .insert({ variant_id, target_description, customer_id })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 });
}

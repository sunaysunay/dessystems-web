import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const productId = new URL(req.url).searchParams.get('product_id');
  if (!productId) return NextResponse.json({ error: 'product_id is required' }, { status: 400 });

  const supabase = getServerClient();
  const { data, error } = await supabase
    .from('shop_variants')
    .select('*, option_values:shop_variant_options(option_value_id)')
    .eq('product_id', productId)
    .order('created_at');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ variants: data });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { product_id, sku, barcode, price_cents, compare_at_cents, cost_cents, weight_g, width_mm, height_mm, depth_mm, is_active } = body;

  if (!product_id || !sku) {
    return NextResponse.json({ error: 'product_id and sku are required' }, { status: 400 });
  }

  const supabase = getServerClient();
  const { data, error } = await supabase
    .from('shop_variants')
    .insert({
      product_id,
      sku,
      barcode: barcode ?? null,
      price_cents: price_cents ?? null,
      compare_at_cents: compare_at_cents ?? null,
      cost_cents: cost_cents ?? null,
      weight_g: weight_g ?? null,
      width_mm: width_mm ?? null,
      height_mm: height_mm ?? null,
      depth_mm: depth_mm ?? null,
      is_active: is_active ?? true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ variant: data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, ...fields } = body;

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const supabase = getServerClient();
  const { data, error } = await supabase
    .from('shop_variants')
    .update(fields)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ variant: data });
}

export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const supabase = getServerClient();
  const { error } = await supabase
    .from('shop_variants')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const variantId = searchParams.get('variant_id');
  if (!variantId) return NextResponse.json({ error: 'variant_id required' }, { status: 400 });

  const supabase = getServerClient();
  const { data: bundle, error: bErr } = await supabase
    .from('shop_bundles')
    .select('*')
    .eq('variant_id', variantId)
    .maybeSingle();
  if (bErr) return NextResponse.json({ error: bErr.message }, { status: 500 });
  if (!bundle) return NextResponse.json(null);

  const { data: components, error: cErr } = await supabase
    .from('shop_bundle_components')
    .select('*')
    .eq('bundle_id', bundle.id)
    .order('position');
  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });

  return NextResponse.json({ ...bundle, components: components ?? [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const supabase = getServerClient();

  // --- upsert bundle header ---
  if (body.action === 'upsert_bundle') {
    const { variant_id, bundle_type, pricing_mode, discount_pct } = body;
    const { data, error } = await supabase
      .from('shop_bundles')
      .upsert({ variant_id, bundle_type, pricing_mode, discount_pct }, { onConflict: 'variant_id' })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  // --- replace bundle components ---
  if (body.action === 'set_components') {
    const { bundle_id, components } = body;

    const { error: delErr } = await supabase
      .from('shop_bundle_components')
      .delete()
      .eq('bundle_id', bundle_id);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

    if (components?.length) {
      const rows = components.map((c: any) => ({
        bundle_id,
        component_variant_id: c.component_variant_id,
        qty: c.qty,
        is_substitutable: c.is_substitutable ?? false,
        is_optional: c.is_optional ?? false,
        price_contribution_cents: c.price_contribution_cents ?? 0,
        position: c.position ?? 0,
      }));
      const { error: insErr } = await supabase.from('shop_bundle_components').insert(rows);
      if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  }

  // --- upsert related product ---
  if (body.action === 'upsert_related') {
    const { from_variant_id, to_variant_id, relation_type, position } = body;
    const { data, error } = await supabase
      .from('shop_related_products')
      .upsert(
        { from_variant_id, to_variant_id, relation_type, position: position ?? 0 },
        { onConflict: 'from_variant_id,to_variant_id,relation_type' },
      )
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  // --- delete related product ---
  if (body.action === 'delete_related') {
    const { id } = body;
    const { error } = await supabase.from('shop_related_products').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 });
}

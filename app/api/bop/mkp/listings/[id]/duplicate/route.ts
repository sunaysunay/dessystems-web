import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

const SPEC_TABLE: Record<string, string> = {
  van: 'bop_listing_specs_van', bus: 'bop_listing_specs_van',
  truck: 'bop_listing_specs_truck', trailer: 'bop_listing_specs_trailer',
  machinery: 'bop_listing_specs_machinery', construction: 'bop_listing_specs_machinery',
  camper: 'bop_listing_specs_camper', caravan: 'bop_listing_specs_camper',
};

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = getServerClient();
  const src = id;

  // 1. Source listing core fields
  const { data: src_l, error: le } = await sb
    .from('bop_listings')
    .select('tenant_id,category,brand_id,model_id,year,sale_method,condition,country_origin,body_type_code')
    .eq('id', src).single();
  if (le || !src_l) return NextResponse.json({ error: le?.message ?? 'not found' }, { status: 404 });

  // 2. New draft row (no ref_no — auto-generated on first save; media intentionally excluded)
  const { data: newL, error: ne } = await sb.from('bop_listings').insert({
    tenant_id: src_l.tenant_id, category: src_l.category,
    brand_id: src_l.brand_id, model_id: src_l.model_id, year: src_l.year,
    sale_method: src_l.sale_method, condition: src_l.condition,
    country_origin: src_l.country_origin, body_type_code: src_l.body_type_code,
    is_verified: false, status: 'draft', workflow_status: 'draft',
  }).select('id').single();
  if (ne || !newL) return NextResponse.json({ error: ne?.message ?? 'insert failed' }, { status: 500 });
  const nid = newL.id;

  // 3. Pricing
  const { data: pr } = await sb.from('bop_listing_pricing').select('*').eq('listing_id', src).maybeSingle();
  if (pr) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _i, listing_id: _l, created_at: _c, updated_at: _u, ...prData } = pr;
    await sb.from('bop_listing_pricing').insert({ listing_id: nid, ...prData });
  } else {
    await sb.from('bop_listing_pricing').insert({ listing_id: nid });
  }

  // 4. Specs
  const specTable = SPEC_TABLE[src_l.category] ?? 'bop_listing_specs_van';
  const { data: sp } = await sb.from(specTable).select('*').eq('listing_id', src).maybeSingle();
  if (sp) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _i, listing_id: _l, ...spData } = sp as any;
    await sb.from(specTable).insert({ listing_id: nid, ...spData });
  } else {
    await sb.from(specTable).insert({ listing_id: nid });
  }

  // 5. Content (all locales)
  const { data: content } = await sb.from('bop_listing_content').select('*').eq('listing_id', src);
  if (content?.length) {
    const rows = content.map(({ id: _i, listing_id: _l, created_at: _c, updated_at: _u, ...r }: any) => ({ listing_id: nid, ...r }));
    await sb.from('bop_listing_content').insert(rows);
  }

  // 6. Features
  const { data: feats } = await sb.from('bop_listing_features').select('feature_id').eq('listing_id', src);
  if (feats?.length) await sb.from('bop_listing_features').insert(feats.map(f => ({ listing_id: nid, feature_id: f.feature_id })));

  // 7. Attrs
  const { data: attrs } = await sb.from('bop_listing_attrs').select('attr_key,attr_value').eq('listing_id', src);
  if (attrs?.length) await sb.from('bop_listing_attrs').insert(attrs.map(a => ({ listing_id: nid, attr_key: a.attr_key, attr_value: a.attr_value })));

  // 8. Docs
  const { data: docs } = await sb.from('bop_listing_docs').select('*').eq('listing_id', src);
  if (docs?.length) {
    const rows = docs.map(({ id: _i, listing_id: _l, created_at: _c, ...r }: any) => ({ listing_id: nid, ...r }));
    await sb.from('bop_listing_docs').insert(rows);
  }

  // 9. Channels — reset to pending (not synced yet on the new listing)
  const { data: chs } = await sb.from('bop_listing_channels').select('channel,boost_days').eq('listing_id', src);
  if (chs?.length) await sb.from('bop_listing_channels').insert(chs.map(c => ({ listing_id: nid, channel: c.channel, status: 'pending', boost_days: c.boost_days ?? 0 })));

  return NextResponse.json({ id: nid });
}

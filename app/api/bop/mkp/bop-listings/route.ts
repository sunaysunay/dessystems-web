import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

function one(v: any) { return Array.isArray(v) ? v[0] ?? null : v ?? null; }

const SPEC_TABLE: Record<string, string> = {
  van: 'bop_listing_specs_van',
  truck: 'bop_listing_specs_truck',
  trailer: 'bop_listing_specs_trailer',
  machinery: 'bop_listing_specs_machinery',
  construction: 'bop_listing_specs_machinery',
  camper: 'bop_listing_specs_camper',
  caravan: 'bop_listing_specs_camper',
  bus: 'bop_listing_specs_van',
};

export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const { searchParams } = new URL(req.url);
  const tenant   = searchParams.get('tenant');
  const category = searchParams.get('category');
  const status   = searchParams.get('status');
  const sale     = searchParams.get('sale_method');
  const brand    = searchParams.get('brand_id');
  const verified = searchParams.get('verified');

  let q = supabase
    .from('bop_listings')
    .select(`
      id, tenant_id, ref_no, sale_method, status, workflow_status, category,
      brand_id, model_id, year, condition, country_origin, des_score, is_verified,
      published_at, created_at, updated_at,
      bop_brands ( name ),
      bop_models ( name ),
      bop_listing_pricing ( asking_price, currency ),
      bop_listing_content ( locale, title ),
      bop_listing_channels ( channel, status )
    `)
    .order('updated_at', { ascending: false })
    .limit(300);

  if (tenant)   q = q.eq('tenant_id', Number(tenant));
  if (category) q = q.eq('category', category);
  if (status)   q = q.eq('status', status);
  if (sale)     q = q.eq('sale_method', sale);
  if (brand)    q = q.eq('brand_id', Number(brand));
  if (verified === 'true') q = q.eq('is_verified', true);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data ?? [];
  const ids = rows.map((d: any) => d.id);
  const covers: Record<string, string> = {};
  if (ids.length) {
    const { data: m } = await supabase
      .from('bop_listing_media')
      .select('listing_id, url')
      .eq('is_cover', true)
      .in('listing_id', ids);
    for (const row of m ?? []) covers[row.listing_id] = row.url;
  }

  const listings = rows.map((d: any) => {
    const pricing = one(d.bop_listing_pricing);
    const content = d.bop_listing_content ?? [];
    const title = (content.find((c: any) => c.locale === 'nl') ?? content[0])?.title ?? null;
    const chans = d.bop_listing_channels ?? [];
    return {
      id: d.id,
      tenant_id: d.tenant_id,
      ref_no: d.ref_no,
      sale_method: d.sale_method,
      status: d.status,
      workflow_status: d.workflow_status,
      category: d.category,
      brand_id: d.brand_id,
      model_id: d.model_id,
      year: d.year,
      condition: d.condition,
      country_origin: d.country_origin,
      des_score: d.des_score,
      is_verified: d.is_verified,
      updated_at: d.updated_at,
      created_at: d.created_at,
      brand_name: one(d.bop_brands)?.name ?? null,
      model_name: one(d.bop_models)?.name ?? null,
      asking_price: pricing?.asking_price ?? null,
      currency: pricing?.currency ?? 'EUR',
      title,
      channels_synced: chans.filter((c: any) => c.status === 'synced').length,
      channels_total: chans.length,
      cover_url: covers[d.id] ?? null,
    };
  });

  return NextResponse.json({ listings });
}

export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const b = await req.json();

  if (!b.tenant_id || !b.category) {
    return NextResponse.json({ error: 'tenant_id and category are required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('bop_listings')
    .insert({
      tenant_id: b.tenant_id,
      category: b.category,
      brand_id: b.brand_id ?? null,
      model_id: b.model_id ?? null,
      year: b.year ?? null,
      sale_method: b.sale_method ?? 'fixed',
      condition: b.condition ?? 'used',
      country_origin: b.country_origin ?? null,
      status: 'draft',
      workflow_status: 'draft',
      created_by: b.created_by ?? null,
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const id = data.id;

  // seed 1:1 pricing + category spec row so the editor has rows to update
  await supabase.from('bop_listing_pricing').insert({ listing_id: id });
  const specTable = SPEC_TABLE[b.category] ?? 'bop_listing_specs_van';
  await supabase.from(specTable).insert({ listing_id: id });

  return NextResponse.json({ id });
}

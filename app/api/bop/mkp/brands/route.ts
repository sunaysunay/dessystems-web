import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

// GET /api/bop/mkp/brands?tenant_id=300 — list brands for a tenant, with model + listing counts.
// Tenant-scoped: each platform (DES Campers 200 / DESMobil 300 / …) owns its own brand list.
export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const tenant = req.nextUrl.searchParams.get('tenant_id');
  if (!tenant) return NextResponse.json({ error: 'tenant_id is required' }, { status: 400 });

  const { data: brands, error } = await supabase
    .from('bop_brands').select('id, name, logo_url, country_origin, categories, sort, created_at')
    .eq('tenant_id', Number(tenant)).order('sort', { ascending: true }).order('name', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = (brands ?? []).map(b => b.id);
  const [{ data: models }, { data: listings }] = await Promise.all([
    ids.length ? supabase.from('bop_models').select('id, brand_id').in('brand_id', ids) : Promise.resolve({ data: [] as any[] }),
    ids.length ? supabase.from('bop_listings').select('id, brand_id').in('brand_id', ids) : Promise.resolve({ data: [] as any[] }),
  ]);
  const modelCount = new Map<number, number>();
  for (const m of models ?? []) modelCount.set(m.brand_id, (modelCount.get(m.brand_id) ?? 0) + 1);
  const listingCount = new Map<number, number>();
  for (const l of listings ?? []) listingCount.set(l.brand_id, (listingCount.get(l.brand_id) ?? 0) + 1);

  return NextResponse.json({
    brands: (brands ?? []).map(b => ({ ...b, model_count: modelCount.get(b.id) ?? 0, listing_count: listingCount.get(b.id) ?? 0 })),
  });
}

// POST { tenant_id, name, country_origin?, categories? } — create a brand
export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const b = await req.json();
  if (!b.tenant_id || !b.name) return NextResponse.json({ error: 'tenant_id and name are required' }, { status: 400 });

  const { data, error } = await supabase.from('bop_brands').insert({
    tenant_id: Number(b.tenant_id), name: String(b.name).trim(),
    country_origin: b.country_origin || null, categories: b.categories ?? [],
  }).select('id').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}

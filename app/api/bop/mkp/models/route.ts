import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

// GET /api/bop/mkp/models?tenant_id=300&brand_id=&search=
// Flat, cross-brand model list — scoped to tenant via the parent brand (bop_models has no tenant_id of its own).
export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const p = req.nextUrl.searchParams;
  const tenant = p.get('tenant_id');
  const brandId = p.get('brand_id');
  const search = p.get('search');
  if (!tenant) return NextResponse.json({ error: 'tenant_id is required' }, { status: 400 });

  let q = supabase.from('bop_models')
    .select('id, name, generation, year_from, year_to, brand_id, bop_brands!inner(id, name, tenant_id)')
    .eq('bop_brands.tenant_id', Number(tenant))
    .order('sort', { ascending: true }).order('name', { ascending: true });
  if (brandId) q = q.eq('brand_id', Number(brandId));
  if (search) q = q.ilike('name', `%${search}%`);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = (data ?? []).map(m => m.id);
  const { data: listings } = ids.length
    ? await supabase.from('bop_listings').select('id, model_id').in('model_id', ids)
    : { data: [] as any[] };
  const listingCount = new Map<number, number>();
  for (const l of listings ?? []) listingCount.set(l.model_id, (listingCount.get(l.model_id) ?? 0) + 1);

  return NextResponse.json({
    models: (data ?? []).map((m: any) => ({
      id: m.id, name: m.name, generation: m.generation, year_from: m.year_from, year_to: m.year_to,
      brand_id: m.brand_id, brand_name: m.bop_brands?.name ?? null,
      listing_count: listingCount.get(m.id) ?? 0,
    })),
  });
}

// POST { tenant_id, brand_id, name, generation?, year_from?, year_to? } — validates the brand belongs to the tenant
export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const b = await req.json();
  if (!b.tenant_id || !b.brand_id || !b.name) return NextResponse.json({ error: 'tenant_id, brand_id and name are required' }, { status: 400 });

  const { data: brand } = await supabase.from('bop_brands').select('id').eq('id', b.brand_id).eq('tenant_id', b.tenant_id).maybeSingle();
  if (!brand) return NextResponse.json({ error: 'brand not found for this tenant' }, { status: 400 });

  const { data, error } = await supabase.from('bop_models').insert({
    brand_id: Number(b.brand_id), name: String(b.name).trim(),
    generation: b.generation || null, year_from: b.year_from || null, year_to: b.year_to || null,
  }).select('id').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}

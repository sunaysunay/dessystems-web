import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

// Master data for the listing manager + editor: brands (tenant-scoped, own list
// per platform — never shared with descamper), models (per brand), feature catalog.
export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category');
  const tenantId = searchParams.get('tenant_id');
  const brandId = searchParams.get('brand_id');

  // Popularity ordering (sort = EU market-presence rank), name as tiebreaker
  let bq = supabase.from('bop_brands').select('id, name, categories, tenant_id, sort')
    .order('sort', { ascending: true }).order('name', { ascending: true });
  if (tenantId) bq = bq.eq('tenant_id', Number(tenantId));
  const { data: brands } = await bq;

  let models: any[] = [];
  if (brandId) {
    const { data } = await supabase.from('bop_models').select('id, name, generation, brand_id, sort')
      .eq('brand_id', Number(brandId)).order('sort', { ascending: true }).order('name', { ascending: true });
    models = data ?? [];
  }

  // Main categories (1000-step numeric codes; slug = bop_listings.category enum value)
  const { data: catsRaw } = await supabase.from('bop_listing_categories')
    .select('code, slug, sort, bop_listing_category_labels ( locale, label )')
    .eq('active', true).order('sort', { ascending: true });
  const categories = (catsRaw ?? []).map((c: any) => {
    const lab = (loc: string) => c.bop_listing_category_labels?.find((l: any) => l.locale === loc)?.label;
    return { code: c.code, slug: c.slug, label_en: lab('en') ?? c.slug, label_nl: lab('nl') ?? lab('en') ?? c.slug };
  });

  // Body types (opbouw) — numeric-coded taxonomy, scoped to the listing's category.
  // Labels live in a separate i18n table (bop_body_type_labels); flatten en/nl here
  // so the console UI keeps its simple label_en/label_nl shape.
  let btq = supabase.from('bop_body_types').select('code, category, slug, sort, bop_body_type_labels ( locale, label )')
    .eq('active', true).order('sort', { ascending: true });
  if (category) btq = btq.eq('category', category);
  const { data: bodyTypesRaw } = await btq;
  const bodyTypes = (bodyTypesRaw ?? []).map((bt: any) => {
    const lab = (loc: string) => bt.bop_body_type_labels?.find((l: any) => l.locale === loc)?.label;
    return { code: bt.code, category: bt.category, slug: bt.slug, label_en: lab('en') ?? bt.slug, label_nl: lab('nl') ?? lab('en') ?? bt.slug };
  });

  let fq = supabase
    .from('bop_feature_catalog')
    .select('id, category, key, label_nl, label_de, grp, sort')
    .eq('active', true)
    .order('sort', { ascending: true });
  if (category) fq = fq.eq('category', category);
  const { data: features } = await fq;

  return NextResponse.json({ brands: brands ?? [], models, features: features ?? [], body_types: bodyTypes, categories });
}

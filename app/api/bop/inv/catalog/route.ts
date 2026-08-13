import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export async function GET() {
  const sb = getServerClient();

  const [listingsRes, brandsRes, categoriesRes] = await Promise.all([
    sb.from('bop_listings').select('status, category, brand_id, year, sale_method, des_score'),
    sb.from('bop_brands').select('id, name, slug'),
    sb.from('bop_listing_categories').select('code, label_en, parent_code').limit(200),
  ]);

  const listings   = listingsRes.data   ?? [];
  const brands     = brandsRes.data     ?? [];
  const categories = categoriesRes.data ?? [];

  // Brand enrichment map
  const brandMap: Record<number, string> = {};
  for (const b of brands) brandMap[b.id] = b.name;

  // By category
  const byCategory: Record<string, number> = {};
  for (const r of listings) {
    const k = r.category ?? 'unknown';
    byCategory[k] = (byCategory[k] ?? 0) + 1;
  }

  // By brand (top 10)
  const byBrand: Record<string, number> = {};
  for (const r of listings) {
    if (!r.brand_id) continue;
    const name = brandMap[r.brand_id] ?? `brand_${r.brand_id}`;
    byBrand[name] = (byBrand[name] ?? 0) + 1;
  }
  const topBrands = Object.entries(byBrand)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  // By year
  const byYear: Record<string, number> = {};
  for (const r of listings) {
    if (!r.year) continue;
    byYear[String(r.year)] = (byYear[String(r.year)] ?? 0) + 1;
  }
  const yearTrend = Object.entries(byYear)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .slice(-10)
    .map(([year, count]) => ({ year, count }));

  // Status health
  const active  = listings.filter(r => r.status === 'active').length;
  const draft   = listings.filter(r => r.status === 'draft').length;
  const archive = listings.filter(r => r.status === 'archived').length;

  // Score avg
  const scored   = listings.filter(r => r.des_score !== null);
  const avgScore = scored.length ? Math.round(scored.reduce((s, r) => s + (r.des_score as number), 0) / scored.length) : null;

  return NextResponse.json({
    total: listings.length, active, draft, archive, avgScore,
    byCategory, topBrands, yearTrend,
    categoryCount: categories.length,
    brandCount:    brands.length,
  });
}

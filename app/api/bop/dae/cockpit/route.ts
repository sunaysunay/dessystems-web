import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const sb = getServerClient();
  const sp = req.nextUrl.searchParams;

  const status      = sp.get('status')   || 'active';
  const make        = sp.get('make')     || '';
  const platform    = sp.get('platform') || '';
  const minScore    = sp.get('min_score') ? Number(sp.get('min_score')) : null;
  const review      = sp.get('review')   || '';
  const priceMax    = sp.get('price_max') ? Number(sp.get('price_max')) : null;
  const yearMin     = sp.get('year_min')  ? Number(sp.get('year_min'))  : null;
  const kmMax       = sp.get('km_max')    ? Number(sp.get('km_max'))    : null;
  const flags       = sp.get('flags')    || '';   // comma-separated: underpriced,low_km,price_dropped,...
  const limit       = Math.min(Number(sp.get('limit') || 100), 250);
  const offset      = Number(sp.get('offset') || 0);

  // Build listings query with joined score + review
  let q = sb
    .from('dae_listings')
    .select(`
      id, source_id, external_id, source_url, status,
      make, model, variant, title,
      year, mileage_km, fuel_type, transmission, body_type, color,
      price_gross, original_price, currency,
      seller_type, seller_name, country, region,
      features, image_urls, posted_at, first_seen_at, last_seen_at,
      dae_sources!inner ( source_key, platform_code, platform_name, country ),
      dae_opportunity_scores ( score, price_score, km_score, discount_score,
        underpriced, low_km, price_dropped, private_seller, margeregeling, fresh, stale,
        cohort_median_price, cohort_size, computed_at ),
      dae_reviews ( review_status, reviewer, notes, target_price, contact_made )
    `)
    .eq('status', status)
    .order('dae_opportunity_scores(score)', { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (make)     q = q.ilike('make', `%${make}%`);
  if (priceMax) q = q.lte('price_gross', priceMax);
  if (yearMin)  q = q.gte('year', yearMin);
  if (kmMax)    q = q.lte('mileage_km', kmMax);
  if (platform) q = q.eq('dae_sources.platform_code', platform);

  const { data: listings, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Apply in-memory filters that need joined columns
  let rows = listings ?? [];

  if (minScore !== null) {
    rows = rows.filter((l: any) => (l.dae_opportunity_scores?.score ?? 0) >= minScore);
  }
  if (review) {
    rows = rows.filter((l: any) => (l.dae_reviews?.review_status ?? 'new') === review);
  }
  if (flags) {
    const flagList = flags.split(',').map(f => f.trim()).filter(Boolean);
    rows = rows.filter((l: any) => {
      const s = l.dae_opportunity_scores;
      if (!s) return false;
      return flagList.every((f: string) => s[f] === true);
    });
  }

  // Stats for filter chips
  const total = rows.length;
  const avgScore = total ? Math.round(rows.reduce((s: number, l: any) => s + (l.dae_opportunity_scores?.score ?? 0), 0) / total) : 0;

  return NextResponse.json({ listings: rows, total, avgScore });
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

// GET /api/bop/dae/pricing
// Returns aggregate price intelligence from dae_price_history + dae_listings
export async function GET(_req: NextRequest) {
  const supabase = getServerClient();

  // Total listing count
  const { count: totalListings } = await supabase
    .from('dae_listings')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active');

  // Total price history events
  const { count: priceEvents } = await supabase
    .from('dae_price_history')
    .select('*', { count: 'exact', head: true });

  // Price drops: listings where latest price < first price
  const { data: priceDropData } = await supabase
    .from('dae_price_history')
    .select('listing_id, price_gross, observed_at')
    .order('listing_id')
    .order('observed_at', { ascending: true });

  let priceDropCount = 0;
  let avgDropPct = 0;
  const dropPcts: number[] = [];

  if (priceDropData && priceDropData.length > 0) {
    const byListing: Record<string, number[]> = {};
    for (const r of priceDropData) {
      if (!byListing[r.listing_id]) byListing[r.listing_id] = [];
      byListing[r.listing_id].push(Number(r.price_gross));
    }
    for (const prices of Object.values(byListing)) {
      if (prices.length >= 2) {
        const first = prices[0], last = prices[prices.length - 1];
        if (last < first) {
          priceDropCount++;
          dropPcts.push(((first - last) / first) * 100);
        }
      }
    }
    avgDropPct = dropPcts.length > 0
      ? Math.round(dropPcts.reduce((s, v) => s + v, 0) / dropPcts.length * 10) / 10
      : 0;
  }

  // Cohort medians: group dae_listings by make, compute median price
  const { data: listings } = await supabase
    .from('dae_listings')
    .select('make, year, price_gross')
    .eq('status', 'active')
    .not('price_gross', 'is', null)
    .not('make', 'is', null);

  const cohortMap: Record<string, number[]> = {};
  if (listings) {
    for (const r of listings) {
      const key = r.make!;
      if (!cohortMap[key]) cohortMap[key] = [];
      cohortMap[key].push(Number(r.price_gross));
    }
  }

  const cohorts = Object.entries(cohortMap)
    .map(([make, prices]) => {
      const sorted = [...prices].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      const p25 = sorted[Math.floor(sorted.length * 0.25)];
      const p75 = sorted[Math.floor(sorted.length * 0.75)];
      return { make, count: sorted.length, median, p25, p75, min: sorted[0], max: sorted[sorted.length - 1] };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  // Weekly price event trend (last 12 weeks)
  const now = new Date();
  const weeklyTrend: { week: string; count: number; avgPrice: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const start = new Date(now);
    start.setDate(start.getDate() - i * 7 - 6);
    const end = new Date(now);
    end.setDate(end.getDate() - i * 7);
    const label = start.toISOString().slice(0, 10);
    const events = (priceDropData ?? []).filter(r => {
      const d = new Date(r.observed_at);
      return d >= start && d <= end;
    });
    const avg = events.length > 0
      ? Math.round(events.reduce((s, r) => s + Number(r.price_gross), 0) / events.length)
      : 0;
    weeklyTrend.push({ week: label, count: events.length, avgPrice: avg });
  }

  // Source distribution
  const { data: sourceDist } = await supabase
    .from('dae_listings')
    .select('source_id, dae_sources(source_key)')
    .eq('status', 'active');

  const sourceCount: Record<string, number> = {};
  for (const r of sourceDist ?? []) {
    const key = (r.dae_sources as any)?.source_key ?? r.source_id;
    sourceCount[key] = (sourceCount[key] ?? 0) + 1;
  }

  return NextResponse.json({
    totalListings: totalListings ?? 0,
    priceEvents: priceEvents ?? 0,
    priceDropCount,
    avgDropPct,
    cohorts,
    weeklyTrend,
    bySource: sourceCount,
  });
}

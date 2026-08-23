import { analyticsRoute, factRows, sumBy, pctChange } from '@/lib/ci/analytics-api';

export const dynamic = 'force-dynamic';

// CI-T15 — Discovery: search volume + zero-result demand (Plane B).
// Per-query zero-result detail and fitment coverage arrive with the R2/R4
// screens; this serves the daily-fact base.

export const GET = analyticsRoute('analytics.discovery', async (range) => {
  const [cur, prev] = await Promise.all([
    factRows('ci_daily_search', range),
    factRows('ci_daily_search', { from: range.prevFrom, to: range.prevTo }),
  ]);

  const searches = sumBy(cur, 'searches');
  const zeroResults = sumBy(cur, 'zero_result_searches');

  return {
    totals: {
      searches,
      prev_searches: sumBy(prev, 'searches'),
      change_pct: pctChange(searches, sumBy(prev, 'searches')),
      unique_searchers: sumBy(cur, 'unique_searchers'),
      zero_result_searches: zeroResults,
      zero_result_rate_pct: searches > 0 ? Math.round((zeroResults / searches) * 1000) / 10 : null,
    },
    daily: (cur as any[]).map(r => ({
      date: r.fact_date,
      searches: r.searches,
      zero_result_searches: r.zero_result_searches,
      partial: r.partial,
    })),
  };
});

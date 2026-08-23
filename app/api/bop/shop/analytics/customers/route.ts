import { analyticsRoute, factRows, sumBy, pctChange } from '@/lib/ci/analytics-api';

export const dynamic = 'force-dynamic';

// CI-T15/CI-T22 — Customers: new vs repeat (Plane A).
// RFM/cohort/LTV depth arrives with the CI-T22 screen; this route serves the
// daily-fact base it will read.

export const GET = analyticsRoute('analytics.customer', async (range) => {
  const [cur, prev] = await Promise.all([
    factRows('ci_daily_customer', range),
    factRows('ci_daily_customer', { from: range.prevFrom, to: range.prevTo }),
  ]);

  const newC = sumBy(cur, 'new_customers');
  const repeatC = sumBy(cur, 'repeat_customers');
  const total = sumBy(cur, 'total_customers');

  return {
    totals: {
      new_customers: newC,
      repeat_customers: repeatC,
      total_customers: total,
      prev_total_customers: sumBy(prev, 'total_customers'),
      change_pct: pctChange(total, sumBy(prev, 'total_customers')),
      repeat_rate_pct: total > 0 ? Math.round((repeatC / total) * 1000) / 10 : null,
    },
    daily: (cur as any[]).map(r => ({
      date: r.fact_date,
      new_customers: r.new_customers,
      repeat_customers: r.repeat_customers,
      partial: r.partial,
    })),
  };
});

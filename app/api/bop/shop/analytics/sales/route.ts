import { analyticsRoute, factRows, sumBy, pctChange } from '@/lib/ci/analytics-api';

export const dynamic = 'force-dynamic';

// CI-T15/CI-T18 — Sales: trend + margin waterfall.
// Waterfall follows the canonical contribution formula (spec §4.3):
// net_revenue − COGS + shipping_delta − payment_fee − pick_pack = contribution.

export const GET = analyticsRoute('analytics.sales', async (range) => {
  const [cur, prev] = await Promise.all([
    factRows('ci_daily_sales', range),
    factRows('ci_daily_sales', { from: range.prevFrom, to: range.prevTo }),
  ]);

  const netSales = sumBy(cur, 'net_sales_cents');
  const cogs = sumBy(cur, 'cogs_cents');
  const paymentFees = sumBy(cur, 'payment_fee_cents');
  const contribution = sumBy(cur, 'contribution_cents');
  // Residual bucket so the waterfall sums exactly to contribution even when
  // shipping_delta/pick_pack are not separately aggregated at day level.
  const otherCosts = netSales - cogs - paymentFees - contribution;

  return {
    totals: {
      net_sales_cents: netSales,
      prev_net_sales_cents: sumBy(prev, 'net_sales_cents'),
      change_pct: pctChange(netSales, sumBy(prev, 'net_sales_cents')),
      gross_sales_cents: sumBy(cur, 'gross_sales_cents'),
      tax_cents: sumBy(cur, 'tax_cents'),
      shipping_cents: sumBy(cur, 'shipping_cents'),
      discount_cents: sumBy(cur, 'discount_cents'),
      refund_cents: sumBy(cur, 'refund_cents'),
      orders: sumBy(cur, 'orders'),
      items_sold: sumBy(cur, 'items_sold'),
    },
    waterfall: [
      { step: 'net_revenue', cents: netSales },
      { step: 'cogs', cents: -cogs },
      { step: 'payment_fees', cents: -paymentFees },
      { step: 'other_costs', cents: -otherCosts },
      { step: 'contribution', cents: contribution },
    ],
    contribution_margin_pct: netSales > 0 ? Math.round((contribution / netSales) * 1000) / 10 : null,
    daily: cur.map(r => ({
      date: r.fact_date,
      net_sales_cents: r.net_sales_cents,
      contribution_cents: r.contribution_cents,
      orders: r.orders,
      refund_cents: r.refund_cents,
      partial: r.partial,
    })),
  };
});

import { analyticsRoute, factRows } from '@/lib/ci/analytics-api';

export const dynamic = 'force-dynamic';

// CI-T15 — Inventory: latest snapshot + stock-health series.
// Reorder proposals and dead/overstock classification land in R3 scoring.

interface InvRow {
  fact_date: string;
  total_variants: number;
  in_stock: number;
  out_of_stock: number;
  low_stock: number;
  total_on_hand: number;
  total_reserved: number;
  partial: boolean;
}

export const GET = analyticsRoute('analytics.inventory', async (range) => {
  const rows = await factRows<InvRow>('ci_daily_inventory', range);
  const latest = rows.length ? rows[rows.length - 1] : null;

  return {
    snapshot: latest ? {
      date: latest.fact_date,
      total_variants: latest.total_variants,
      in_stock: latest.in_stock,
      out_of_stock: latest.out_of_stock,
      low_stock: latest.low_stock,
      total_on_hand: latest.total_on_hand,
      total_reserved: latest.total_reserved,
      in_stock_rate_pct: latest.total_variants > 0
        ? Math.round((latest.in_stock / latest.total_variants) * 1000) / 10 : null,
    } : null,
    daily: rows.map(r => ({
      date: r.fact_date,
      in_stock: r.in_stock,
      out_of_stock: r.out_of_stock,
      low_stock: r.low_stock,
      partial: r.partial,
    })),
  };
});

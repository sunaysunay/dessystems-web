import { analyticsRoute, factRows, TENANT_ID } from '@/lib/ci/analytics-api';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

// CI-T15/CI-T20 — Products: per-variant raw metrics over the range.
// Raw metrics only in R2 — scores land in R3 (ci_score_result).

interface ProductRow {
  fact_date: string;
  variant_id: string;
  product_id: string | null;
  units_sold: number;
  net_sales_cents: number;
  cogs_cents: number;
  contribution_cents: number;
  returns_qty: number;
  return_value_cents: number;
  page_views: number;
  cart_adds: number;
  orders: number;
}

export const GET = analyticsRoute('analytics.product', async (range, request) => {
  const rows = await factRows<ProductRow>('ci_daily_product', range);

  const byVariant = new Map<string, ProductRow & { days: number }>();
  for (const r of rows) {
    const acc = byVariant.get(r.variant_id);
    if (!acc) {
      byVariant.set(r.variant_id, { ...r, days: 1 });
    } else {
      acc.units_sold += r.units_sold;
      acc.net_sales_cents += r.net_sales_cents;
      acc.cogs_cents += r.cogs_cents;
      acc.contribution_cents += r.contribution_cents;
      acc.returns_qty += r.returns_qty;
      acc.return_value_cents += r.return_value_cents;
      acc.page_views += r.page_views;
      acc.cart_adds += r.cart_adds;
      acc.orders += r.orders;
      acc.days++;
    }
  }

  const products = [...byVariant.values()].map(v => ({
    variant_id: v.variant_id,
    product_id: v.product_id,
    units_sold: v.units_sold,
    net_sales_cents: v.net_sales_cents,
    cogs_cents: v.cogs_cents,
    contribution_cents: v.contribution_cents,
    contribution_margin_pct: v.net_sales_cents > 0
      ? Math.round((v.contribution_cents / v.net_sales_cents) * 1000) / 10 : null,
    returns_qty: v.returns_qty,
    return_rate_pct: v.units_sold > 0
      ? Math.round((v.returns_qty / v.units_sold) * 1000) / 10 : null,
    page_views: v.page_views,
    cart_adds: v.cart_adds,
    orders: v.orders,
    cvr_view_to_order_pct: v.page_views > 0
      ? Math.round((v.orders / v.page_views) * 10000) / 100 : null,
  }));

  // Enrich with SKU/title for the grid (batch lookup, capped).
  const ids = products.map(p => p.variant_id).slice(0, 5000);
  const sb = getServerClient();
  const { data: variants } = ids.length
    ? await sb.from('shop_variants').select('id, sku, name').in('id', ids)
    : { data: [] as any[] };
  const meta = new Map((variants ?? []).map((v: any) => [v.id, v]));

  const sort = request.nextUrl.searchParams.get('sort') || 'net_sales_cents';
  const enriched = products
    .map(p => ({ ...p, sku: meta.get(p.variant_id)?.sku ?? null, name: meta.get(p.variant_id)?.name ?? null }))
    .sort((a: any, b: any) => (Number(b[sort]) || 0) - (Number(a[sort]) || 0));

  return { products: enriched, variant_count: enriched.length };
});

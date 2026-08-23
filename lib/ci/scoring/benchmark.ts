// CI-T27 — Benchmark engine (spec §6.1)
// Computes percentile distributions per scope/metric and stores in ci_benchmark.

import { percentile } from './percentile';

export interface BenchmarkRow {
  scope: string;
  metric: string;
  computed_date: string;
  n: number;
  p1: number;
  p5: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
  mean: number;
  stddev: number;
}

export function computeBenchmark(scope: string, metric: string, date: string, values: number[]): BenchmarkRow | null {
  if (values.length === 0) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const sum = sorted.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  const variance = sorted.reduce((s, v) => s + (v - mean) ** 2, 0) / n;

  return {
    scope,
    metric,
    computed_date: date,
    n,
    p1: percentile(sorted, 1),
    p5: percentile(sorted, 5),
    p10: percentile(sorted, 10),
    p25: percentile(sorted, 25),
    p50: percentile(sorted, 50),
    p75: percentile(sorted, 75),
    p90: percentile(sorted, 90),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
    mean,
    stddev: Math.sqrt(variance),
  };
}

export type ScopeLevel = 'site' | 'category' | 'category_price_band';

export interface BenchmarkMetricDef {
  metric: string;
  extractValue: (row: Record<string, unknown>) => number | null;
}

export const BENCHMARK_METRICS: BenchmarkMetricDef[] = [
  { metric: 'cvr_view_to_order', extractValue: r => {
    const views = Number(r.page_views ?? 0);
    const orders = Number(r.orders ?? 0);
    return views > 0 ? orders / views : null;
  }},
  { metric: 'revenue_per_session', extractValue: r => {
    const sessions = Number(r.sessions ?? 0);
    const rev = Number(r.net_revenue ?? 0);
    return sessions > 0 ? rev / sessions : null;
  }},
  { metric: 'avg_order_value', extractValue: r => {
    const orders = Number(r.orders ?? 0);
    const rev = Number(r.net_revenue ?? 0);
    return orders > 0 ? rev / orders : null;
  }},
  { metric: 'contribution_pct', extractValue: r => {
    const rev = Number(r.net_revenue ?? 0);
    const contribution = Number(r.contribution ?? 0);
    return rev > 0 ? contribution / rev : null;
  }},
  { metric: 'return_rate', extractValue: r => {
    const orders = Number(r.orders ?? 0);
    const returns = Number(r.returns ?? 0);
    return orders > 0 ? returns / orders : null;
  }},
  { metric: 'cart_rate', extractValue: r => {
    const views = Number(r.page_views ?? 0);
    const carts = Number(r.cart_adds ?? 0);
    return views > 0 ? carts / views : null;
  }},
  { metric: 'page_views', extractValue: r => {
    const v = Number(r.page_views ?? 0);
    return v > 0 ? v : null;
  }},
  { metric: 'inventory_turn', extractValue: r => {
    const v = Number(r.inventory_turn ?? 0);
    return v > 0 ? v : null;
  }},
];

export function buildBenchmarks(
  date: string,
  products: Record<string, unknown>[],
  scopeExtractor: (row: Record<string, unknown>) => { site: string; category?: string; category_price_band?: string },
): BenchmarkRow[] {
  const byScope = new Map<string, Map<string, number[]>>();

  function addValue(scope: string, metric: string, val: number) {
    let metrics = byScope.get(scope);
    if (!metrics) { metrics = new Map(); byScope.set(scope, metrics); }
    let arr = metrics.get(metric);
    if (!arr) { arr = []; metrics.set(metric, arr); }
    arr.push(val);
  }

  for (const prod of products) {
    const scopes = scopeExtractor(prod);
    for (const def of BENCHMARK_METRICS) {
      const val = def.extractValue(prod);
      if (val === null || !isFinite(val)) continue;
      addValue(`site:${scopes.site}`, def.metric, val);
      if (scopes.category) addValue(`category:${scopes.category}`, def.metric, val);
      if (scopes.category_price_band) addValue(`category_price_band:${scopes.category_price_band}`, def.metric, val);
    }
  }

  const results: BenchmarkRow[] = [];
  for (const [scope, metrics] of byScope) {
    for (const [metric, values] of metrics) {
      const row = computeBenchmark(scope, metric, date, values);
      if (row) results.push(row);
    }
  }
  return results;
}

const TENANT_ID = 400;

export async function refreshBenchmarks(
  supabase: { from: (t: string) => any },
  date: string,
) {
  const { data: products } = await supabase
    .from('ci_daily_product')
    .select('*')
    .eq('fact_date', date);

  if (!products?.length) return { inserted: 0 };

  const benchmarks = buildBenchmarks(date, products, (row) => ({
    site: String(TENANT_ID),
    category: row.category_id ? String(row.category_id) : undefined,
    category_price_band: row.category_id && row.price_band
      ? `${row.category_id}:${row.price_band}`
      : undefined,
  }));

  if (!benchmarks.length) return { inserted: 0 };

  const rows = benchmarks.map(b => ({ tenant_id: TENANT_ID, ...b }));

  const { error } = await supabase
    .from('ci_benchmark')
    .upsert(rows, { onConflict: 'tenant_id,scope,metric,computed_date', ignoreDuplicates: false });

  if (error) throw new Error(`refreshBenchmarks: ${error.message}`);
  return { inserted: rows.length };
}

// CI-T40 — AI Context Builder
// Assembles a safe context window from ONLY aggregate tables.
// The model must NEVER see raw ci_events.

import type { SupabaseClient } from '@supabase/supabase-js';

const TENANT_ID = 400;

/** Exhaustive list of tables the AI may read. No parameter overrides allowed. */
export const SAFE_TABLES = [
  'ci_daily_sales',
  'ci_daily_product',
  'ci_daily_traffic',
  'ci_attention_item',
  'ci_score_result',
  'ci_metric_def',
] as const;

type SafeTable = (typeof SAFE_TABLES)[number];

// ── Types ────────────────────────────────────────────────────────────

export interface AIContext {
  generated_at: string;
  tenant_id: number;
  daily_sales: DailySalesRow[];
  top_products: DailyProductRow[];
  daily_traffic: DailyTrafficRow[];
  attention_items: AttentionItemRow[];
  latest_scores: ScoreResultRow[];
  metric_definitions: MetricDefRow[];
}

interface DailySalesRow {
  fact_date: string;
  orders: number;
  net_sales_cents: number;
  gross_sales_cents: number;
  tax_cents: number;
  shipping_cents: number;
  discount_cents: number;
  refund_cents: number;
  cogs_cents: number;
  contribution_cents: number;
  payment_fee_cents: number;
  avg_order_value_cents: number;
  items_sold: number;
}

interface DailyProductRow {
  fact_date: string;
  variant_id: string;
  product_id: string | null;
  units_sold: number;
  net_sales_cents: number;
  cogs_cents: number;
  contribution_cents: number;
  page_views: number;
  cart_adds: number;
  orders: number;
}

interface DailyTrafficRow {
  fact_date: string;
  sessions: number;
  unique_visitors: number;
  page_views: number;
  bounces: number;
  engaged: number;
  avg_duration_s: number;
}

interface AttentionItemRow {
  group_key: string;
  rule_id: string;
  severity: string;
  title: string;
  detail: string | null;
  status: string;
  created_at: string;
}

interface ScoreResultRow {
  entity_type: string;
  entity_id: string;
  score_key: string;
  score: number | null;
  components: Record<string, unknown>;
  batch_id: string;
}

interface MetricDefRow {
  metric_id: string;
  domain: string;
  name_en: string;
  formula: string;
  unit: string;
  higher_is: string;
}

export interface BuildContextOpts {
  /** Number of days of sales history (default 30) */
  salesDays?: number;
  /** Number of days of product/traffic history (default 7) */
  recentDays?: number;
  /** Max top products by revenue (default 20) */
  topProductLimit?: number;
}

// ── Helpers ──────────────────────────────────────────────────────────

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// ── Main builder ─────────────────────────────────────────────────────

/**
 * Build a structured context object from aggregate tables only.
 * Table names are hardcoded — callers cannot override them.
 */
export async function buildContext(
  supabase: SupabaseClient,
  opts: BuildContextOpts = {},
): Promise<AIContext> {
  const {
    salesDays = 30,
    recentDays = 7,
    topProductLimit = 20,
  } = opts;

  const salesSince = daysAgo(salesDays);
  const recentSince = daysAgo(recentDays);

  const [
    salesRes,
    productRes,
    trafficRes,
    attentionRes,
    batchRes,
    metricRes,
  ] = await Promise.all([
    // Daily sales — last N days
    supabase
      .from('ci_daily_sales')
      .select('fact_date, orders, net_sales_cents, gross_sales_cents, tax_cents, shipping_cents, discount_cents, refund_cents, cogs_cents, contribution_cents, payment_fee_cents, avg_order_value_cents, items_sold')
      .eq('tenant_id', TENANT_ID)
      .gte('fact_date', salesSince)
      .order('fact_date', { ascending: false }),

    // Top products by revenue — last N days
    supabase
      .from('ci_daily_product')
      .select('fact_date, variant_id, product_id, units_sold, net_sales_cents, cogs_cents, contribution_cents, page_views, cart_adds, orders')
      .eq('tenant_id', TENANT_ID)
      .gte('fact_date', recentSince)
      .order('net_sales_cents', { ascending: false })
      .limit(topProductLimit),

    // Daily traffic — last N days
    supabase
      .from('ci_daily_traffic')
      .select('fact_date, sessions, unique_visitors, page_views, bounces, engaged, avg_duration_s')
      .eq('tenant_id', TENANT_ID)
      .gte('fact_date', recentSince)
      .order('fact_date', { ascending: false }),

    // Open attention items
    supabase
      .from('ci_attention_item')
      .select('group_key, rule_id, severity, title, detail, status, created_at')
      .eq('tenant_id', TENANT_ID)
      .eq('status', 'open')
      .order('created_at', { ascending: false }),

    // Latest score batch id
    supabase
      .from('ci_score_result')
      .select('batch_id')
      .eq('tenant_id', TENANT_ID)
      .order('created_at', { ascending: false })
      .limit(1),

    // Metric definitions (all active)
    supabase
      .from('ci_metric_def')
      .select('metric_id, domain, name_en, formula, unit, higher_is')
      .eq('deprecated', false)
      .order('domain')
      .order('metric_id'),
  ]);

  // Fetch full score results for the latest batch
  let scores: ScoreResultRow[] = [];
  const latestBatchId = batchRes.data?.[0]?.batch_id;
  if (latestBatchId) {
    const { data } = await supabase
      .from('ci_score_result')
      .select('entity_type, entity_id, score_key, score, components, batch_id')
      .eq('tenant_id', TENANT_ID)
      .eq('batch_id', latestBatchId);
    scores = (data ?? []) as ScoreResultRow[];
  }

  return {
    generated_at: new Date().toISOString(),
    tenant_id: TENANT_ID,
    daily_sales: (salesRes.data ?? []) as DailySalesRow[],
    top_products: (productRes.data ?? []) as DailyProductRow[],
    daily_traffic: (trafficRes.data ?? []) as DailyTrafficRow[],
    attention_items: (attentionRes.data ?? []) as AttentionItemRow[],
    latest_scores: scores,
    metric_definitions: (metricRes.data ?? []) as MetricDefRow[],
  };
}

// ── Prompt formatter ─────────────────────────────────────────────────

function centsToEur(cents: number): string {
  return (cents / 100).toFixed(2);
}

/**
 * Render the structured context as a readable string for the LLM prompt.
 */
export function formatContextForPrompt(ctx: AIContext): string {
  const lines: string[] = [];

  lines.push(`## DESShop Commerce Intelligence — Context`);
  lines.push(`Generated: ${ctx.generated_at}`);
  lines.push('');

  // ── Sales
  lines.push(`### Daily Sales (last ${ctx.daily_sales.length} days)`);
  if (ctx.daily_sales.length === 0) {
    lines.push('No sales data available.');
  } else {
    lines.push('Date | Orders | Net Sales | COGS | Contribution | AOV | Items');
    lines.push('--- | --- | --- | --- | --- | --- | ---');
    for (const r of ctx.daily_sales) {
      lines.push(
        `${r.fact_date} | ${r.orders} | €${centsToEur(r.net_sales_cents)} | €${centsToEur(r.cogs_cents)} | €${centsToEur(r.contribution_cents)} | €${centsToEur(r.avg_order_value_cents)} | ${r.items_sold}`,
      );
    }
  }
  lines.push('');

  // ── Top products
  lines.push(`### Top Products by Revenue (last 7 days, top ${ctx.top_products.length})`);
  if (ctx.top_products.length === 0) {
    lines.push('No product data available.');
  } else {
    lines.push('Variant | Units | Revenue | COGS | Contribution | Views | Cart Adds');
    lines.push('--- | --- | --- | --- | --- | --- | ---');
    for (const r of ctx.top_products) {
      lines.push(
        `${r.variant_id} | ${r.units_sold} | €${centsToEur(r.net_sales_cents)} | €${centsToEur(r.cogs_cents)} | €${centsToEur(r.contribution_cents)} | ${r.page_views} | ${r.cart_adds}`,
      );
    }
  }
  lines.push('');

  // ── Traffic
  lines.push(`### Daily Traffic (last ${ctx.daily_traffic.length} days)`);
  if (ctx.daily_traffic.length === 0) {
    lines.push('No traffic data available.');
  } else {
    lines.push('Date | Sessions | Visitors | Page Views | Bounces | Engaged | Avg Duration');
    lines.push('--- | --- | --- | --- | --- | --- | ---');
    for (const r of ctx.daily_traffic) {
      lines.push(
        `${r.fact_date} | ${r.sessions} | ${r.unique_visitors} | ${r.page_views} | ${r.bounces} | ${r.engaged} | ${r.avg_duration_s}s`,
      );
    }
  }
  lines.push('');

  // ── Attention items
  lines.push(`### Attention Items (${ctx.attention_items.length} open)`);
  if (ctx.attention_items.length === 0) {
    lines.push('No open attention items.');
  } else {
    for (const item of ctx.attention_items) {
      lines.push(`- **[${item.severity}]** ${item.title} (rule: ${item.rule_id}, since: ${item.created_at.slice(0, 10)})`);
      if (item.detail) lines.push(`  ${item.detail}`);
    }
  }
  lines.push('');

  // ── Scores
  lines.push(`### Latest Scores (${ctx.latest_scores.length} entities)`);
  if (ctx.latest_scores.length === 0) {
    lines.push('No score data available.');
  } else {
    lines.push('Type | Entity | Score Key | Score');
    lines.push('--- | --- | --- | ---');
    for (const s of ctx.latest_scores) {
      lines.push(`${s.entity_type} | ${s.entity_id} | ${s.score_key} | ${s.score ?? 'suppressed'}`);
    }
  }
  lines.push('');

  // ── Metric definitions
  lines.push(`### Metric Definitions (${ctx.metric_definitions.length} active)`);
  if (ctx.metric_definitions.length === 0) {
    lines.push('No metric definitions available.');
  } else {
    lines.push('ID | Domain | Name | Unit | Higher Is | Formula');
    lines.push('--- | --- | --- | --- | --- | ---');
    for (const m of ctx.metric_definitions) {
      lines.push(`${m.metric_id} | ${m.domain} | ${m.name_en} | ${m.unit} | ${m.higher_is} | ${m.formula}`);
    }
  }

  return lines.join('\n');
}

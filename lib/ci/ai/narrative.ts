// CI-T42 — Narrative explanation of metric movements
// Every claim traces to a stored number.

import type { MetricDef } from '../metrics';

const TENANT_ID = 400;

type SupabaseClient = { from: (t: string) => any };

export interface MovementFactor {
  metric: string;
  contribution: 'positive' | 'negative' | 'neutral';
  evidence: Record<string, number>;
}

export interface NarrativeResult {
  metric: MetricDef;
  movement: 'up' | 'down' | 'flat';
  magnitude: number;       // percentage change
  period: { from: string; to: string; days: number };
  factors: MovementFactor[];
  summary: string;
}

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function pctChange(a: number, b: number): number {
  if (a === 0) return b === 0 ? 0 : 100;
  return ((b - a) / Math.abs(a)) * 100;
}

function classifyMovement(pct: number): 'up' | 'down' | 'flat' {
  if (pct > 3) return 'up';
  if (pct < -3) return 'down';
  return 'flat';
}

// Correlated tables to check for contributing factors
const CORRELATED_TABLES: { table: string; columns: string[]; label: string }[] = [
  { table: 'ci_daily_sales', columns: ['net_sales_cents', 'orders', 'contribution_cents'], label: 'sales' },
  { table: 'ci_daily_traffic', columns: ['sessions', 'consent_yes'], label: 'traffic' },
  { table: 'ci_daily_funnel', columns: ['sessions_total', 'sessions_order', 'sessions_cart'], label: 'funnel' },
  { table: 'ci_daily_checkout', columns: ['sessions', 'payment_attempts', 'payment_failures'], label: 'checkout' },
];

async function fetchPeriodAverages(
  supabase: SupabaseClient,
  table: string,
  columns: string[],
  from: string,
  to: string,
): Promise<Record<string, number>> {
  const { data } = await supabase.from(table)
    .select(['fact_date', ...columns].join(', '))
    .eq('tenant_id', TENANT_ID)
    .gte('fact_date', from)
    .lte('fact_date', to);

  if (!data?.length) return {};
  const avgs: Record<string, number> = {};
  for (const col of columns) {
    const sum = data.reduce((s: number, r: any) => s + (r[col] ?? 0), 0);
    avgs[col] = sum / data.length;
  }
  return avgs;
}

export async function explainMovement(
  supabase: SupabaseClient,
  metricId: string,
  period?: number,
): Promise<NarrativeResult | string> {
  const days = period ?? 30;
  const fromDate = daysAgo(days);
  const toDate = daysAgo(0);
  const midDate = daysAgo(Math.floor(days / 2));

  // Fetch the metric definition
  const { data: metricDef } = await supabase.from('ci_metric_def')
    .select('*')
    .eq('metric_id', metricId)
    .eq('deprecated', false)
    .maybeSingle();

  if (!metricDef) return `Metric "${metricId}" not found in the registry.`;

  // Fetch the metric's recent values from its source table
  const sourceTable = metricDef.source_table;
  if (!sourceTable) return `Metric "${metricId}" has no source table configured.`;

  const { data: values } = await supabase.from(sourceTable)
    .select(`fact_date, ${metricId}`)
    .eq('tenant_id', TENANT_ID)
    .gte('fact_date', fromDate)
    .lte('fact_date', toDate)
    .order('fact_date', { ascending: true });

  if (!values?.length) return `No data found for "${metricId}" in the requested period.`;

  // Split into first half / second half
  const firstHalf = values.filter((r: any) => r.fact_date < midDate);
  const secondHalf = values.filter((r: any) => r.fact_date >= midDate);

  const avgFirst = firstHalf.length
    ? firstHalf.reduce((s: number, r: any) => s + (r[metricId] ?? 0), 0) / firstHalf.length
    : 0;
  const avgSecond = secondHalf.length
    ? secondHalf.reduce((s: number, r: any) => s + (r[metricId] ?? 0), 0) / secondHalf.length
    : 0;

  const magnitude = pctChange(avgFirst, avgSecond);
  const movement = classifyMovement(magnitude);

  // Find contributing factors from correlated tables
  const factors: MovementFactor[] = [];

  for (const ct of CORRELATED_TABLES) {
    if (ct.table === sourceTable) continue; // skip self

    const firstAvgs = await fetchPeriodAverages(supabase, ct.table, ct.columns, fromDate, midDate);
    const secondAvgs = await fetchPeriodAverages(supabase, ct.table, ct.columns, midDate, toDate);

    for (const col of ct.columns) {
      const a = firstAvgs[col];
      const b = secondAvgs[col];
      if (a === undefined || b === undefined) continue;

      const colChange = pctChange(a, b);
      if (Math.abs(colChange) < 5) continue; // only notable changes

      const contribution: 'positive' | 'negative' | 'neutral' =
        (colChange > 0 && movement === 'up') || (colChange < 0 && movement === 'down')
          ? 'positive'
          : colChange === 0 ? 'neutral' : 'negative';

      factors.push({
        metric: `${ct.label}.${col}`,
        contribution,
        evidence: {
          first_half_avg: Math.round(a * 100) / 100,
          second_half_avg: Math.round(b * 100) / 100,
          change_pct: Math.round(colChange * 10) / 10,
        },
      });
    }
  }

  // Sort factors by magnitude of change
  factors.sort((a, b) => Math.abs(b.evidence.change_pct) - Math.abs(a.evidence.change_pct));

  const dirWord = { up: 'increased', down: 'decreased', flat: 'remained stable' }[movement];
  const factorSummary = factors.length
    ? ` Contributing factors: ${factors.slice(0, 3).map(f =>
        `${f.metric} ${f.evidence.change_pct > 0 ? '+' : ''}${f.evidence.change_pct}%`
      ).join(', ')}.`
    : '';

  const summary = `${metricDef.name_en} ${dirWord} by ${Math.abs(magnitude).toFixed(1)}% over the last ${days} days.${factorSummary}`;

  return {
    metric: metricDef,
    movement,
    magnitude: Math.round(magnitude * 10) / 10,
    period: { from: fromDate, to: toDate, days },
    factors,
    summary,
  };
}

export function formatNarrative(narrative: NarrativeResult): string {
  const lines: string[] = [];
  const dir = { up: '📈', down: '📉', flat: '➡️' }[narrative.movement];

  lines.push(`${dir} ${narrative.metric.name_en}`);
  lines.push(`Period: ${narrative.period.from} → ${narrative.period.to} (${narrative.period.days}d)`);
  lines.push(`Movement: ${narrative.movement} ${Math.abs(narrative.magnitude).toFixed(1)}%`);
  lines.push('');

  if (narrative.factors.length) {
    lines.push('Contributing factors:');
    for (const f of narrative.factors.slice(0, 5)) {
      const arrow = f.contribution === 'positive' ? '↗' : f.contribution === 'negative' ? '↘' : '→';
      lines.push(`  ${arrow} ${f.metric}: ${f.evidence.change_pct > 0 ? '+' : ''}${f.evidence.change_pct}% (${f.evidence.first_half_avg} → ${f.evidence.second_half_avg})`);
    }
    lines.push('');
  }

  lines.push(narrative.summary);
  return lines.join('\n');
}

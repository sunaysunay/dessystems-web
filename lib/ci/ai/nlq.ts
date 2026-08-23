// CI-T41 — NL Q&A over metric registry
// Never guesses — only answers from stored metric definitions + values.

import type { MetricDef } from '../metrics';

const TENANT_ID = 400;

type SupabaseClient = { from: (t: string) => any };
type AiChat = (systemPrompt: string, userMessage: string) => Promise<string>;

interface MetricAnswer {
  metric: MetricDef;
  values: { fact_date: string; value: number }[];
  trend: 'up' | 'down' | 'flat';
  summary: string;
}

export async function findMetric(
  supabase: SupabaseClient,
  query: string,
): Promise<MetricDef | null> {
  const normalised = query.trim().toLowerCase();

  // Exact metric_id match first
  const { data: exact } = await supabase.from('ci_metric_def')
    .select('*')
    .eq('metric_id', normalised)
    .eq('deprecated', false)
    .maybeSingle();
  if (exact) return exact;

  // Search by name or formula text
  const { data: candidates } = await supabase.from('ci_metric_def')
    .select('*')
    .eq('deprecated', false);
  if (!candidates?.length) return null;

  // Score each candidate by keyword overlap
  const words = normalised.split(/\s+/).filter(w => w.length > 2);
  let best: MetricDef | null = null;
  let bestScore = 0;

  for (const m of candidates as MetricDef[]) {
    const haystack = [
      m.metric_id, m.name_en, m.name_nl, m.name_de, m.formula, m.domain, m.unit,
    ].join(' ').toLowerCase();

    let score = 0;
    for (const w of words) {
      if (haystack.includes(w)) score++;
    }
    // Boost exact metric_id substring match
    if (m.metric_id.includes(normalised) || normalised.includes(m.metric_id)) {
      score += 3;
    }
    if (score > bestScore) {
      bestScore = score;
      best = m;
    }
  }

  return bestScore > 0 ? best : null;
}

function detectTrend(values: number[]): 'up' | 'down' | 'flat' {
  if (values.length < 2) return 'flat';
  const first = values.slice(0, Math.ceil(values.length / 2));
  const second = values.slice(Math.ceil(values.length / 2));
  const avg1 = first.reduce((a, b) => a + b, 0) / first.length;
  const avg2 = second.reduce((a, b) => a + b, 0) / second.length;
  const diff = (avg2 - avg1) / (Math.abs(avg1) || 1);
  if (diff > 0.05) return 'up';
  if (diff < -0.05) return 'down';
  return 'flat';
}

function formatTrend(trend: 'up' | 'down' | 'flat'): string {
  return { up: 'trending up', down: 'trending down', flat: 'stable' }[trend];
}

async function fetchRecentValues(
  supabase: SupabaseClient,
  metric: MetricDef,
  days = 14,
): Promise<{ fact_date: string; value: number }[]> {
  const table = metric.source_table;
  if (!table) return [];

  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().slice(0, 10);

  // The source_table column in the metric_id tells us which ci_daily_* table to query.
  // The metric_id itself is the column name within that table.
  const { data } = await supabase.from(table)
    .select(`fact_date, ${metric.metric_id}`)
    .eq('tenant_id', TENANT_ID)
    .gte('fact_date', sinceStr)
    .order('fact_date', { ascending: true });

  if (!data?.length) return [];
  return data.map((r: any) => ({
    fact_date: r.fact_date,
    value: r[metric.metric_id] ?? 0,
  }));
}

export async function answerQuestion(
  supabase: SupabaseClient,
  question: string,
  aiChat?: AiChat,
): Promise<MetricAnswer | string> {
  const metric = await findMetric(supabase, question);
  if (!metric) {
    return 'This metric is not defined in the registry.';
  }

  const values = await fetchRecentValues(supabase, metric);
  const numericValues = values.map(v => v.value);
  const trend = detectTrend(numericValues);

  const latest = values.length ? values[values.length - 1] : null;
  const summary = latest
    ? `${metric.name_en}: latest value ${latest.value} ${metric.unit} (${latest.fact_date}), ${formatTrend(trend)} over the last ${values.length} days.`
    : `${metric.name_en}: no recent data available.`;

  const answer: MetricAnswer = { metric, values, trend, summary };

  if (aiChat) {
    const systemPrompt = [
      'You summarise e-commerce metrics. Only state facts from the provided data.',
      'Never guess or extrapolate beyond what the numbers show.',
      `Metric definition: ${metric.name_en} — ${metric.formula} (${metric.unit})`,
      `Higher is ${metric.higher_is}. Domain: ${metric.domain}.`,
    ].join('\n');

    const userMsg = [
      `Question: ${question}`,
      `Recent values: ${JSON.stringify(values.slice(-7))}`,
      `Trend: ${formatTrend(trend)}`,
    ].join('\n');

    const enhanced = await aiChat(systemPrompt, userMsg);
    return { ...answer, summary: enhanced };
  }

  return answer;
}

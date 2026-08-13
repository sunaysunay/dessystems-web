import type { SupabaseClient } from '@supabase/supabase-js';

export interface MetricResult {
  value: number;
  count: number;
  query_key: string;
  period_start: string;
  period_end: string;
  entity?: string;
}

type QueryFn = (sb: SupabaseClient, ps: string, pe: string, entity?: string) => Promise<MetricResult>;

async function vansSold(sb: SupabaseClient, ps: string, pe: string, entity?: string): Promise<MetricResult> {
  let q = sb.from('ast_lifecycle_events').select('id', { count: 'exact' })
    .eq('event_type', 'sold').gte('event_date', ps).lte('event_date', pe);
  if (entity) q = q.eq('entity', entity);
  const { count } = await q;
  return { value: count ?? 0, count: count ?? 0, query_key: 'vans_sold', period_start: ps, period_end: pe, entity };
}

async function revenueInvoiced(sb: SupabaseClient, ps: string, pe: string, entity?: string): Promise<MetricResult> {
  let q = sb.from('fin_invoices').select('gross').gte('invoice_date', ps).lte('invoice_date', pe).neq('status', 'cancelled');
  if (entity) q = q.eq('entity', entity);
  const { data } = await q;
  const total = (data ?? []).reduce((s, r) => s + Number(r.gross ?? 0), 0);
  return { value: Math.round(total * 100) / 100, count: data?.length ?? 0, query_key: 'revenue_invoiced', period_start: ps, period_end: pe, entity };
}

async function grossMarginSum(sb: SupabaseClient, ps: string, pe: string, entity?: string): Promise<MetricResult> {
  let q = sb.from('ast_assets').select('selling_price, cost_price')
    .eq('status', 'sold').gte('sold_at', ps).lte('sold_at', pe);
  if (entity) q = q.eq('entity', entity);
  const { data } = await q;
  const total = (data ?? []).reduce((s, r) => s + (Number(r.selling_price ?? 0) - Number(r.cost_price ?? 0)), 0);
  return { value: Math.round(total * 100) / 100, count: data?.length ?? 0, query_key: 'gross_margin_sum', period_start: ps, period_end: pe, entity };
}

async function avgDaysToSale(sb: SupabaseClient, ps: string, pe: string, entity?: string): Promise<MetricResult> {
  let q = sb.from('ast_assets').select('created_at, sold_at')
    .eq('status', 'sold').not('sold_at', 'is', null).gte('sold_at', ps).lte('sold_at', pe);
  if (entity) q = q.eq('entity', entity);
  const { data } = await q;
  if (!data?.length) return { value: 0, count: 0, query_key: 'avg_days_to_sale', period_start: ps, period_end: pe, entity };
  const totalDays = data.reduce((s, r) => {
    const d = (new Date(r.sold_at).getTime() - new Date(r.created_at).getTime()) / 86400_000;
    return s + Math.max(0, d);
  }, 0);
  return { value: Math.round((totalDays / data.length) * 10) / 10, count: data.length, query_key: 'avg_days_to_sale', period_start: ps, period_end: pe, entity };
}

async function inquiriesCount(sb: SupabaseClient, ps: string, pe: string, entity?: string): Promise<MetricResult> {
  let q = sb.from('crm_leads').select('id', { count: 'exact' }).gte('created_at', ps).lte('created_at', pe);
  if (entity) q = q.eq('entity', entity);
  const { count } = await q;
  return { value: count ?? 0, count: count ?? 0, query_key: 'inquiries_count', period_start: ps, period_end: pe, entity };
}

async function inquiryToSaleConversion(sb: SupabaseClient, ps: string, pe: string, entity?: string): Promise<MetricResult> {
  let q = sb.from('crm_leads').select('status').gte('created_at', ps).lte('created_at', pe);
  if (entity) q = q.eq('entity', entity);
  const { data } = await q;
  if (!data?.length) return { value: 0, count: 0, query_key: 'inquiry_to_sale_conversion', period_start: ps, period_end: pe, entity };
  const won = data.filter(r => r.status === 'won').length;
  return { value: Math.round((won / data.length) * 10000) / 100, count: data.length, query_key: 'inquiry_to_sale_conversion', period_start: ps, period_end: pe, entity };
}

async function npsAvg(sb: SupabaseClient, ps: string, pe: string): Promise<MetricResult> {
  const { data } = await sb.from('sal_surveys').select('nps_score')
    .not('nps_score', 'is', null).gte('created_at', ps).lte('created_at', pe);
  if (!data?.length) return { value: 0, count: 0, query_key: 'nps_avg', period_start: ps, period_end: pe };
  const avg = data.reduce((s, r) => s + Number(r.nps_score), 0) / data.length;
  return { value: Math.round(avg * 10) / 10, count: data.length, query_key: 'nps_avg', period_start: ps, period_end: pe };
}

async function reviewScoreAvg(sb: SupabaseClient, ps: string, pe: string): Promise<MetricResult> {
  const { data } = await sb.from('sal_surveys').select('review_score')
    .not('review_score', 'is', null).gte('created_at', ps).lte('created_at', pe);
  if (!data?.length) return { value: 0, count: 0, query_key: 'review_score_avg', period_start: ps, period_end: pe };
  const avg = data.reduce((s, r) => s + Number(r.review_score), 0) / data.length;
  return { value: Math.round(avg * 100) / 100, count: data.length, query_key: 'review_score_avg', period_start: ps, period_end: pe };
}

async function stockCount(sb: SupabaseClient, _ps: string, _pe: string, entity?: string): Promise<MetricResult> {
  let q = sb.from('ast_assets').select('id', { count: 'exact' }).in('status', ['available', 'reserved']);
  if (entity) q = q.eq('entity', entity);
  const { count } = await q;
  return { value: count ?? 0, count: count ?? 0, query_key: 'stock_count', period_start: _ps, period_end: _pe, entity };
}

const QUERIES: Record<string, QueryFn> = {
  vans_sold: vansSold,
  revenue_invoiced: revenueInvoiced,
  gross_margin_sum: grossMarginSum,
  avg_days_to_sale: avgDaysToSale,
  inquiries_count: inquiriesCount,
  inquiry_to_sale_conversion: inquiryToSaleConversion,
  nps_avg: npsAvg,
  review_score_avg: reviewScoreAvg,
  stock_count: stockCount,
};

export async function computeMetric(
  supabase: SupabaseClient,
  queryKey: string,
  periodStart: string,
  periodEnd: string,
  entity?: string,
): Promise<MetricResult> {
  const fn = QUERIES[queryKey];
  if (!fn) throw new Error(`Unknown metric query_key: ${queryKey}`);
  return fn(supabase, periodStart, periodEnd, entity);
}

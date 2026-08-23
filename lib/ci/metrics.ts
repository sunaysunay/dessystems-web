import { getServerClient } from '@/lib/supabase-server';

export interface MetricDef {
  metric_id: string;
  domain: string;
  plane: string;
  name_en: string;
  name_nl: string;
  name_de: string;
  name_fr: string;
  name_tr: string;
  formula: string;
  source_table: string;
  unit: string;
  aggregation: string;
  grain: string;
  higher_is: string;
  shrinkage_k: number | null;
  version: number;
  deprecated: boolean;
}

export async function getMetric(metricId: string): Promise<MetricDef | null> {
  const supabase = getServerClient();
  const { data, error } = await supabase
    .from('ci_metric_def')
    .select('*')
    .eq('metric_id', metricId)
    .eq('deprecated', false)
    .maybeSingle();

  if (error) throw new Error(`getMetric(${metricId}): ${error.message}`);
  return data;
}

export async function getMetricsByDomain(domain: string): Promise<MetricDef[]> {
  const supabase = getServerClient();
  const { data, error } = await supabase
    .from('ci_metric_def')
    .select('*')
    .eq('domain', domain)
    .eq('deprecated', false)
    .order('metric_id');

  if (error) throw new Error(`getMetricsByDomain(${domain}): ${error.message}`);
  return data ?? [];
}

export async function getAllMetrics(): Promise<MetricDef[]> {
  const supabase = getServerClient();
  const { data, error } = await supabase
    .from('ci_metric_def')
    .select('*')
    .eq('deprecated', false)
    .order('domain')
    .order('metric_id');

  if (error) throw new Error(`getAllMetrics: ${error.message}`);
  return data ?? [];
}

const LOCALE_FIELD: Record<string, keyof MetricDef> = {
  en: 'name_en',
  nl: 'name_nl',
  de: 'name_de',
  fr: 'name_fr',
  tr: 'name_tr',
};

export function metricLabel(metric: MetricDef, locale: string): string {
  const field = LOCALE_FIELD[locale] || 'name_en';
  return (metric[field] as string) || metric.name_en;
}

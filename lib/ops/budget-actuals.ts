import type { SupabaseClient } from '@supabase/supabase-js';

export interface BudgetActuals {
  budget: number;
  actual_ap: number;
  actual_ar: number;
  net_spend: number;
  variance: number;
  variance_pct: number;
}

export async function getBudgetActuals(
  sb: SupabaseClient,
  periodStart: string,
  periodEnd: string,
  entity?: string | null,
): Promise<BudgetActuals> {
  let apQ = sb.from('fin_invoices').select('gross')
    .eq('type', 'AP').neq('status', 'cancelled')
    .gte('invoice_date', periodStart).lte('invoice_date', periodEnd);

  let arQ = sb.from('fin_invoices').select('gross')
    .eq('type', 'AR').neq('status', 'cancelled')
    .gte('invoice_date', periodStart).lte('invoice_date', periodEnd);

  if (entity) {
    apQ = apQ.eq('entity', entity);
    arQ = arQ.eq('entity', entity);
  }

  const [{ data: apData }, { data: arData }] = await Promise.all([apQ, arQ]);

  const actual_ap = (apData ?? []).reduce((s, r) => s + Number(r.gross ?? 0), 0);
  const actual_ar = (arData ?? []).reduce((s, r) => s + Number(r.gross ?? 0), 0);
  const net_spend = actual_ap;

  return {
    budget: 0,
    actual_ap,
    actual_ar,
    net_spend,
    variance: 0,
    variance_pct: 0,
  };
}

export async function getGoalBudgetActuals(
  sb: SupabaseClient,
  goalId: string,
): Promise<BudgetActuals | null> {
  const { data: goal } = await sb.from('op_goals')
    .select('budget, period_start, period_end, entity')
    .eq('id', goalId).single();

  if (!goal?.period_start || !goal?.period_end) return null;

  const result = await getBudgetActuals(sb, goal.period_start, goal.period_end, goal.entity);
  const budget = Number(goal.budget ?? 0);
  result.budget = budget;
  result.variance = budget - result.net_spend;
  result.variance_pct = budget > 0 ? Math.round(((budget - result.net_spend) / budget) * 100) : 0;
  return result;
}

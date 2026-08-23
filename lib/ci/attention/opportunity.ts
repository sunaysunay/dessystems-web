// CI-T39 — Opportunity engine (ranges, not point estimates)
// Point-estimate impact → test failure. All estimates are [low, mid, high].

export interface OpportunityRange {
  low: number;
  mid: number;
  high: number;
}

export interface Opportunity {
  id: string;
  type: string;
  entity_type: string;
  entity_id: string | null;
  title: string;
  impact_revenue: OpportunityRange;
  impact_orders: OpportunityRange;
  confidence: number;
  rationale: string;
  actions: string[];
}

export function rangeEstimate(base: number, upliftPct: number, uncertainty: number): OpportunityRange {
  const mid = base * upliftPct;
  return {
    low: mid * (1 - uncertainty),
    mid,
    high: mid * (1 + uncertainty),
  };
}

export function isRange(value: unknown): value is OpportunityRange {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.low === 'number' && typeof v.mid === 'number' && typeof v.high === 'number'
    && v.low <= v.mid && v.mid <= v.high;
}

export interface OpportunityContext {
  tenantId: number;
  today: string;
  supabase: { from: (t: string) => any };
}

export async function findStockoutOpportunities(ctx: OpportunityContext): Promise<Opportunity[]> {
  const { data: items } = await ctx.supabase.from('ci_daily_inventory')
    .select('variant_id, days_of_stock, avg_daily_revenue_cents')
    .eq('fact_date', ctx.today)
    .gt('avg_daily_revenue_cents', 0)
    .lt('days_of_stock', 7);

  if (!items?.length) return [];

  return items.map((item: any) => {
    const dailyRev = (item.avg_daily_revenue_cents ?? 0) / 100;
    const daysLost = Math.max(0, 14 - (item.days_of_stock ?? 0));
    const impact = rangeEstimate(dailyRev * daysLost, 1, 0.3);

    return {
      id: `stockout_opp_${item.variant_id}`,
      type: 'stockout_prevention',
      entity_type: 'product',
      entity_id: item.variant_id,
      title: `Restock ${item.variant_id} to prevent €${impact.mid.toFixed(0)} lost revenue`,
      impact_revenue: impact,
      impact_orders: rangeEstimate(daysLost, 0.5, 0.4),
      confidence: Math.min(0.9, 0.5 + (item.days_of_stock ?? 0) * 0.05),
      rationale: `${item.days_of_stock}d stock remaining, averaging €${dailyRev.toFixed(0)}/day`,
      actions: ['Reorder from supplier', 'Check alternative suppliers', 'Activate pre-order'],
    };
  });
}

export async function findCvrOpportunities(ctx: OpportunityContext): Promise<Opportunity[]> {
  const { data: scores } = await ctx.supabase.from('ci_score_result')
    .select('entity_id, score, components')
    .eq('computed_date', ctx.today)
    .eq('entity_type', 'product')
    .not('score', 'is', null)
    .gt('score', 30)
    .lt('score', 60);

  if (!scores?.length) return [];

  const opps: Opportunity[] = [];
  for (const s of scores) {
    const cvr = (s.components as any)?.cvr;
    const traffic = (s.components as any)?.traffic;
    if (!cvr || !traffic) continue;

    if (cvr.score < 40 && traffic.score > 60) {
      const uplift = rangeEstimate(traffic.raw * 0.01, 0.5, 0.35);
      opps.push({
        id: `cvr_opp_${s.entity_id}`,
        type: 'cvr_improvement',
        entity_type: 'product',
        entity_id: s.entity_id,
        title: `Improve conversion on high-traffic product ${s.entity_id}`,
        impact_revenue: rangeEstimate(uplift.mid * 50, 1, 0.4),
        impact_orders: uplift,
        confidence: 0.5,
        rationale: `High traffic (score ${traffic.score}) but low CVR (score ${cvr.score})`,
        actions: ['Review product images', 'Check pricing vs competitors', 'Add fitment data', 'Improve description'],
      });
    }
  }
  return opps;
}

export async function findAllOpportunities(ctx: OpportunityContext): Promise<Opportunity[]> {
  const [stockout, cvr] = await Promise.all([
    findStockoutOpportunities(ctx),
    findCvrOpportunities(ctx),
  ]);
  return [...stockout, ...cvr].sort((a, b) => b.impact_revenue.mid - a.impact_revenue.mid);
}

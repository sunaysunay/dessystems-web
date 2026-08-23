// CI-T44 — Recommend → approve → execute
// CRITICAL: No action executes without recorded human approval.

import { type OpportunityRange, rangeEstimate } from '../attention/opportunity';

const TENANT_ID = 400;

type SupabaseClient = { from: (t: string) => any };

export type Urgency = 'immediate' | 'soon' | 'planned';

export interface Recommendation {
  id: string;
  attention_item_id: string;
  action: string;
  rationale: string;
  impact: OpportunityRange;
  urgency: Urgency;
  created_at: string;
}

const URGENCY_ORDER: Record<Urgency, number> = { immediate: 0, soon: 1, planned: 2 };

function severityToUrgency(severity: string): Urgency {
  switch (severity) {
    case 'critical': return 'immediate';
    case 'high': return 'soon';
    default: return 'planned';
  }
}

function actionForRule(ruleId: string, detail: any): { action: string; rationale: string } {
  switch (ruleId) {
    case 'payment_failure_spike':
      return {
        action: 'Check Mollie dashboard for payment provider issues and contact support if widespread',
        rationale: `Payment failure rate at ${((detail?.rate ?? 0) * 100).toFixed(1)}%, significantly above baseline`,
      };
    case 'checkout_error_spike':
      return {
        action: 'Review checkout error logs and deploy hotfix if code-related',
        rationale: `Checkout errors at ${detail?.errors ?? '?'}x baseline, blocking conversions`,
      };
    case 'revenue_drop':
      return {
        action: 'Investigate traffic sources and ad spend; check for catalogue or pricing issues',
        rationale: `Weekly revenue significantly below historical average (z-score: ${detail?.z_score?.toFixed?.(1) ?? '?'})`,
      };
    case 'cvr_drop':
      return {
        action: 'Audit recent site changes, check page load times, review product availability',
        rationale: `CVR dropped ${detail?.drop_pct?.toFixed?.(0) ?? '?'}% week-over-week (p=${detail?.pValue?.toFixed?.(3) ?? '?'})`,
      };
    case 'stockout_imminent':
      return {
        action: 'Place reorder with supplier or activate pre-order for affected SKUs',
        rationale: `${detail?.days_of_stock ?? '?'} days of stock remaining vs ${detail?.supplier_lead_time ?? '?'}d lead time`,
      };
    case 'margin_erosion':
      return {
        action: 'Review cost changes, discount usage, and shipping cost allocation',
        rationale: `Contribution margin dropped ${detail?.drop_pp?.toFixed?.(1) ?? '?'}pp recently`,
      };
    case 'wrong_fit_returns':
      return {
        action: 'Update fitment data and size guides for affected products',
        rationale: `Wrong-fit return rate at ${((detail?.rate ?? 0) * 100).toFixed(1)}%, above 8% threshold`,
      };
    case 'dead_stock':
      return {
        action: 'Consider clearance pricing, bundle deals, or marketplace listing',
        rationale: `Stock value tied up with no sales in ${detail?.days_since_last_sale ?? '?'} days`,
      };
    case 'promise_miss':
      return {
        action: 'Review fulfilment SLAs and carrier performance; adjust delivery promises if needed',
        rationale: `Promise accuracy at ${detail?.accuracy ? (detail.accuracy * 100).toFixed(1) : '?'}%, below 90% target`,
      };
    default:
      return {
        action: `Review and address: ${ruleId}`,
        rationale: 'Attention item flagged by intelligence rules',
      };
  }
}

export async function generateRecommendations(
  supabase: SupabaseClient,
): Promise<Recommendation[]> {
  // Fetch open attention items
  const { data: items } = await supabase.from('ci_attention_item')
    .select('id, rule_id, severity, title, detail, evidence')
    .eq('tenant_id', TENANT_ID)
    .eq('status', 'open')
    .order('severity', { ascending: true })
    .limit(50);

  if (!items?.length) return [];

  // Fetch latest scores for context
  const { data: scores } = await supabase.from('ci_score_result')
    .select('entity_type, entity_id, score, confidence')
    .eq('tenant_id', TENANT_ID)
    .order('computed_date', { ascending: false })
    .limit(100);

  const scoreMap = new Map<string, number>();
  for (const s of scores ?? []) {
    const key = `${s.entity_type}:${s.entity_id}`;
    if (!scoreMap.has(key)) scoreMap.set(key, s.score ?? 50);
  }

  const now = new Date().toISOString();
  const recommendations: Recommendation[] = [];

  for (const item of items) {
    const urgency = severityToUrgency(item.severity);
    const { action, rationale } = actionForRule(item.rule_id, item.detail);

    // Estimate impact based on severity and available evidence
    const baseCents = (item.detail as any)?.stock_value_cents
      ?? (item.detail as any)?.recent_revenue
      ?? 10000; // €100 default base
    const base = baseCents / 100;
    const uplift = urgency === 'immediate' ? 0.15 : urgency === 'soon' ? 0.08 : 0.04;
    const uncertainty = urgency === 'immediate' ? 0.25 : 0.35;

    recommendations.push({
      id: `rec_${item.id}_${Date.now()}`,
      attention_item_id: item.id,
      action,
      rationale,
      impact: rangeEstimate(base, uplift, uncertainty),
      urgency,
      created_at: now,
    });
  }

  // Sort by urgency first, then by impact (mid) descending
  recommendations.sort((a, b) => {
    const uDiff = URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency];
    if (uDiff !== 0) return uDiff;
    return b.impact.mid - a.impact.mid;
  });

  return recommendations;
}

export function formatTelegramApproval(rec: Recommendation): string {
  const urgencyEmoji = { immediate: '🔴', soon: '🟠', planned: '🟡' }[rec.urgency];
  const lines = [
    `${urgencyEmoji} <b>Recommendation</b>`,
    '',
    `<b>Action:</b> ${rec.action}`,
    `<b>Why:</b> ${rec.rationale}`,
    `<b>Impact:</b> €${rec.impact.low.toFixed(0)} – €${rec.impact.high.toFixed(0)} (mid €${rec.impact.mid.toFixed(0)})`,
    `<b>Urgency:</b> ${rec.urgency}`,
    '',
    `Reply with:`,
    `✅ <code>/approve ${rec.id}</code>`,
    `❌ <code>/reject ${rec.id}</code>`,
  ];
  return lines.join('\n');
}

export async function recordApproval(
  supabase: SupabaseClient,
  recommendationId: string,
  approved: boolean,
  approvedBy: string,
): Promise<{ approved: boolean; recorded_at: string }> {
  const now = new Date().toISOString();

  // Record in audit log — no action executes without this record
  await supabase.from('bop_audit_log').insert({
    tenant_id: TENANT_ID,
    action: approved ? 'ci_recommendation_approved' : 'ci_recommendation_rejected',
    entity_type: 'ci_recommendation',
    entity_id: recommendationId,
    actor: approvedBy,
    detail: { approved, recommendation_id: recommendationId },
    created_at: now,
  });

  return { approved, recorded_at: now };
}

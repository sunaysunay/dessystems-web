// CI-T32 — Customer Value Score + segments
// Unprofitable customers excluded from marketing exports by default.

import { computeEntityScore, type ScoreComponent } from './engine';
import type { PeerData } from './engine';

export type CustomerSegment =
  | 'champions'
  | 'loyal'
  | 'potential'
  | 'at_risk'
  | 'hibernating'
  | 'lost'
  | 'unprofitable';

export interface CustomerScoreInput {
  customer_id: string;
  total_revenue: number;
  total_contribution: number;
  order_count: number;
  return_count: number;
  days_since_last_order: number;
  lifetime_days: number;
}

export const SEGMENT_THRESHOLDS = {
  champions:   { minScore: 80, maxRecency: 60 },
  loyal:       { minScore: 60, maxRecency: 90 },
  potential:   { minScore: 40, maxRecency: 60 },
  at_risk:     { minScore: 40, maxRecency: 180 },
  hibernating: { minScore: 0,  maxRecency: 365 },
  lost:        { minScore: 0,  maxRecency: Infinity },
};

export function segmentCustomer(score: number, input: CustomerScoreInput): CustomerSegment {
  if (input.total_contribution < 0) return 'unprofitable';

  const recency = input.days_since_last_order;

  if (score >= 80 && recency <= 60) return 'champions';
  if (score >= 60 && recency <= 90) return 'loyal';
  if (score >= 40 && recency <= 60) return 'potential';
  if (score >= 40 && recency <= 180) return 'at_risk';
  if (recency <= 365) return 'hibernating';
  return 'lost';
}

export function isExportEligible(segment: CustomerSegment): boolean {
  return segment !== 'unprofitable' && segment !== 'lost';
}

export function scoreCustomer(
  input: CustomerScoreInput,
  components: ScoreComponent[],
  peerDataByMetric: Record<string, PeerData>,
  peerRateByMetric: Record<string, number>,
): {
  score: number | null;
  segment: CustomerSegment;
  export_eligible: boolean;
  components: Record<string, unknown>;
} {
  const metrics: Record<string, { successes?: number; trials?: number; value: number }> = {};

  metrics.customer_revenue = { value: input.total_revenue };
  metrics.order_count = { value: input.order_count };

  if (input.total_revenue > 0) {
    metrics.customer_margin_pct = { value: input.total_contribution / input.total_revenue };
  }
  if (input.order_count > 0) {
    metrics.customer_return_rate = {
      successes: input.return_count,
      trials: input.order_count,
      value: input.return_count / input.order_count,
    };
  }

  const result = computeEntityScore(components, metrics, peerDataByMetric, peerRateByMetric);
  const effectiveScore = result.score ?? 0;
  const segment = segmentCustomer(effectiveScore, input);

  return {
    score: result.score,
    segment,
    export_eligible: isExportEligible(segment),
    components: result.components,
  };
}

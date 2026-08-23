// CI-T29 — Product Performance Score v1
// Guards: >10% missing-cost → score=null, suppressed_reason='cost_data_missing'

import { computeEntityScore, type ScoreComponent, type EntityScore } from './engine';
import type { PeerData } from './engine';

export const COST_MISSING_THRESHOLD = 0.10;

export interface ProductScoreInput {
  variant_id: string;
  page_views: number;
  orders: number;
  cart_adds: number;
  net_revenue: number;
  contribution: number;
  returns: number;
  inventory_turn: number;
  has_cost: boolean;
  category_id?: string;
  price_band?: string;
}

export function scoreProduct(
  input: ProductScoreInput,
  components: ScoreComponent[],
  peerDataByMetric: Record<string, PeerData>,
  peerRateByMetric: Record<string, number>,
  costCoverage: number,
): Omit<EntityScore, 'entity_type' | 'entity_id'> & { entity_id: string } {
  if (costCoverage < (1 - COST_MISSING_THRESHOLD)) {
    return {
      entity_id: input.variant_id,
      score: null,
      suppressed_reason: 'cost_data_missing',
      components: {},
      peer_level: 'site',
      confidence: 0,
    };
  }

  const metrics: Record<string, { successes?: number; trials?: number; value: number }> = {};

  if (input.page_views > 0) {
    metrics.cvr_view_to_order = { successes: input.orders, trials: input.page_views, value: input.orders / input.page_views };
    metrics.cart_rate = { successes: input.cart_adds, trials: input.page_views, value: input.cart_adds / input.page_views };
  }
  if (input.net_revenue > 0) {
    metrics.contribution_pct = { value: input.contribution / input.net_revenue };
  }
  metrics.page_views = { value: input.page_views };
  if (input.orders > 0) {
    metrics.return_rate = { successes: input.returns, trials: input.orders, value: input.returns / input.orders };
  }
  if (input.inventory_turn > 0) {
    metrics.inventory_turn = { value: input.inventory_turn };
  }

  const result = computeEntityScore(components, metrics, peerDataByMetric, peerRateByMetric);
  return { entity_id: input.variant_id, ...result };
}

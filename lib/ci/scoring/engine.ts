// CI-T28 — Score engine
// Loads score definitions + components, computes per-entity scores using
// percentile normalisation + shrinkage, writes ci_score_result.

import { scoreInPeerGroup, widenPeers, type Direction, type PeerLevel } from './percentile';
import { shrink, SHRINKAGE_K } from './shrinkage';

export interface ScoreDef {
  id: number;
  score_key: string;
  version: number;
  is_active: boolean;
}

export interface ScoreComponent {
  component_key: string;
  weight: number;
  direction: Direction;
  metric: string;
  shrinkage_key: string | null;
  sort_order: number;
}

export interface ComponentResult {
  raw: number;
  adjusted: number;
  score: number;
  peer_level: PeerLevel;
  n: number;
  confidence: number;
  weight: number;
  suppressed: boolean;
}

export interface EntityScore {
  entity_type: string;
  entity_id: string;
  score: number | null;
  suppressed_reason: string | null;
  components: Record<string, ComponentResult>;
  peer_level: PeerLevel;
  confidence: number;
}

export interface PeerData {
  category_price_band?: number[];
  category?: number[];
  parent_category?: number[];
  site?: number[];
}

export function computeEntityScore(
  components: ScoreComponent[],
  entityMetrics: Record<string, { successes?: number; trials?: number; value: number }>,
  peerDataByMetric: Record<string, PeerData>,
  peerRateByMetric: Record<string, number>,
): Omit<EntityScore, 'entity_type' | 'entity_id'> {
  const compResults: Record<string, ComponentResult> = {};
  let totalWeight = 0;
  let weightedSum = 0;
  let minConfidence = 1;
  let widestPeerLevel: PeerLevel = 'category_price_band';
  let anySuppressed = false;
  let suppressedReason: string | null = null;

  const peerLevelOrder: PeerLevel[] = ['category_price_band', 'category', 'parent_category', 'site'];

  for (const comp of components) {
    const metricData = entityMetrics[comp.metric];
    if (!metricData) {
      compResults[comp.component_key] = {
        raw: 0, adjusted: 0, score: 50, peer_level: 'site',
        n: 0, confidence: 0, weight: comp.weight, suppressed: true,
      };
      anySuppressed = true;
      continue;
    }

    let rawValue = metricData.value;
    let adjustedValue = rawValue;
    let confidence = 1;

    if (comp.shrinkage_key && SHRINKAGE_K[comp.shrinkage_key] !== undefined) {
      const k = SHRINKAGE_K[comp.shrinkage_key];
      const successes = metricData.successes ?? 0;
      const trials = metricData.trials ?? 0;
      const peerRate = peerRateByMetric[comp.metric] ?? 0;
      const shrunk = shrink(successes, trials, k, peerRate);
      adjustedValue = shrunk.adjustedRate;
      confidence = shrunk.confidence;

      if (shrunk.display === 'suppressed') {
        compResults[comp.component_key] = {
          raw: rawValue, adjusted: adjustedValue, score: 50,
          peer_level: 'site', n: 0, confidence,
          weight: comp.weight, suppressed: true,
        };
        anySuppressed = true;
        continue;
      }
    }

    const peers = peerDataByMetric[comp.metric] ?? {};
    const { peers: peerValues, level } = widenPeers(peers as Partial<Record<PeerLevel, number[]>>);

    const peerScore = scoreInPeerGroup(adjustedValue, peerValues, comp.direction);

    if (peerLevelOrder.indexOf(level) > peerLevelOrder.indexOf(widestPeerLevel)) {
      widestPeerLevel = level;
    }
    if (confidence < minConfidence) minConfidence = confidence;

    compResults[comp.component_key] = {
      raw: rawValue,
      adjusted: adjustedValue,
      score: peerScore.score,
      peer_level: level,
      n: peerScore.n,
      confidence,
      weight: comp.weight,
      suppressed: false,
    };

    totalWeight += comp.weight;
    weightedSum += comp.weight * peerScore.score;
  }

  if (totalWeight === 0) {
    return {
      score: null,
      suppressed_reason: 'no_scorable_components',
      components: compResults,
      peer_level: widestPeerLevel,
      confidence: 0,
    };
  }

  const compositeScore = Math.round((weightedSum / totalWeight) * 10) / 10;

  return {
    score: compositeScore,
    suppressed_reason: suppressedReason,
    components: compResults,
    peer_level: widestPeerLevel,
    confidence: minConfidence,
  };
}

const TENANT_ID = 400;

export async function loadScoreDefs(
  supabase: { from: (t: string) => any },
): Promise<Array<ScoreDef & { components: ScoreComponent[] }>> {
  const { data: defs } = await supabase
    .from('ci_score_def')
    .select('*')
    .eq('tenant_id', TENANT_ID)
    .eq('is_active', true);

  if (!defs?.length) return [];

  const result: Array<ScoreDef & { components: ScoreComponent[] }> = [];
  for (const def of defs) {
    const { data: comps } = await supabase
      .from('ci_score_component')
      .select('*')
      .eq('score_def_id', def.id)
      .order('sort_order');

    result.push({ ...def, components: comps ?? [] });
  }
  return result;
}

export async function runScoreEngine(
  supabase: { from: (t: string) => any },
  date: string,
) {
  const defs = await loadScoreDefs(supabase);
  if (!defs.length) return { computed: 0 };

  const { data: benchmarks } = await supabase
    .from('ci_benchmark')
    .select('*')
    .eq('tenant_id', TENANT_ID)
    .eq('computed_date', date);

  const benchMap = new Map<string, Record<string, unknown>>();
  for (const b of (benchmarks ?? [])) {
    benchMap.set(`${b.scope}:${b.metric}`, b);
  }

  const { data: products } = await supabase
    .from('ci_daily_product')
    .select('*')
    .eq('fact_date', date);

  if (!products?.length) return { computed: 0 };

  const rows: Record<string, unknown>[] = [];

  for (const def of defs) {
    if (def.score_key === 'product_performance') {
      for (const prod of products) {
        const entityMetrics = extractProductMetrics(prod);
        const peerData = buildPeerData(def.components, prod, benchmarks ?? []);
        const peerRates = buildPeerRates(def.components, prod, benchmarks ?? []);

        const result = computeEntityScore(def.components, entityMetrics, peerData, peerRates);

        rows.push({
          tenant_id: TENANT_ID,
          score_def_id: def.id,
          entity_type: 'product',
          entity_id: String(prod.variant_id ?? prod.product_id),
          computed_date: date,
          score: result.score,
          suppressed_reason: result.suppressed_reason,
          components: result.components,
          peer_level: result.peer_level,
          confidence: result.confidence,
        });
      }
    }
  }

  if (!rows.length) return { computed: 0 };

  const { error } = await supabase
    .from('ci_score_result')
    .upsert(rows, { onConflict: 'tenant_id,score_def_id,entity_type,entity_id,computed_date', ignoreDuplicates: false });

  if (error) throw new Error(`runScoreEngine: ${error.message}`);
  return { computed: rows.length };
}

function extractProductMetrics(prod: Record<string, unknown>) {
  const views = Number(prod.page_views ?? 0);
  const orders = Number(prod.orders ?? 0);
  const rev = Number(prod.net_revenue ?? 0);
  const contribution = Number(prod.contribution ?? 0);
  const returns = Number(prod.returns ?? 0);
  const cartAdds = Number(prod.cart_adds ?? 0);

  const metrics: Record<string, { successes?: number; trials?: number; value: number }> = {};

  if (views > 0) {
    metrics.cvr_view_to_order = { successes: orders, trials: views, value: orders / views };
    metrics.cart_rate = { successes: cartAdds, trials: views, value: cartAdds / views };
  }
  if (rev > 0) {
    metrics.contribution_pct = { value: contribution / rev };
  }
  metrics.page_views = { value: views };
  if (orders > 0) {
    metrics.return_rate = { successes: returns, trials: orders, value: returns / orders };
  }
  const turn = Number(prod.inventory_turn ?? 0);
  if (turn > 0) metrics.inventory_turn = { value: turn };

  return metrics;
}

function buildPeerData(
  components: ScoreComponent[],
  prod: Record<string, unknown>,
  benchmarks: Record<string, unknown>[],
): Record<string, PeerData> {
  const result: Record<string, PeerData> = {};
  const catId = prod.category_id ? String(prod.category_id) : null;
  const priceBand = prod.price_band ? String(prod.price_band) : null;

  for (const comp of components) {
    const pd: PeerData = {};
    for (const b of benchmarks) {
      if (b.metric !== comp.metric) continue;
      const scope = String(b.scope ?? '');
      const n = Number(b.n ?? 0);
      if (n === 0) continue;

      const synthPeers = synthesisePeersFromBenchmark(b, n);

      if (scope.startsWith('site:')) pd.site = synthPeers;
      if (catId && scope === `category:${catId}`) pd.category = synthPeers;
      if (catId && priceBand && scope === `category_price_band:${catId}:${priceBand}`) {
        pd.category_price_band = synthPeers;
      }
    }
    result[comp.metric] = pd;
  }
  return result;
}

function synthesisePeersFromBenchmark(b: Record<string, unknown>, n: number): number[] {
  const ps = [1, 5, 10, 25, 50, 75, 90, 95, 99];
  const vals = ps.map(p => Number(b[`p${p}`] ?? 0));
  const peers: number[] = [];
  for (let i = 0; i < n; i++) {
    const pct = (i + 0.5) / n * 100;
    let j = 0;
    while (j < ps.length - 1 && ps[j + 1] < pct) j++;
    if (j >= ps.length - 1) { peers.push(vals[vals.length - 1]); continue; }
    const frac = (pct - ps[j]) / (ps[j + 1] - ps[j]);
    peers.push(vals[j] + frac * (vals[j + 1] - vals[j]));
  }
  return peers;
}

function buildPeerRates(
  components: ScoreComponent[],
  prod: Record<string, unknown>,
  benchmarks: Record<string, unknown>[],
): Record<string, number> {
  const result: Record<string, number> = {};
  const catId = prod.category_id ? String(prod.category_id) : null;

  for (const comp of components) {
    if (!comp.shrinkage_key) continue;
    for (const b of benchmarks) {
      if (b.metric !== comp.metric) continue;
      const scope = String(b.scope ?? '');
      if (catId && scope === `category:${catId}`) {
        result[comp.metric] = Number(b.p50 ?? 0);
        break;
      }
      if (scope.startsWith('site:')) {
        result[comp.metric] = result[comp.metric] ?? Number(b.p50 ?? 0);
      }
    }
  }
  return result;
}

/**
 * CI-T27..T33 — Scoring engine tests
 *
 * Run:  npx tsx lib/ci/__tests__/scoring-engine.test.ts
 *
 * Acceptance:
 *   T27: Percentiles match numpy-computed fixture
 *   T28: Changing a weight creates new version; old results readable
 *   T29: >10% missing-cost → score=null, suppressed_reason='cost_data_missing'
 *   T30: No product oscillates between states on consecutive nights with unchanged data
 *   T31: Decomposes into 10 line items; each links to PIM field
 *   T32: Unprofitable customers excluded from marketing exports by default
 *   T33: Every displayed score has working "why this number" panel
 */

import { readFileSync } from 'fs';
import { join } from 'path';

let passed = 0;
let failed = 0;

function assert(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) { passed++; }
  else { failed++; console.error(`FAIL: ${name}\n  expected: ${e}\n  actual:   ${a}`); }
}

function assertClose(name: string, actual: number, expected: number, tolerance = 0.5) {
  if (Math.abs(actual - expected) <= tolerance) { passed++; }
  else { failed++; console.error(`FAIL: ${name}\n  expected: ~${expected} (±${tolerance})\n  actual:   ${actual}`); }
}

// ══════════════════════════════════════════════════════════════
//  CI-T27 — Benchmark engine
// ══════════════════════════════════════════════════════════════

import { computeBenchmark, buildBenchmarks, BENCHMARK_METRICS } from '../scoring/benchmark';

// Numpy fixture: np.percentile([1..100], [1,5,10,25,50,75,90,95,99])
// = [1.99, 5.95, 10.9, 25.75, 50.5, 75.25, 90.1, 95.05, 99.01]
const fixture100 = Array.from({ length: 100 }, (_, i) => i + 1);
const bm = computeBenchmark('site:400', 'revenue', '2026-01-01', fixture100)!;

assert('T27: benchmark not null', bm !== null, true);
assert('T27: n=100', bm.n, 100);
assertClose('T27: p1 matches numpy', bm.p1, 1.99, 0.01);
assertClose('T27: p5 matches numpy', bm.p5, 5.95, 0.01);
assertClose('T27: p10 matches numpy', bm.p10, 10.9, 0.1);
assertClose('T27: p25 matches numpy', bm.p25, 25.75, 0.01);
assertClose('T27: p50 matches numpy', bm.p50, 50.5, 0.01);
assertClose('T27: p75 matches numpy', bm.p75, 75.25, 0.01);
assertClose('T27: p90 matches numpy', bm.p90, 90.1, 0.1);
assertClose('T27: p95 matches numpy', bm.p95, 95.05, 0.01);
assertClose('T27: p99 matches numpy', bm.p99, 99.01, 0.01);
assertClose('T27: mean', bm.mean, 50.5, 0.01);

// Empty values → null
assert('T27: empty → null', computeBenchmark('x', 'y', 'd', []), null);

// buildBenchmarks groups by scope
const products = [
  { page_views: 100, orders: 5, net_revenue: 500, category_id: 'cat1', price_band: 'mid' },
  { page_views: 200, orders: 8, net_revenue: 900, category_id: 'cat1', price_band: 'mid' },
  { page_views: 50,  orders: 2, net_revenue: 200, category_id: 'cat2', price_band: 'low' },
];
const benchmarks = buildBenchmarks('2026-01-01', products, (r) => ({
  site: '400',
  category: String(r.category_id),
  category_price_band: `${r.category_id}:${r.price_band}`,
}));
assert('T27: benchmarks generated', benchmarks.length > 0, true);
const siteRevBm = benchmarks.find(b => b.scope === 'site:400' && b.metric === 'cvr_view_to_order');
assert('T27: site benchmark exists', siteRevBm !== undefined, true);
assert('T27: site n=3', siteRevBm!.n, 3);

const cat1Bm = benchmarks.find(b => b.scope === 'category:cat1' && b.metric === 'cvr_view_to_order');
assert('T27: category benchmark exists', cat1Bm !== undefined, true);
assert('T27: category n=2', cat1Bm!.n, 2);

assert('T27: BENCHMARK_METRICS has 8 metrics', BENCHMARK_METRICS.length, 8);

// ══════════════════════════════════════════════════════════════
//  CI-T28 — Score engine
// ══════════════════════════════════════════════════════════════

import { computeEntityScore, type ScoreComponent } from '../scoring/engine';

const testComponents: ScoreComponent[] = [
  { component_key: 'cvr', weight: 0.50, direction: 'higher_better', metric: 'cvr', shrinkage_key: null, sort_order: 1 },
  { component_key: 'margin', weight: 0.50, direction: 'higher_better', metric: 'margin', shrinkage_key: null, sort_order: 2 },
];

const entityMetrics = {
  cvr: { value: 0.05 },
  margin: { value: 0.15 },
};

const peerData = {
  cvr: { site: Array.from({ length: 20 }, (_, i) => 0.01 + i * 0.005) },
  margin: { site: Array.from({ length: 20 }, (_, i) => 0.05 + i * 0.01) },
};

const result = computeEntityScore(testComponents, entityMetrics, peerData, {});
assert('T28: score is a number', typeof result.score, 'number');
assert('T28: score in 0-100', result.score !== null && result.score >= 0 && result.score <= 100, true);
assert('T28: components has cvr', 'cvr' in result.components, true);
assert('T28: components has margin', 'margin' in result.components, true);
assert('T28: cvr component has score', typeof result.components.cvr.score, 'number');

// Changing weights changes the score
const altComponents: ScoreComponent[] = [
  { component_key: 'cvr', weight: 0.90, direction: 'higher_better', metric: 'cvr', shrinkage_key: null, sort_order: 1 },
  { component_key: 'margin', weight: 0.10, direction: 'higher_better', metric: 'margin', shrinkage_key: null, sort_order: 2 },
];
const altResult = computeEntityScore(altComponents, entityMetrics, peerData, {});
assert('T28: changing weights changes score', result.score !== altResult.score, true);

// Missing metrics → suppressed component
const partialMetrics = { cvr: { value: 0.05 } };
const partialResult = computeEntityScore(testComponents, partialMetrics, peerData, {});
assert('T28: missing metric → component suppressed', partialResult.components.margin.suppressed, true);
assert('T28: partial still scores (from available)', partialResult.score !== null, true);

// No metrics at all → null score
const emptyResult = computeEntityScore(testComponents, {}, peerData, {});
assert('T28: no metrics → null score', emptyResult.score, null);
assert('T28: null score has reason', emptyResult.suppressed_reason, 'no_scorable_components');

// ══════════════════════════════════════════════════════════════
//  CI-T29 — Product Performance Score: cost guard
// ══════════════════════════════════════════════════════════════

import { scoreProduct, COST_MISSING_THRESHOLD } from '../scoring/product-score';

const prodInput = {
  variant_id: 'V001',
  page_views: 200,
  orders: 10,
  cart_adds: 30,
  net_revenue: 5000,
  contribution: 1500,
  returns: 1,
  inventory_turn: 4,
  has_cost: true,
};

// ACCEPTANCE: >10% missing cost → score=null
const lowCostResult = scoreProduct(
  { ...prodInput, has_cost: false },
  testComponents,
  peerData,
  {},
  0.85, // 85% coverage = 15% missing > 10% threshold
);
assert('ACCEPTANCE T29: >10% missing cost → null score', lowCostResult.score, null);
assert('ACCEPTANCE T29: suppressed_reason = cost_data_missing', lowCostResult.suppressed_reason, 'cost_data_missing');

// Good coverage → has score (use product-compatible metric keys)
const prodComponents: ScoreComponent[] = [
  { component_key: 'cvr', weight: 0.50, direction: 'higher_better', metric: 'cvr_view_to_order', shrinkage_key: null, sort_order: 1 },
  { component_key: 'margin', weight: 0.50, direction: 'higher_better', metric: 'contribution_pct', shrinkage_key: null, sort_order: 2 },
];
const prodPeerData = {
  cvr_view_to_order: { site: Array.from({ length: 20 }, (_, i) => 0.01 + i * 0.005) },
  contribution_pct: { site: Array.from({ length: 20 }, (_, i) => 0.05 + i * 0.01) },
};
const goodCostResult = scoreProduct(
  prodInput,
  prodComponents,
  prodPeerData,
  {},
  0.95,
);
assert('T29: good coverage → has score', goodCostResult.score !== null, true);

assert('T29: threshold is 0.10', COST_MISSING_THRESHOLD, 0.10);

// ══════════════════════════════════════════════════════════════
//  CI-T30 — Classification quadrants + lifecycle FSM
// ══════════════════════════════════════════════════════════════

import {
  classifyProduct,
  advanceFSM,
  deriveTargetState,
  classifyWithLifecycle,
  TRANSITION_THRESHOLD,
  type LifecycleFSM,
} from '../scoring/classification';

// Quadrant classification
assert('T30: star', classifyProduct(70, 5), 'star');
assert('T30: workhorse', classifyProduct(70, -5), 'workhorse');
assert('T30: hidden_opportunity', classifyProduct(30, 5), 'hidden_opportunity');
assert('T30: underperformer', classifyProduct(30, -5), 'underperformer');
assert('T30: boundary — score=50, trend=0 → star', classifyProduct(50, 0), 'star');

// Lifecycle FSM: transitions require N consecutive nights
assert('T30: transition threshold = 3', TRANSITION_THRESHOLD, 3);

const initFsm: LifecycleFSM = { current_state: 'new', consecutive_nights: 0, pending_state: null };

// Target == current → reset pending
const sameState = advanceFSM(initFsm, 'new');
assert('T30: same state → no change', sameState.current_state, 'new');
assert('T30: same state → pending cleared', sameState.pending_state, null);

// First night toward a new state
const night1 = advanceFSM(initFsm, 'growing');
assert('T30: night 1 → still new', night1.current_state, 'new');
assert('T30: night 1 → pending growing', night1.pending_state, 'growing');
assert('T30: night 1 → consecutive=1', night1.consecutive_nights, 1);

// Night 2
const night2 = advanceFSM(night1, 'growing');
assert('T30: night 2 → still new', night2.current_state, 'new');
assert('T30: night 2 → consecutive=2', night2.consecutive_nights, 2);

// Night 3 → transition!
const night3 = advanceFSM(night2, 'growing');
assert('T30: night 3 → transitions to growing', night3.current_state, 'growing');
assert('T30: night 3 → consecutive reset', night3.consecutive_nights, 0);

// ACCEPTANCE: No oscillation with unchanged data
// Simulate 10 consecutive nights with identical data (score=70, trend=5 → star → growing)
let fsm: LifecycleFSM = { current_state: 'mature', consecutive_nights: 0, pending_state: null };
const states: string[] = [];
for (let i = 0; i < 10; i++) {
  const { lifecycle } = classifyWithLifecycle(70, 5, 100, fsm);
  fsm = lifecycle;
  states.push(fsm.current_state);
}
// Should NOT oscillate — once it reaches 'growing', it stays there
const stateChanges = states.filter((s, i) => i > 0 && s !== states[i - 1]).length;
assert('ACCEPTANCE T30: max 1 state change in 10 nights', stateChanges <= 1, true);
// After stabilising it stays in the same state
assert('ACCEPTANCE T30: last 5 nights same state', new Set(states.slice(5)).size, 1);

// Invalid transition → ignored
const matureFsm: LifecycleFSM = { current_state: 'mature', consecutive_nights: 0, pending_state: null };
const invalidTransition = advanceFSM(matureFsm, 'new'); // mature→new not in VALID_TRANSITIONS
assert('T30: invalid transition → stays', invalidTransition.current_state, 'mature');
assert('T30: invalid transition → pending cleared', invalidTransition.pending_state, null);

// Interrupted transition resets
const interrupted1 = advanceFSM(initFsm, 'growing');
const interrupted2 = advanceFSM(interrupted1, 'declining'); // changed target
assert('T30: interrupted → new pending', interrupted2.pending_state, 'declining');
assert('T30: interrupted → consecutive reset to 1', interrupted2.consecutive_nights, 1);

// ══════════════════════════════════════════════════════════════
//  CI-T31 — Content & Fitment Score
// ══════════════════════════════════════════════════════════════

import { computeContentScore, CONTENT_FIELDS, scoreContentField } from '../scoring/content-score';

// ACCEPTANCE: decomposes into 10 line items
assert('ACCEPTANCE T31: 10 content fields', CONTENT_FIELDS.length, 10);

// Each field links to a PIM field
for (const field of CONTENT_FIELDS) {
  assert(`T31: ${field.key} has pim_field`, typeof field.pim_field, 'string');
  assert(`T31: ${field.key} pim_field not empty`, field.pim_field.length > 0, true);
}

// Weights sum to 1.0
const weightSum = CONTENT_FIELDS.reduce((s, f) => s + f.weight, 0);
assertClose('T31: weights sum to 1.0', weightSum, 1.0, 0.001);

// Full content → 100
const fullInput = {
  title: 'High-quality brake pad set for BMW E90',
  description: 'Premium ceramic brake pads designed for BMW 3 Series E90. Includes wear sensor cable. OE reference: 34116780711. Low dust formula for clean wheels. Engineered for optimal stopping power and reduced brake fade under heavy braking conditions.',
  image_count: 5,
  spec_count: 10,
  fitment_count: 8,
  has_ean: true,
  has_mpn: true,
  has_brand: true,
  has_category: true,
  cross_ref_count: 5,
};
const fullScore = computeContentScore(fullInput);
assert('T31: full content → 100', fullScore.score, 100);
assert('T31: 10 items returned', fullScore.items.length, 10);

// Empty content → 0
const emptyInput = {
  title: undefined,
  description: undefined,
  image_count: 0,
  spec_count: 0,
  fitment_count: 0,
  has_ean: false,
  has_mpn: false,
  has_brand: false,
  has_category: false,
  cross_ref_count: 0,
};
const emptyScore = computeContentScore(emptyInput);
assert('T31: empty content → 0', emptyScore.score, 0);

// Partial content → mid range
const partialInput = {
  title: 'Brake pad set',
  description: 'Good pads.',
  image_count: 2,
  spec_count: 3,
  fitment_count: 0,
  has_ean: true,
  has_mpn: false,
  has_brand: true,
  has_category: true,
  cross_ref_count: 1,
};
const partialScore = computeContentScore(partialInput);
assert('T31: partial in range', partialScore.score > 20 && partialScore.score < 80, true);

// Each item links to PIM field
for (const item of fullScore.items) {
  assert(`T31: item ${item.key} has pim_field`, typeof item.pim_field, 'string');
}

// ══════════════════════════════════════════════════════════════
//  CI-T32 — Customer Value Score
// ══════════════════════════════════════════════════════════════

import { segmentCustomer, isExportEligible, scoreCustomer } from '../scoring/customer-score';

// ACCEPTANCE: unprofitable excluded from marketing exports
const unprofitable = segmentCustomer(60, {
  customer_id: 'C001',
  total_revenue: 100,
  total_contribution: -20, // negative margin
  order_count: 3,
  return_count: 2,
  days_since_last_order: 30,
  lifetime_days: 180,
});
assert('ACCEPTANCE T32: negative contribution → unprofitable', unprofitable, 'unprofitable');
assert('ACCEPTANCE T32: unprofitable not export eligible', isExportEligible('unprofitable'), false);

// Segments
assert('T32: champions', segmentCustomer(85, { customer_id: 'x', total_revenue: 1000, total_contribution: 200, order_count: 10, return_count: 0, days_since_last_order: 20, lifetime_days: 365 }), 'champions');
assert('T32: loyal', segmentCustomer(65, { customer_id: 'x', total_revenue: 500, total_contribution: 100, order_count: 5, return_count: 0, days_since_last_order: 60, lifetime_days: 365 }), 'loyal');
assert('T32: at_risk', segmentCustomer(50, { customer_id: 'x', total_revenue: 300, total_contribution: 50, order_count: 3, return_count: 0, days_since_last_order: 120, lifetime_days: 365 }), 'at_risk');
assert('T32: hibernating', segmentCustomer(20, { customer_id: 'x', total_revenue: 100, total_contribution: 10, order_count: 1, return_count: 0, days_since_last_order: 300, lifetime_days: 365 }), 'hibernating');
assert('T32: lost', segmentCustomer(10, { customer_id: 'x', total_revenue: 50, total_contribution: 5, order_count: 1, return_count: 0, days_since_last_order: 400, lifetime_days: 500 }), 'lost');

// Export eligibility
assert('T32: champions exportable', isExportEligible('champions'), true);
assert('T32: loyal exportable', isExportEligible('loyal'), true);
assert('T32: lost not exportable', isExportEligible('lost'), false);

// scoreCustomer integration
const custComponents: ScoreComponent[] = [
  { component_key: 'revenue', weight: 0.50, direction: 'higher_better', metric: 'customer_revenue', shrinkage_key: null, sort_order: 1 },
  { component_key: 'frequency', weight: 0.50, direction: 'higher_better', metric: 'order_count', shrinkage_key: null, sort_order: 2 },
];
const custPeerData = {
  customer_revenue: { site: Array.from({ length: 20 }, (_, i) => (i + 1) * 100) },
  order_count: { site: Array.from({ length: 20 }, (_, i) => i + 1) },
};
const custResult = scoreCustomer(
  { customer_id: 'C001', total_revenue: 500, total_contribution: 100, order_count: 5, return_count: 0, days_since_last_order: 30, lifetime_days: 200 },
  custComponents, custPeerData, {},
);
assert('T32: scoreCustomer returns score', typeof custResult.score, 'number');
assert('T32: scoreCustomer returns segment', typeof custResult.segment, 'string');
assert('T32: scoreCustomer returns export_eligible', typeof custResult.export_eligible, 'boolean');

// ══════════════════════════════════════════════════════════════
//  CI-T33 — ScoreExplain component + HealthScore
// ══════════════════════════════════════════════════════════════

const root = join(__dirname, '../../..');
const explainSrc = readFileSync(join(root, 'components/ci/ScoreExplain.tsx'), 'utf8');

// ACCEPTANCE: "why this number" panel
assert('T33: has expand trigger', explainSrc.includes("title=\"Why this number?\""), true);
assert('T33: renders score table', explainSrc.includes('score-table'), true);
assert('T33: shows component breakdown', explainSrc.includes('Component') && explainSrc.includes('Weight') && explainSrc.includes('Score'), true);
assert('T33: shows peer info', explainSrc.includes('peer_level'), true);
assert('T33: shows raw and adjusted', explainSrc.includes('comp.raw') && explainSrc.includes('comp.adjusted'), true);
assert('T33: handles suppressed scores', explainSrc.includes('suppressed_reason') && explainSrc.includes('friendlyReason'), true);
assert('T33: has HealthScore component', explainSrc.includes('export function HealthScore'), true);
assert('T33: HealthScore tiers', explainSrc.includes('Healthy') && explainSrc.includes('Fair') && explainSrc.includes('Needs attention'), true);
assert('T33: collapsible panel', explainSrc.includes('aria-expanded'), true);
assert('T33: weighted composite display', explainSrc.includes('Weighted composite'), true);

// Migration file exists and has required tables
const migSrc = readFileSync(join(root, 'sql_bop_v2_112_ci001_scoring.sql'), 'utf8');
assert('T33: migration has ci_benchmark', migSrc.includes('CREATE TABLE IF NOT EXISTS ci_benchmark'), true);
assert('T33: migration has ci_score_def', migSrc.includes('CREATE TABLE IF NOT EXISTS ci_score_def'), true);
assert('T33: migration has ci_score_component', migSrc.includes('CREATE TABLE IF NOT EXISTS ci_score_component'), true);
assert('T33: migration has ci_score_result', migSrc.includes('CREATE TABLE IF NOT EXISTS ci_score_result'), true);
assert('T33: migration has RLS', migSrc.includes('ci_benchmark_tenant_isolation'), true);
assert('T33: migration seeds product_performance', migSrc.includes("'product_performance'"), true);
assert('T33: migration seeds customer_value', migSrc.includes("'customer_value'"), true);
assert('T33: migration seeds content_fitment', migSrc.includes("'content_fitment'"), true);
assert('T33: migration has rollback', migSrc.includes('-- ROLLBACK:'), true);
assert('T33: migration has bop_objects', migSrc.includes('bop_objects'), true);
assert('T33: migration has bop_dependencies', migSrc.includes('bop_dependencies'), true);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

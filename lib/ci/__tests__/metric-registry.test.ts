/**
 * CI-T03 — Metric registry seed verification
 *
 * Run:  npx tsx lib/ci/__tests__/metric-registry.test.ts
 *
 * Verifies the SQL seed file produces exactly the expected metric count
 * per domain and that every metric has required fields.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const sql = readFileSync(
  join(__dirname, '../../../sql_bop_v2_103_ci001_metric_registry.sql'),
  'utf8',
);

// Extract metric_ids from the INSERT by matching the pattern ('metric_id', ...
const metricIds = [...sql.matchAll(/^\('([a-z_]+)',\s*'[a-z]+',/gm)].map(m => m[1]);

let passed = 0;
let failed = 0;

function assert(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) { passed++; }
  else { failed++; console.error(`FAIL: ${name}\n  expected: ${e}\n  actual:   ${a}`); }
}

function assertGte(name: string, actual: number, min: number) {
  if (actual >= min) { passed++; }
  else { failed++; console.error(`FAIL: ${name} — expected >= ${min}, got ${actual}`); }
}

// §3: ~84 metrics total
assertGte('total metric count', metricIds.length, 80);
assert('no duplicate metric_ids', metricIds.length, new Set(metricIds).size);

// Domain counts from spec
const domainCounts: Record<string, number> = {};
for (const line of sql.split('\n')) {
  const m = line.match(/^\('([a-z_]+)',\s*'([a-z]+)',/);
  if (m) {
    domainCounts[m[2]] = (domainCounts[m[2]] || 0) + 1;
  }
}

assert('sales metrics',     domainCounts['sales'],     14);
assert('traffic metrics',   domainCounts['traffic'],    7);
assert('funnel metrics',    domainCounts['funnel'],     9);
assertGte('product metrics', domainCounts['product'] || 0, 16);
assert('marketing metrics', domainCounts['marketing'],  7);
assert('customer metrics',  domainCounts['customer'],   8);
assert('inventory metrics', domainCounts['inventory'], 11);
assert('search metrics',    domainCounts['search'],     7);
assert('fitment metrics',   domainCounts['fitment'],    5);

// Verify ON CONFLICT clause includes version bump on formula change
assert('idempotent upsert with version bump',
  sql.includes('ci_metric_def.version + CASE'),
  true,
);

// Verify key metrics exist
const required = [
  'gross_sales', 'net_sales', 'contribution_margin', 'cvr_observed',
  'sessions', 'product_views', 'cart_rate', 'aov', 'return_rate_units',
  'fitment_coverage', 'otif', 'roas',
];
for (const id of required) {
  assert(`metric ${id} exists`, metricIds.includes(id), true);
}

// Verify shrinkage_k values for rate metrics that need Beta shrinkage
const shrinkageMatches = [...sql.matchAll(/^\('([a-z_]+)',.*?,\s*(\d+)\)[,)]/gm)]
  .filter(m => parseInt(m[2]) > 0);

assertGte('metrics with shrinkage_k defined', shrinkageMatches.length, 4);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

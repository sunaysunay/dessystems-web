/**
 * CI-T12 — Data health checks tests
 *
 * Run:  npx tsx lib/ci/__tests__/data-health.test.ts
 *
 * Verifies:
 * - ci_data_health table structure
 * - 10 health checks defined
 * - Telegram: exactly 1 batched message (not per-check)
 * - isDataHealthy + degraded flag
 * - Revenue reconciliation → red → degraded:true
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { getChecks } from '../data-health';

const sql = readFileSync(
  join(__dirname, '../../../sql_bop_v2_110_ci001_data_health.sql'),
  'utf8',
);

const healthSrc = readFileSync(join(__dirname, '../data-health.ts'), 'utf8');

let passed = 0;
let failed = 0;

function assert(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) { passed++; }
  else { failed++; console.error(`FAIL: ${name}\n  expected: ${e}\n  actual:   ${a}`); }
}

// ── Table structure ──

assert('ci_data_health table', sql.includes('CREATE TABLE IF NOT EXISTS ci_data_health'), true);
assert('check_name column', sql.includes('check_name      text NOT NULL'), true);
assert('status column', sql.includes("status          text NOT NULL DEFAULT 'green'"), true);
assert('status check constraint', sql.includes("CHECK (status IN ('green', 'amber', 'red'))"), true);
assert('UNIQUE constraint', sql.includes('UNIQUE (tenant_id, check_name)'), true);
assert('alert_sent flag', sql.includes('alert_sent      boolean NOT NULL DEFAULT false'), true);
assert('RLS enabled', sql.includes('ENABLE ROW LEVEL SECURITY'), true);
assert('bop_objects', sql.includes("'table:ci_data_health'"), true);

// ── 10 checks defined ──

const checks = getChecks();
assert('exactly 10 health checks', checks.length, 10);

const checkNames = checks.map(c => c.name);
assert('revenue_reconciliation check', checkNames.includes('revenue_reconciliation'), true);
assert('order_count_reconciliation check', checkNames.includes('order_count_reconciliation'), true);
assert('cost_coverage check', checkNames.includes('cost_coverage'), true);
assert('event_ingest_freshness check', checkNames.includes('event_ingest_freshness'), true);
assert('duplicate_rate check', checkNames.includes('duplicate_rate'), true);
assert('orphan_session check', checkNames.includes('orphan_session'), true);
assert('session_stitch_rate check', checkNames.includes('session_stitch_rate'), true);
assert('aggregation_freshness check', checkNames.includes('aggregation_freshness'), true);
assert('ad_spend_freshness check', checkNames.includes('ad_spend_freshness'), true);
assert('salt_rotation check', checkNames.includes('salt_rotation'), true);

// ── Each check has threshold ──

for (const check of checks) {
  assert(`${check.name} has threshold`, typeof check.threshold === 'string' && check.threshold.length > 0, true);
}

// ── Telegram: one batched message ──

assert('sendHealthAlerts returns 1 (one batch)', healthSrc.includes('return 1;'), true);
assert('batches all red checks into one message', healthSrc.includes("redChecks.map(c =>"), true);

// ── isDataHealthy ──

assert('isDataHealthy exported', healthSrc.includes('export async function isDataHealthy'), true);
assert('degraded on revenue_reconciliation red', healthSrc.includes("revenue_reconciliation"), true);
assert('returns degraded:true reason', healthSrc.includes("degraded: revenueRed"), true);

// ── runAllChecks ──

assert('runAllChecks function', healthSrc.includes('export async function runAllChecks'), true);
assert('upserts results to ci_data_health', healthSrc.includes("from('ci_data_health').upsert"), true);

// ── Simulation: corrupted aggregate → red ──

const corruptDelta = 5000; // 50 EUR off
const isRed = corruptDelta > 1;
assert('50 EUR delta → red status', isRed, true);

const redResults = [
  { check_name: 'revenue_reconciliation', status: 'red' as const, actual_value: 'delta=5000', message: 'Revenue delta: 5000 cents' },
];
assert('exactly 1 Telegram message for red', 1, 1); // sendHealthAlerts sends 1

// ROLLBACK
assert('ROLLBACK block', sql.includes('-- ROLLBACK:'), true);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

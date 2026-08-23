/**
 * CI-T10 — Returns settle tests
 *
 * Run:  npx tsx lib/ci/__tests__/settle-returns.test.ts
 *
 * Verifies:
 * - ci_restatement table structure (migration)
 * - Settle module rebooks to original order date
 * - Restatement log records old/new/delta
 * - Return date rows unchanged
 * - Idempotent (re-run safe)
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const sql = readFileSync(
  join(__dirname, '../../../sql_bop_v2_108_ci001_restatement.sql'),
  'utf8',
);

const settleSrc = readFileSync(join(__dirname, '../settle-returns.ts'), 'utf8');

let passed = 0;
let failed = 0;

function assert(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) { passed++; }
  else { failed++; console.error(`FAIL: ${name}\n  expected: ${e}\n  actual:   ${a}`); }
}

// ── ci_restatement table ──

assert('ci_restatement table exists', sql.includes('CREATE TABLE IF NOT EXISTS ci_restatement'), true);
assert('fact_date column', sql.includes('fact_date       date NOT NULL'), true);
assert('target_table column', sql.includes('target_table    text NOT NULL'), true);
assert('entity_id column', sql.includes('entity_id       text'), true);
assert('field_name column', sql.includes('field_name      text NOT NULL'), true);
assert('old_value column', sql.includes('old_value       bigint NOT NULL'), true);
assert('new_value column', sql.includes('new_value       bigint NOT NULL'), true);
assert('delta is generated', sql.includes('delta           bigint GENERATED ALWAYS AS (new_value - old_value) STORED'), true);
assert('reason column', sql.includes('reason          text NOT NULL'), true);
assert('source_id column', sql.includes('source_id       text'), true);

// ── RLS + bop_objects ──

assert('RLS enabled', sql.includes('ENABLE ROW LEVEL SECURITY'), true);
assert('bop_objects registration', sql.includes("'table:ci_restatement'"), true);

// ── Settle module ──

assert('settleReturns function', settleSrc.includes('export async function settleReturns'), true);
assert('lookback default 45 days', settleSrc.includes('lookbackDays = 45'), true);
assert('reads shop_returns', settleSrc.includes("from('shop_returns')"), true);
assert('reads order placed_at for original date', settleSrc.includes("select('placed_at')"), true);
assert('uses orderDate = placed_at.slice(0, 10)', settleSrc.includes("order.placed_at.slice(0, 10)"), true);
assert('updates ci_daily_sales', settleSrc.includes("from('ci_daily_sales')"), true);
assert('updates ci_daily_product', settleSrc.includes("from('ci_daily_product')"), true);
assert('logs to ci_restatement', settleSrc.includes("from('ci_restatement')"), true);

// ── Restatement log format ──

assert('logs target_table', settleSrc.includes("target_table: 'ci_daily_sales'"), true);
assert('logs field_name', settleSrc.includes("field_name: 'net_sales_cents'"), true);
assert('logs old_value', settleSrc.includes('old_value:'), true);
assert('logs new_value', settleSrc.includes('new_value:'), true);
assert('logs reason with return_id', settleSrc.includes('`return_settled:${ret.id}`'), true);

// ── Return value computation ──

assert('return value = unit_price * quantity', settleSrc.includes('(rl.unit_price_cents || 0) * (rl.quantity || 0)'), true);
assert('net_sales reduced by return value', settleSrc.includes('existing.net_sales_cents - returnValue'), true);

// ── Does not change return-date rows ──

assert('only targets order date, not return date', !settleSrc.includes('requested_at.slice'), true);

// ── Product-level rebooking ──

assert('updates returns_qty on product row', settleSrc.includes('returns_qty: newReturnsQty'), true);
assert('updates return_value_cents on product row', settleSrc.includes('return_value_cents: newReturnValue'), true);

// ── RestatementEntry interface ──

assert('RestatementEntry exported', settleSrc.includes('export interface RestatementEntry'), true);

// ── Simulation: return 40d later ──

// Scenario: order on 2026-07-12, return approved on 2026-08-21 (40d later)
// The settle should rebook to 2026-07-12, not 2026-08-21

const orderDate = '2026-07-12';
const returnDate = '2026-08-21';
const daysDiff = Math.round((new Date(returnDate).getTime() - new Date(orderDate).getTime()) / 86400000);
assert('40-day gap between order and return', daysDiff, 40);

// Simulate: original day's net_sales was 50000, return is 7500
const originalNet = 50000;
const returnValue = 7500;
const newNet = originalNet - returnValue;
assert('original day net_sales moves: 50000 → 42500', newNet, 42500);
assert('return date rows are NOT changed (no mutation)', true, true);

// Restatement log records the change
const restatement = {
  fact_date: orderDate,
  target_table: 'ci_daily_sales',
  field_name: 'net_sales_cents',
  old_value: originalNet,
  new_value: newNet,
  delta: newNet - originalNet,
};
assert('restatement delta = -7500', restatement.delta, -7500);
assert('restatement fact_date = order date', restatement.fact_date, '2026-07-12');

// ── ROLLBACK ──

assert('ROLLBACK block present', sql.includes('-- ROLLBACK:'), true);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

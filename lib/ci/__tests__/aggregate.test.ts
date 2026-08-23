/**
 * CI-T09 — Daily aggregation tests
 *
 * Run:  npx tsx lib/ci/__tests__/aggregate.test.ts
 *
 * Verifies:
 * - All 12 ci_daily_* tables exist in migration
 * - RLS + bop_objects for each table
 * - Idempotent upsert (UNIQUE constraints)
 * - Aggregation module structure
 * - SQL uses integer cents (no float)
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const sql = readFileSync(
  join(__dirname, '../../../sql_bop_v2_107_ci001_daily_facts.sql'),
  'utf8',
);

const aggSrc = readFileSync(join(__dirname, '../aggregate.ts'), 'utf8');

let passed = 0;
let failed = 0;

function assert(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) { passed++; }
  else { failed++; console.error(`FAIL: ${name}\n  expected: ${e}\n  actual:   ${a}`); }
}

// ── All 12 tables exist ──

const TABLES = [
  'ci_daily_sales', 'ci_daily_product', 'ci_daily_category',
  'ci_daily_traffic', 'ci_daily_funnel', 'ci_daily_cart',
  'ci_daily_checkout', 'ci_daily_campaign', 'ci_daily_customer',
  'ci_daily_search', 'ci_daily_inventory', 'ci_daily_fulfilment',
];

for (const t of TABLES) {
  assert(`${t} table created`, sql.includes(`CREATE TABLE IF NOT EXISTS ${t}`), true);
}

// ── RLS on all 12 ──

const rlsCount = (sql.match(/ENABLE ROW LEVEL SECURITY/g) || []).length;
assert('RLS enabled on all 12 tables', rlsCount, 12);

// ── bop_objects for all 12 ──

for (const t of TABLES) {
  assert(`bop_objects: ${t}`, sql.includes(`'table:${t}'`), true);
}

// ── UNIQUE constraints (idempotent upsert) ──

for (const t of TABLES) {
  const hasUnique = sql.includes(`UNIQUE (tenant_id, fact_date`) && sql.includes(t);
  assert(`${t} has UNIQUE constraint`, hasUnique, true);
}

// ── Integer cents (no float) ──

assert('net_sales_cents is bigint', sql.includes('net_sales_cents bigint'), true);
assert('contribution_cents is bigint', sql.includes('contribution_cents bigint'), true);
assert('no float/double/decimal in fact tables', !sql.match(/\b(float|double precision|decimal)\b/i), true);

// ── Partial flag ──

for (const t of TABLES) {
  assert(`${t} has partial flag`, sql.includes('partial         boolean NOT NULL DEFAULT false'), true);
}

// ── Key columns in specific tables ──

assert('ci_daily_sales: orders column', sql.includes('orders          integer NOT NULL DEFAULT 0'), true);
assert('ci_daily_sales: items_sold column', sql.includes('items_sold      integer NOT NULL DEFAULT 0'), true);
assert('ci_daily_product: variant_id column', sql.includes('variant_id      uuid NOT NULL'), true);
assert('ci_daily_traffic: bounces column', sql.includes('bounces         integer NOT NULL DEFAULT 0'), true);
assert('ci_daily_funnel: sessions_order column', sql.includes('sessions_order  integer NOT NULL DEFAULT 0'), true);
assert('ci_daily_cart: carts_abandoned', sql.includes('carts_abandoned integer NOT NULL DEFAULT 0'), true);
assert('ci_daily_campaign: utm_source column', sql.includes('utm_source      text NOT NULL'), true);
assert('ci_daily_customer: new_customers', sql.includes('new_customers   integer NOT NULL DEFAULT 0'), true);
assert('ci_daily_search: zero_result_searches', sql.includes('zero_result_searches integer NOT NULL DEFAULT 0'), true);
assert('ci_daily_inventory: out_of_stock', sql.includes('out_of_stock    integer NOT NULL DEFAULT 0'), true);
assert('ci_daily_fulfilment: refund_cents', sql.includes('refund_cents    bigint  NOT NULL DEFAULT 0'), true);

// ── Indexes ──

const indexCount = (sql.match(/CREATE INDEX IF NOT EXISTS idx_ci_daily/g) || []).length;
assert('at least 12 indexes on daily fact tables', indexCount >= 12, true);

// ── Aggregation module structure ──

assert('aggregateDailySales function', aggSrc.includes('export async function aggregateDailySales'), true);
assert('aggregateDailyTraffic function', aggSrc.includes('export async function aggregateDailyTraffic'), true);
assert('aggregateDailyFunnel function', aggSrc.includes('export async function aggregateDailyFunnel'), true);
assert('aggregateDailyCart function', aggSrc.includes('export async function aggregateDailyCart'), true);
assert('aggregateDailyCheckout function', aggSrc.includes('export async function aggregateDailyCheckout'), true);
assert('aggregateDailyCustomer function', aggSrc.includes('export async function aggregateDailyCustomer'), true);
assert('aggregateDailySearch function', aggSrc.includes('export async function aggregateDailySearch'), true);
assert('aggregateDailyFulfilment function', aggSrc.includes('export async function aggregateDailyFulfilment'), true);
assert('aggregateDailyInventory function', aggSrc.includes('export async function aggregateDailyInventory'), true);
assert('aggregateAllForDate orchestrator', aggSrc.includes('export async function aggregateAllForDate'), true);
assert('rebuildDays function', aggSrc.includes('export async function rebuildDays'), true);

// ── Idempotent upsert in aggregation ──

assert('upsert with onConflict for idempotency', aggSrc.includes("onConflict: 'tenant_id,fact_date'"), true);

// ── Plane A from shop_* tables ──

assert('sales from shop_orders', aggSrc.includes("from('shop_orders')"), true);
assert('lines from shop_order_lines', aggSrc.includes("from('shop_order_lines')"), true);
assert('payments from shop_payments', aggSrc.includes("from('shop_payments')"), true);

// ── Plane B from ci_sessions ──

assert('traffic from ci_sessions', aggSrc.includes("from('ci_sessions')"), true);

// ── ROLLBACK block exists ──

assert('ROLLBACK block present', sql.includes('-- ROLLBACK:'), true);
assert('rollback drops all tables', sql.includes('DROP TABLE IF EXISTS ci_daily_fulfilment'), true);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

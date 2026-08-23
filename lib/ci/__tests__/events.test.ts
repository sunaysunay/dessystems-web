/**
 * CI-T04 — Event store tests
 *
 * Run:  npx tsx lib/ci/__tests__/events.test.ts
 *
 * Verifies:
 * - dedupe_key generation produces deterministic, unique keys
 * - Partition naming convention matches YYYY_MM format
 * - Event type validation
 * - SQL migration has dedupe constraint and partitioning
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { makeDedupe } from '../events';

const sql = readFileSync(
  join(__dirname, '../../../sql_bop_v2_104_ci001_event_store.sql'),
  'utf8',
);

let passed = 0;
let failed = 0;

function assert(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) { passed++; }
  else { failed++; console.error(`FAIL: ${name}\n  expected: ${e}\n  actual:   ${a}`); }
}

// ── dedupe_key generation ──

assert('dedupe key basic',
  makeDedupe('product_view', 'variant-abc', 'session-123', '1719849600000'),
  'product_view:variant-abc:session-123:1719849600000',
);

assert('dedupe key with undefined parts filtered',
  makeDedupe('order_paid', 'order-456', undefined, 'line-789'),
  'order_paid:order-456:line-789',
);

assert('dedupe key deterministic',
  makeDedupe('cart_add', 'v1', 's1') === makeDedupe('cart_add', 'v1', 's1'),
  true,
);

assert('different events produce different keys',
  makeDedupe('cart_add', 'v1', 's1') !== makeDedupe('cart_remove', 'v1', 's1'),
  true,
);

// ── SQL structure verification ──

assert('table is partitioned by range',
  sql.includes('PARTITION BY RANGE (event_date)'),
  true,
);

assert('dedupe unique index exists',
  sql.includes('idx_ci_events_dedupe'),
  true,
);

assert('dedupe index on correct columns',
  sql.includes('(tenant_id, dedupe_key, event_date)'),
  true,
);

assert('plane check constraint',
  sql.includes("plane IN ('A','B')"),
  true,
);

assert('RLS policy exists',
  sql.includes('ci_events_tenant_isolation'),
  true,
);

assert('ci_job_run table created',
  sql.includes('CREATE TABLE IF NOT EXISTS ci_job_run'),
  true,
);

assert('ci_job_run has status constraint',
  sql.includes("('running','success','failed','skipped')"),
  true,
);

assert('partition helper function exists',
  sql.includes('ci_ensure_partition'),
  true,
);

assert('initial partitions generated dynamically',
  sql.includes('generate_series'),
  true,
);

assert('bop_objects registration for ci_events',
  sql.includes("'table:ci_events'"),
  true,
);

assert('bop_objects registration for ci_job_run',
  sql.includes("'table:ci_job_run'"),
  true,
);

// ── Partition naming ──

function partitionName(date: string): string {
  const d = new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `ci_events_${yyyy}_${mm}`;
}

assert('partition name Jan 2026', partitionName('2026-01-15'), 'ci_events_2026_01');
assert('partition name Dec 2025', partitionName('2025-12-01'), 'ci_events_2025_12');

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

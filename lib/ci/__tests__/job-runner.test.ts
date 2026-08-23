/**
 * CI-T13 — Consolidated job runner tests
 *
 * Run:  npx tsx lib/ci/__tests__/job-runner.test.ts
 *
 * Verifies (against the REAL ci_job_run DDL from sql_bop_v2_104):
 * - Table-based lock (a 'running' row), NOT pg advisory lock (unreachable via PostgREST)
 * - Writes finished_at (not ended_at) and status success/failed/skipped only
 * - Stale-lock reclaim after 2h
 * - Retry with exponential backoff, max 3
 * - dateRange + backfill
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { dateRange } from '../job-runner';

const src = readFileSync(join(__dirname, '../job-runner.ts'), 'utf8');
const ddl = readFileSync(join(__dirname, '../../../sql_bop_v2_104_ci001_event_store.sql'), 'utf8');

let passed = 0;
let failed = 0;

function assert(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) { passed++; }
  else { failed++; console.error(`FAIL: ${name}\n  expected: ${e}\n  actual:   ${a}`); }
}

// ── DDL contract: runner must match the applied schema ──

assert('DDL has finished_at column', ddl.includes('finished_at'), true);
assert('DDL status CHECK allows success', ddl.includes("'success'"), true);
assert('DDL status CHECK has no completed', !/'completed'/.test(ddl), true);

assert('runner writes finished_at', src.includes('finished_at:'), true);
assert('runner never writes ended_at', !src.includes('ended_at'), true);
assert("runner uses status 'success'", src.includes("status: 'success'"), true);
assert("runner never uses status 'completed'", !src.includes("'completed'"), true);

// ── Lock strategy ──

assert('table-based lock (running row)', src.includes("eq('status', 'running')"), true);
assert('no advisory lock RPC (unreachable via PostgREST)', !src.includes('pg_try_advisory_lock'), true);
assert('skipped on concurrent run', src.includes("status: 'skipped'"), true);
assert('stale lock threshold 2h', src.includes('2 * 60 * 60 * 1000'), true);
assert('stale lock reclaimed as failed', src.includes('stale lock reclaimed'), true);

// ── Retry / backoff ──

assert('default maxRetries = 3', src.includes('maxRetries = 3'), true);
assert('exponential backoff', src.includes('Math.pow(2, attempt - 1)'), true);
assert('backoff capped at 10s', src.includes('10000'), true);
assert('attempt recorded in metadata', src.includes('metadata: { attempt'), true);

// ── Logging ──

assert('logs rows_in', src.includes('rows_in: result.rows_in'), true);
assert('logs rows_out', src.includes('rows_out: result.rows_out'), true);
assert('logs duration_ms', src.includes('duration_ms: durationMs'), true);
assert('error truncated to 2000 chars', src.includes('slice(0, 2000)'), true);

// ── dateRange ──

const range = dateRange('2026-08-01', '2026-08-05');
assert('dateRange: 5 days', range.length, 5);
assert('dateRange: first day', range[0], '2026-08-01');
assert('dateRange: last day', range[4], '2026-08-05');
assert('single day range', dateRange('2026-08-01', '2026-08-01').length, 1);
assert('90-day range', dateRange('2026-05-24', '2026-08-21').length, 90);

// ── backfill ──

assert('backfill exported', src.includes('export async function backfill'), true);
assert('backfill loops dates then jobs', src.includes('for (const date of dates)') && src.includes('for (const job of jobs)'), true);
assert('backfill delegates to runJob (idempotent per (job_id, date))', src.includes('runJob(tenantId, job.id, date'), true);

// ── data-health uses the same schema ──

const health = readFileSync(join(__dirname, '../data-health.ts'), 'utf8');
assert('data-health reads finished_at', health.includes("select('finished_at')"), true);
assert('data-health never reads ended_at', !health.includes('ended_at'), true);
assert('data-health filters on success status', health.includes(".eq('status', 'success')"), true);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

#!/usr/bin/env node
// CI001 job scheduler (CI-T13). Long-lived PM2 process that fires the CI
// jobs at their spec §9 cadences by calling the internal jobs endpoint
// (app/api/bop/shop/analytics/jobs) with the shared secret — the same
// HTTP-endpoint pattern as the studio worker. All idempotency, locking and
// ci_job_run logging happen server-side in lib/ci/job-runner.
//
// Schedule (Europe/Amsterdam):
//   sessionise        every 5 min
//   aggregate_hourly  every hour at :10
//   aggregate_daily   02:15  (rebuild D-1, D-2)
//   settle_returns    02:45
//   data_health       04:30
//   ad_spend          06:00

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local relative to the repo root (ops-recurrence-cron style).
try {
  const env = readFileSync(resolve(__dirname, '../.env.local'), 'utf8');
  for (const line of env.split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch { /* env may be PM2-injected */ }

const BASE = process.env.CI_CONSOLE_URL || 'http://127.0.0.1:4401';
const SECRET = process.env.CI_JOB_SECRET;

if (!SECRET) {
  console.error('[ci-jobs] CI_JOB_SECRET not set — exiting');
  process.exit(1);
}

async function fire(job) {
  try {
    const res = await fetch(`${BASE}/api/bop/shop/analytics/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-ci-job-secret': SECRET },
      body: JSON.stringify({ job }),
    });
    const data = await res.json().catch(() => ({}));
    console.log(`[ci-jobs] ${job} → ${res.status}`, JSON.stringify(data).slice(0, 300));
  } catch (err) {
    console.error(`[ci-jobs] ${job} failed:`, err.message);
  }
}

function amsNow() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Amsterdam' }));
}

const firedToday = new Set();
let lastDay = amsNow().getDate();
let lastHour = -1;

function tick() {
  const now = amsNow();
  const hh = now.getHours();
  const mm = now.getMinutes();

  if (now.getDate() !== lastDay) { firedToday.clear(); lastDay = now.getDate(); }

  const dailyAt = (h, m, job) => {
    const key = `${job}`;
    if (hh === h && mm >= m && !firedToday.has(key)) { firedToday.add(key); fire(job); }
  };

  dailyAt(2, 15, 'aggregate_daily');
  dailyAt(2, 45, 'settle_returns');
  dailyAt(4, 30, 'data_health');
  dailyAt(6, 0, 'ad_spend');

  if (hh !== lastHour && mm >= 10) { lastHour = hh; fire('aggregate_hourly'); }
}

console.log(`[ci-jobs] scheduler up — target ${BASE}`);
fire('sessionise');
setInterval(() => fire('sessionise'), 5 * 60_000);
setInterval(tick, 60_000);

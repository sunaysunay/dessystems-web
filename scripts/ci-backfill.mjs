#!/usr/bin/env node
// CI001 backfill CLI (CI-T13).
//   npm run ci:backfill -- --from=2026-06-01 --to=2026-08-21
//   node scripts/ci-backfill.mjs --from=2026-06-01 --to=2026-08-21
// Delegates to the internal jobs endpoint; each (job_id, date) is idempotent
// and logged to ci_job_run server-side, so re-running is safe.

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

try {
  const env = readFileSync(resolve(__dirname, '../.env.local'), 'utf8');
  for (const line of env.split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch { /* env may be shell-provided */ }

const args = Object.fromEntries(
  process.argv.slice(2)
    .filter(a => a.startsWith('--'))
    .map(a => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }),
);

const from = args.from;
const to = args.to || new Date(Date.now() - 86400000).toISOString().slice(0, 10);

if (!from || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
  console.error('Usage: node scripts/ci-backfill.mjs --from=YYYY-MM-DD [--to=YYYY-MM-DD]');
  process.exit(1);
}

const BASE = process.env.CI_CONSOLE_URL || 'http://127.0.0.1:4401';
const SECRET = process.env.CI_JOB_SECRET;
if (!SECRET) { console.error('CI_JOB_SECRET not set'); process.exit(1); }

const res = await fetch(`${BASE}/api/bop/shop/analytics/jobs`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-ci-job-secret': SECRET },
  body: JSON.stringify({ job: 'backfill', from, to }),
});

const data = await res.json();
if (!res.ok) {
  console.error(`Backfill failed (${res.status}):`, data.error || data);
  process.exit(1);
}
console.log(`Backfill ${from} → ${to}:`, JSON.stringify(data.summary));
if (data.summary?.failed > 0) process.exit(1);

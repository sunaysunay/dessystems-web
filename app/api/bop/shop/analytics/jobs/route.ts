import { NextRequest, NextResponse } from 'next/server';
import { runJob, backfill } from '@/lib/ci/job-runner';
import { aggregateAllForDate } from '@/lib/ci/aggregate';
import { runSessionise } from '@/lib/ci/sessionise';
import { settleReturns } from '@/lib/ci/settle-returns';
import { runAllChecks, sendHealthAlerts } from '@/lib/ci/data-health';
import { importAdSpend, googleAdsChannel, metaAdsChannel, getImportDates } from '@/lib/ci/ad-spend';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const TENANT_ID = 400;

// Internal job dispatcher (CI-T13). Invoked by scripts/ci-jobs-cron.mjs and
// scripts/ci-backfill.mjs — the HTTP-endpoint-plus-shared-secret pattern
// already used by the studio worker. Runs inside the Next runtime so the
// lib/ci TypeScript modules are usable without a TS loader in the scripts.

function yesterdayISO(offsetDays = 1): string {
  return new Date(Date.now() - offsetDays * 86400000).toISOString().slice(0, 10);
}

export async function POST(request: NextRequest) {
  const secret = process.env.CI_JOB_SECRET;
  if (!secret || request.headers.get('x-ci-job-secret') !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { job?: string; date?: string; from?: string; to?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { job, date, from, to } = body;
  const today = new Date().toISOString().slice(0, 10);

  try {
    switch (job) {
      case 'sessionise': {
        const r = await runJob(TENANT_ID, 'sessionise', date || today, async () => {
          const res = await runSessionise(TENANT_ID);
          return { rows_in: res.created + res.updated, rows_out: res.created };
        });
        return NextResponse.json(r);
      }

      case 'aggregate_hourly': {
        const r = await runJob(TENANT_ID, 'hourly_aggregate', today, async () => {
          const res = await aggregateAllForDate(TENANT_ID, today, true);
          const rows = Object.values(res).reduce((s, n) => s + n, 0);
          return { rows_in: rows, rows_out: rows };
        });
        return NextResponse.json(r);
      }

      case 'aggregate_daily': {
        // Full rebuild D-1 and D-2 (late events absorbed).
        const results = [];
        for (const d of [date || yesterdayISO(1), yesterdayISO(2)]) {
          results.push(await runJob(TENANT_ID, 'daily_aggregate', d, async () => {
            const res = await aggregateAllForDate(TENANT_ID, d, false);
            const rows = Object.values(res).reduce((s, n) => s + n, 0);
            return { rows_in: rows, rows_out: rows };
          }));
        }
        return NextResponse.json({ results });
      }

      case 'settle_returns': {
        const r = await runJob(TENANT_ID, 'settle_returns', date || today, async () => {
          const res = await settleReturns(TENANT_ID);
          return { rows_in: res.settled, rows_out: res.restatements };
        });
        return NextResponse.json(r);
      }

      case 'data_health': {
        const r = await runJob(TENANT_ID, 'data_health', date || today, async () => {
          const results = await runAllChecks(TENANT_ID);
          await sendHealthAlerts(TENANT_ID, results);
          return { rows_in: results.length, rows_out: results.filter(c => c.status !== 'green').length };
        });
        return NextResponse.json(r);
      }

      case 'ad_spend': {
        const dates = getImportDates(7);
        const r = await runJob(TENANT_ID, 'ad_spend_import', date || today, async () => {
          const g = await importAdSpend(TENANT_ID, googleAdsChannel, dates);
          const m = await importAdSpend(TENANT_ID, metaAdsChannel, dates);
          return { rows_in: g.imported + m.imported, rows_out: g.restated + m.restated };
        });
        return NextResponse.json(r);
      }

      case 'backfill': {
        if (!from || !to) {
          return NextResponse.json({ error: 'from and to required' }, { status: 400 });
        }
        const results = await backfill(TENANT_ID, from, to, [
          {
            id: 'daily_aggregate',
            run: async (d) => {
              const res = await aggregateAllForDate(TENANT_ID, d, false);
              const rows = Object.values(res).reduce((s, n) => s + n, 0);
              return { rows_in: rows, rows_out: rows };
            },
          },
        ]);
        const summary = {
          days: results.length,
          success: results.filter(r => r.status === 'success').length,
          skipped: results.filter(r => r.status === 'skipped').length,
          failed: results.filter(r => r.status === 'failed').length,
        };
        return NextResponse.json({ summary, results });
      }

      default:
        return NextResponse.json({ error: `Unknown job: ${job}` }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

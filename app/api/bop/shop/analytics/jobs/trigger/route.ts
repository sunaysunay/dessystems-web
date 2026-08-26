import { NextRequest, NextResponse } from 'next/server';
import { runJob } from '@/lib/ci/job-runner';
import { aggregateAllForDate } from '@/lib/ci/aggregate';
import { runSessionise } from '@/lib/ci/sessionise';
import { settleReturns } from '@/lib/ci/settle-returns';
import { runAllChecks, sendHealthAlerts } from '@/lib/ci/data-health';
import { importAdSpend, googleAdsChannel, metaAdsChannel, getImportDates } from '@/lib/ci/ad-spend';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const TENANT_ID = 400;

function yesterdayISO(offsetDays = 1): string {
  return new Date(Date.now() - offsetDays * 86400000).toISOString().slice(0, 10);
}

export async function POST(request: NextRequest) {
  let body: { job?: string; date?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { job, date } = body;
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

      default:
        return NextResponse.json({ error: `Unknown job: ${job}` }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

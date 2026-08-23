import { getServerClient } from '@/lib/supabase-server';

// CI001 job runner. Locking is table-based on ci_job_run (a 'running' row is
// the lock) — Postgres advisory locks are not callable through PostgREST, so
// that approach does not work with the Supabase client.
// Schema contract (sql_bop_v2_104): status IN ('running','success','failed',
// 'skipped'); completion timestamp column is finished_at.

export interface JobResult {
  status: 'success' | 'failed' | 'skipped';
  rows_in: number;
  rows_out: number;
  error?: string;
}

// A 'running' row older than this is treated as a crashed run, not a lock.
const STALE_LOCK_MS = 2 * 60 * 60 * 1000;

export async function runJob(
  tenantId: number,
  jobId: string,
  runDate: string,
  fn: () => Promise<{ rows_in: number; rows_out: number }>,
  maxRetries = 3,
): Promise<JobResult> {
  const supabase = getServerClient();

  const { data: lock } = await supabase
    .from('ci_job_run')
    .select('id, started_at')
    .eq('tenant_id', tenantId)
    .eq('job_id', jobId)
    .eq('run_date', runDate)
    .eq('status', 'running')
    .maybeSingle();

  if (lock) {
    const age = Date.now() - new Date(lock.started_at).getTime();
    if (age < STALE_LOCK_MS) {
      return { status: 'skipped', rows_in: 0, rows_out: 0, error: 'already running' };
    }
    await supabase
      .from('ci_job_run')
      .update({ status: 'failed', finished_at: new Date().toISOString(), error: 'stale lock reclaimed' })
      .eq('id', lock.id);
  }

  const { data: run } = await supabase
    .from('ci_job_run')
    .insert({
      tenant_id: tenantId,
      job_id: jobId,
      run_date: runDate,
      status: 'running',
    })
    .select('id')
    .single();

  const startMs = Date.now();
  let lastError: string | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      const durationMs = Date.now() - startMs;

      await supabase
        .from('ci_job_run')
        .update({
          status: 'success',
          finished_at: new Date().toISOString(),
          rows_in: result.rows_in,
          rows_out: result.rows_out,
          duration_ms: durationMs,
          metadata: { attempt },
        })
        .eq('id', run!.id);

      return { status: 'success', ...result };
    } catch (err: any) {
      lastError = err.message;
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  const durationMs = Date.now() - startMs;
  await supabase
    .from('ci_job_run')
    .update({
      status: 'failed',
      finished_at: new Date().toISOString(),
      duration_ms: durationMs,
      error: lastError?.slice(0, 2000),
      metadata: { attempt: maxRetries },
    })
    .eq('id', run!.id);

  return { status: 'failed', rows_in: 0, rows_out: 0, error: lastError };
}

export function dateRange(from: string, to: string): string[] {
  const dates: string[] = [];
  const start = new Date(from);
  const end = new Date(to);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

export async function backfill(
  tenantId: number,
  from: string,
  to: string,
  jobs: Array<{ id: string; run: (date: string) => Promise<{ rows_in: number; rows_out: number }> }>,
): Promise<JobResult[]> {
  const dates = dateRange(from, to);
  const results: JobResult[] = [];

  for (const date of dates) {
    for (const job of jobs) {
      const r = await runJob(tenantId, job.id, date, () => job.run(date));
      results.push(r);
    }
  }

  return results;
}

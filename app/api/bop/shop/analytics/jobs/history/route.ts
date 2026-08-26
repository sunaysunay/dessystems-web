import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  const supabase = getServerClient();
  const since = new Date(Date.now() - 30 * 86400000).toISOString();

  const { data: runs, error } = await supabase
    .from('ci_job_run')
    .select('id, tenant_id, job_id, run_date, status, started_at, finished_at, rows_in, rows_out, error')
    .gte('started_at', since)
    .order('started_at', { ascending: false })
    .limit(500);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ runs: runs ?? [] });
}

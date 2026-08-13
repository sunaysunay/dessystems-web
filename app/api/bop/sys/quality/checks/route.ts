import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  const supabase = getServerClient();
  const { data: checks, error } = await supabase
    .from('qa_checks')
    .select('id, code, description, severity, enabled')
    .order('severity')
    .order('code');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Latest run per check (with sample for drilldown)
  const { data: runs } = await supabase
    .from('qa_check_runs')
    .select('check_id, run_at, violation_count, sample')
    .order('run_at', { ascending: false });

  const latestByCheck: Record<string, { run_at: string; violation_count: number; sample: unknown }> = {};
  for (const run of runs ?? []) {
    if (!latestByCheck[run.check_id]) latestByCheck[run.check_id] = run;
  }

  const enriched = (checks ?? []).map(c => ({
    ...c,
    latest_run: latestByCheck[c.id] ?? null,
  }));

  return NextResponse.json({ checks: enriched });
}

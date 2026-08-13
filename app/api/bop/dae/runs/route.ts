import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const sb    = getServerClient();
  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') || 50), 200);

  const { data, error } = await sb
    .from('dae_runs')
    .select(`
      id, job_id, status, started_at, finished_at,
      pages_fetched, listings_seen, listings_saved, listings_updated,
      errors, error_log,
      dae_search_jobs ( name, dae_sources ( platform_name, platform_code ) )
    `)
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ runs: data ?? [] });
}

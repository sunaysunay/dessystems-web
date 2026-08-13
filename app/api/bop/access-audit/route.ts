import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const { searchParams } = new URL(req.url);
  const view = searchParams.get('view') ?? 'overview';
  const range = parseInt(searchParams.get('range') ?? '30', 10);
  const since = new Date(Date.now() - range * 24 * 60 * 60 * 1000).toISOString();

  if (view === 'overview') {
    // Last 50 bop_change_log entries
    const { data: changelog } = await supabase
      .from('bop_change_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    // Activity volume per day for chart
    const { data: activity } = await supabase
      .from('bop_user_activity')
      .select('created_at, module')
      .gte('created_at', since);

    // Aggregate by day
    const byDay: Record<string, number> = {};
    for (const row of (activity ?? [])) {
      const d = row.created_at.slice(0, 10);
      byDay[d] = (byDay[d] ?? 0) + 1;
    }
    const dailyChart = Object.entries(byDay)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => ({ date, count }));

    // KPIs
    const { count: totalChanges } = await supabase
      .from('bop_change_log')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', since);

    const { count: roleChanges } = await supabase
      .from('bop_change_log')
      .select('*', { count: 'exact', head: true })
      .in('action', ['ROLE_CHANGED', 'ROLE_SCREEN_GRANTED', 'ROLE_SCREEN_REVOKED'])
      .gte('created_at', since);

    const { count: lockEvents } = await supabase
      .from('bop_change_log')
      .select('*', { count: 'exact', head: true })
      .in('action', ['USER_LOCKED', 'USER_UNLOCKED'])
      .gte('created_at', since);

    const { count: screenAccesses } = await supabase
      .from('bop_user_activity')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', since);

    return NextResponse.json({
      changelog: changelog ?? [],
      dailyChart,
      kpis: { totalChanges, roleChanges, lockEvents, screenAccesses },
    });
  }

  if (view === 'iam') {
    // IAM-only changes from bop_change_log
    const action = searchParams.get('action') ?? '';
    let q = supabase
      .from('bop_change_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (action) q = q.eq('action', action);
    const { data } = await q;
    return NextResponse.json({ rows: data ?? [] });
  }

  if (view === 'activity') {
    // Screen access log from bop_user_activity
    const email = searchParams.get('email') ?? '';
    const module = searchParams.get('module') ?? '';
    let q = supabase
      .from('bop_user_activity')
      .select('*')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(200);
    if (email) q = q.ilike('user_email', `%${email}%`);
    if (module) q = q.eq('module', module);
    const { data } = await q;
    return NextResponse.json({ rows: data ?? [] });
  }

  if (view === 'sessions') {
    const { data } = await supabase
      .from('bop_sessions')
      .select('*')
      .gte('last_seen_at', since)
      .order('last_seen_at', { ascending: false })
      .limit(100);
    return NextResponse.json({ rows: data ?? [] });
  }

  return NextResponse.json({ error: 'unknown view' }, { status: 400 });
}

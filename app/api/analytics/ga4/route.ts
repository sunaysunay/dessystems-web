import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const sb = getServerClient();
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenant_id') ? Number(searchParams.get('tenant_id')) : null;
  const range    = searchParams.get('range') || '30d';

  const days: Record<string,number> = { '7d':7,'30d':30,'90d':90 };
  const d = new Date();
  d.setDate(d.getDate() - (days[range] ?? 30));
  const fromStr = d.toISOString().split('T')[0];

  let q = sb.from('ga4_analytics')
    .select('date,sessions,users,new_users,pageviews,engaged_sessions,bounce_rate,avg_session_duration,synced_at')
    .gte('date', fromStr).order('date', { ascending: true });
  if (tenantId) q = q.eq('tenant_id', tenantId);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rows: data ?? [], range, from: fromStr });
}

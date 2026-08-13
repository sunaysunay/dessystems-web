import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const sb = getServerClient();
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenant_id') ? Number(searchParams.get('tenant_id')) : null;
  const range    = searchParams.get('range') || '30d';

  const dayMs = 24 * 60 * 60 * 1000;
  const days: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90 };
  const cutoff = days[range]
    ? new Date(Date.now() - days[range] * dayMs).toISOString()
    : null;

  let q = sb.from('lead').select(
    'id,internal_id,name,email,phone,subject,status,source,utm_source,locale,listing_id,created_at'
  ).order('created_at', { ascending: false });

  if (tenantId) q = q.eq('tenant_id', tenantId);
  if (cutoff)   q = q.gte('created_at', cutoff);
  q = q.neq('subject', 'tracking_subscription');

  const { data, error } = await q.limit(1000);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data ?? [];
  const now  = Date.now();

  const byStatus: Record<string, number> = {};
  rows.forEach(r => { const s = r.status || 'new'; byStatus[s] = (byStatus[s] ?? 0) + 1; });

  const bySubject: Record<string, number> = {};
  rows.forEach(r => { const s = r.subject || 'general'; bySubject[s] = (bySubject[s] ?? 0) + 1; });

  const bySource: Record<string, number> = {};
  rows.forEach(r => { const s = r.utm_source || r.source || 'direct'; bySource[s] = (bySource[s] ?? 0) + 1; });

  const today   = rows.filter(r => new Date(r.created_at) > new Date(now - 1  * dayMs)).length;
  const week    = rows.filter(r => new Date(r.created_at) > new Date(now - 7  * dayMs)).length;
  const month   = rows.filter(r => new Date(r.created_at) > new Date(now - 30 * dayMs)).length;

  return NextResponse.json({
    totals: { total: rows.length, today, week, month },
    byStatus:  Object.entries(byStatus).map(([name,value]) => ({ name, value })),
    bySubject: Object.entries(bySubject).sort((a,b) => b[1]-a[1]).map(([name,value]) => ({ name, value })),
    bySource:  Object.entries(bySource).sort((a,b) => b[1]-a[1]).map(([name,value]) => ({ name, value })),
    recent: rows.slice(0, 50),
  });
}

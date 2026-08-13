import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const sb = getServerClient();
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenant_id') ? Number(searchParams.get('tenant_id')) : null;
  const range = searchParams.get('range') || '7d';

  const dayMs = 24 * 60 * 60 * 1000;
  const days: Record<string, number> = { '1d': 1, '3d': 3, '7d': 7, '30d': 30, '90d': 90 };
  const cutoff = days[range]
    ? new Date(Date.now() - days[range] * dayMs).toISOString()
    : null;

  let q = sb.from('dm_activity_log').select(
    'id,created_at,event_type,page,locale,listing_id,session_id,country,city,region,timezone,latitude,longitude,device_type,os_platform,referrer,user_agent,screen_resolution,tenant_id'
  ).order('created_at', { ascending: false });

  if (tenantId) q = q.eq('tenant_id', tenantId);
  if (cutoff)   q = q.gte('created_at', cutoff);

  const { data, error } = await q.limit(5000);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data ?? [];
  const now = Date.now();

  const pageViews   = rows.filter(r => r.event_type === 'page_view');
  const sessions    = [...new Set(pageViews.map(r => r.session_id).filter(Boolean))];
  const listingViews= rows.filter(r => r.event_type === 'listing_view').length;
  const formSubmits = rows.filter(r => ['form_submit','lead_submitted','appointment_submit'].includes(r.event_type)).length;

  // Daily trend last 30 days
  const dailyMap: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) {
    dailyMap[new Date(now - i * dayMs).toISOString().split('T')[0]] = 0;
  }
  pageViews.forEach(r => { const k = r.created_at.split('T')[0]; if (k in dailyMap) dailyMap[k]++; });

  // By device
  const byDevice: Record<string, number> = {};
  rows.forEach(r => { const d = r.device_type || 'unknown'; byDevice[d] = (byDevice[d] ?? 0) + 1; });

  // By country
  const byCountry: Record<string, number> = {};
  rows.forEach(r => { const c = r.country || 'unknown'; byCountry[c] = (byCountry[c] ?? 0) + 1; });

  // Top pages
  const byPage: Record<string, number> = {};
  pageViews.forEach(r => { if (r.page) byPage[r.page] = (byPage[r.page] ?? 0) + 1; });

  return NextResponse.json({
    totals: {
      pageViews:    pageViews.length,
      sessions:     sessions.length,
      listingViews,
      formSubmits,
    },
    dailyTrend: Object.entries(dailyMap).map(([date, count]) => ({ date, count })),
    byDevice:   Object.entries(byDevice).sort((a,b) => b[1]-a[1]).map(([name,value]) => ({ name, value })),
    byCountry:  Object.entries(byCountry).sort((a,b) => b[1]-a[1]).slice(0,10).map(([name,value]) => ({ name, value })),
    topPages:   Object.entries(byPage).sort((a,b) => b[1]-a[1]).slice(0,10).map(([page,views]) => ({ page, views })),
  });
}

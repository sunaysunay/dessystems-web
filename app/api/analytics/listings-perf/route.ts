import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const sb = getServerClient();
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenant_id') ? Number(searchParams.get('tenant_id')) : null;
  const range    = searchParams.get('range') || 'all';

  let since: string | null = null;
  if (range !== 'all') {
    const d = new Date();
    const days: Record<string,number> = { '1d':1,'3d':3,'7d':7,'30d':30,'90d':90 };
    d.setDate(d.getDate() - (days[range] ?? 7));
    since = d.toISOString();
  }

  // Listings
  let lq = sb.from('listing')
    .select('id,item_id,slug,category,brand,status,is_featured,created_at,listing_content(title)')
    .in('status', ['published','unlisted'])
    .order('created_at', { ascending: false });
  if (tenantId) lq = lq.eq('tenant_id', tenantId);
  const { data: rawListings, error: le } = await lq;
  if (le) return NextResponse.json({ error: le.message }, { status: 500 });
  if (!rawListings?.length) return NextResponse.json({ data: [] });

  const listings = rawListings.map((r: any) => ({ ...r, title: r.listing_content?.title ?? '', listing_content: undefined }));
  const ids = listings.map((l: any) => l.id);

  // View counts
  let vq = sb.from('dm_activity_log').select('listing_id').eq('event_type','listing_view').in('listing_id', ids)
    .not('user_agent','ilike','%bot%').not('user_agent','ilike','%crawler%').not('user_agent','ilike','%vercel-screenshot%');
  if (tenantId) vq = vq.eq('tenant_id', tenantId);
  if (since) vq = vq.gte('created_at', since);
  const { data: viewRows } = await vq;

  // Lead counts
  let leadq = sb.from('lead').select('listing_id').in('listing_id', ids);
  if (tenantId) leadq = leadq.eq('tenant_id', tenantId);
  if (since) leadq = leadq.gte('created_at', since);
  const { data: leadRows } = await leadq;

  const viewCounts: Record<string,number> = {};
  for (const r of viewRows ?? []) if (r.listing_id) viewCounts[r.listing_id] = (viewCounts[r.listing_id] || 0) + 1;

  const leadCounts: Record<string,number> = {};
  for (const r of leadRows ?? []) if (r.listing_id) leadCounts[r.listing_id] = (leadCounts[r.listing_id] || 0) + 1;

  const data = listings.map((l: any) => {
    const views = viewCounts[l.id] || 0;
    const leads = leadCounts[l.id] || 0;
    const conversion = views > 0 ? Math.round((leads / views) * 100) : 0;
    const noLeads = views >= 3 && leads === 0;
    return { id: l.id, item_id: l.item_id, title: l.title, category: l.category, brand: l.brand, status: l.status, is_featured: l.is_featured, views, leads, conversion, no_leads: noLeads };
  }).sort((a: any, b: any) => b.views - a.views);

  const totals = {
    total_views: data.reduce((s: number, r: any) => s + r.views, 0),
    total_leads: data.reduce((s: number, r: any) => s + r.leads, 0),
    no_leads_count: data.filter((r: any) => r.no_leads).length,
    overall_conversion: 0,
  };
  totals.overall_conversion = totals.total_views > 0 ? Math.round((totals.total_leads / totals.total_views) * 100) : 0;

  return NextResponse.json({ data, totals });
}

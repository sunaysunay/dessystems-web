import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const sb = getServerClient();
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenant_id') ? Number(searchParams.get('tenant_id')) : null;
  const now = new Date();
  const cut30m = new Date(now.getTime() - 30 * 60 * 1000).toISOString();
  const cut5m  = new Date(now.getTime() -  5 * 60 * 1000).toISOString();
  const cut1m  = new Date(now.getTime() -  1 * 60 * 1000).toISOString();

  let q = sb.from('dm_activity_log')
    .select('created_at,session_id,event_type,page,listing_id,listing_title,listing_slug,country,city,device_type,referrer')
    .gte('created_at', cut30m)
    .order('created_at', { ascending: false })
    .limit(1000);
  if (tenantId) q = q.eq('tenant_id', tenantId);

  const { data: events, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!events?.length) return NextResponse.json({ active_30m: 0, active_5m: 0, active_1m: 0, per_minute: [], top_pages: [], top_countries: [], top_devices: [], recent_events: [], active_listings: [], total_events_30m: 0 });

  const sessions30m = new Set(events.map(e => e.session_id));
  const sessions5m  = new Set(events.filter(e => e.created_at >= cut5m).map(e => e.session_id));
  const sessions1m  = new Set(events.filter(e => e.created_at >= cut1m).map(e => e.session_id));

  // Per-minute buckets
  const minuteMap: Record<string, { sessions: Set<string>; events: number }> = {};
  for (let i = 29; i >= 0; i--) {
    const t = new Date(now.getTime() - i * 60000);
    const k = `${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}`;
    minuteMap[k] = { sessions: new Set(), events: 0 };
  }
  for (const ev of events) {
    const d = new Date(ev.created_at);
    const k = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    if (minuteMap[k]) { minuteMap[k].sessions.add(ev.session_id); minuteMap[k].events++; }
  }

  // Top pages
  const pageMap: Record<string, { views: number; sessions: Set<string> }> = {};
  for (const ev of events) {
    if (!ev.page) continue;
    const p = ev.page.replace(/^\/(en|nl|de|fr|tr)/, '') || '/';
    if (!pageMap[p]) pageMap[p] = { views: 0, sessions: new Set() };
    pageMap[p].views++; pageMap[p].sessions.add(ev.session_id);
  }

  // Listings
  const listingMap: Record<string, { title: string; sessions: Set<string> }> = {};
  for (const ev of events.filter(e => e.event_type === 'listing_view' && e.listing_id)) {
    const lid = ev.listing_id!;
    if (!listingMap[lid]) listingMap[lid] = { title: ev.listing_title || lid, sessions: new Set() };
    listingMap[lid].sessions.add(ev.session_id);
  }

  // Countries
  const countryMap: Record<string, Set<string>> = {};
  for (const ev of events) {
    if (!ev.country) continue;
    if (!countryMap[ev.country]) countryMap[ev.country] = new Set();
    countryMap[ev.country].add(ev.session_id);
  }

  // Devices
  const deviceMap: Record<string, Set<string>> = {};
  for (const ev of events) {
    const d = ev.device_type || 'Unknown';
    if (!deviceMap[d]) deviceMap[d] = new Set();
    deviceMap[d].add(ev.session_id);
  }

  return NextResponse.json({
    active_30m: sessions30m.size,
    active_5m:  sessions5m.size,
    active_1m:  sessions1m.size,
    total_events_30m: events.length,
    per_minute: Object.entries(minuteMap).map(([minute, v]) => ({ minute, sessions: v.sessions.size, events: v.events })),
    top_pages: Object.entries(pageMap).sort((a,b) => b[1].views-a[1].views).slice(0,10).map(([page,v]) => ({ page, views: v.views, sessions: v.sessions.size })),
    top_countries: Object.entries(countryMap).sort((a,b) => b[1].size-a[1].size).slice(0,8).map(([country,s]) => ({ country, sessions: s.size })),
    top_devices: Object.entries(deviceMap).sort((a,b) => b[1].size-a[1].size).map(([device,s]) => ({ device, sessions: s.size })),
    active_listings: Object.entries(listingMap).sort((a,b) => b[1].sessions.size-a[1].sessions.size).slice(0,8).map(([id,v]) => ({ listing_id: id, title: v.title, sessions: v.sessions.size })),
    recent_events: events.slice(0,30).map(ev => ({ created_at: ev.created_at, event_type: ev.event_type, page: (ev.page||'').replace(/^\/(en|nl|de|fr|tr)/,'') || '/', listing_title: ev.listing_title, country: ev.country, city: ev.city, device_type: ev.device_type, session_short: ev.session_id?.slice(0,8) || '—' })),
    fetched_at: now.toISOString(),
  });
}

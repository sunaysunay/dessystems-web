import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

function getCutoff(range: string): string | null {
  if (range === 'all') return null;
  const d = new Date();
  const map: Record<string, number> = { '1d': 1, '3d': 3, '7d': 7, '30d': 30, '90d': 90 };
  const days = map[range];
  if (!days) return null;
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export async function GET(req: NextRequest) {
  const sb = getServerClient();
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenant_id') ? Number(searchParams.get('tenant_id')) : null;
  const range    = searchParams.get('range') || '7d';
  const view     = searchParams.get('view') || 'default';
  const cutoff   = getCutoff(range);

  // --- Cloudflare view ---
  if (view === 'cloudflare') {
    let q = sb.from('cloudflare_analytics').select('*').order('date', { ascending: true });
    if (tenantId) q = q.eq('tenant_id', tenantId);
    if (cutoff) q = q.gte('date', cutoff.split('T')[0]);
    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: data ?? [] });
  }

  // --- Security view ---
  if (view === 'security') {
    let q = sb.from('security_event_log').select('*').order('created_at', { ascending: false }).limit(2000);
    if (cutoff) q = q.gte('created_at', cutoff);
    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: data ?? [] });
  }

  // --- Main activity_log views ---
  const EVENT_FILTER: Record<string, string[]> = {
    page_views:   ['page_view'],
    listing_views:['listing_view'],
    form_submits: ['form_submit','lead_submitted','appointment_submit','contact_submitted','quote_submitted'],
    click_events: ['click'],
    not_found:    ['not_found'],
    visitors:     ['page_view','listing_view'],
    top_pages:    ['page_view'],
    locations:    ['page_view','listing_view'],
    devices:      ['page_view','listing_view'],
    sources:      ['page_view','listing_view'],
    recent:       [],
  };

  let q = sb.from('dm_activity_log')
    .select('created_at,event_type,page,locale,listing_id,listing_title,listing_slug,session_id,country,city,region,latitude,longitude,timezone,device_type,os_platform,browser_language,screen_resolution,referrer,user_agent,ip_address,metadata,tenant_id')
    .order('created_at', { ascending: false })
    .limit(5000);

  if (tenantId) q = q.eq('tenant_id', tenantId);
  if (cutoff)   q = q.gte('created_at', cutoff);

  const events = EVENT_FILTER[view];
  if (events && events.length > 0) {
    if (events.length === 1) q = q.eq('event_type', events[0]);
    else q = q.in('event_type', events);
  }

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: data ?? [] });
}

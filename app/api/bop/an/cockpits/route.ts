import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const CONVERSIONS = new Set([
  'form_submit', 'lead_submitted', 'appointment_submit', 'contact_submitted',
  'quote_submitted', 'sell_lead_submitted', 'share',
]);

function iso(d: Date) { return d.toISOString().slice(0, 10); }

type Sb = ReturnType<typeof getServerClient>;
type Snap = { date: string; metrics: Record<string, unknown> };

async function snapshots(sb: Sb, tenant: number, days: number, offset = 0): Promise<Snap[]> {
  const to = new Date(Date.now() - offset * 86400e3);
  const from = new Date(to.getTime() - days * 86400e3);
  const { data } = await sb.from('anl_daily_snapshots')
    .select('date, metrics').eq('tenant_id', tenant)
    .gte('date', iso(from)).lte('date', iso(to)).order('date');
  return (data ?? []) as Snap[];
}

function sum(snaps: Snap[], path: (m: Record<string, unknown>) => number) {
  return snaps.reduce((a, s) => a + (path(s.metrics) ?? 0), 0);
}

function mergeMaps(snaps: Snap[], key: string) {
  const m: Record<string, number> = {};
  for (const s of snaps) {
    const val = s.metrics[key] as Record<string, unknown> | undefined;
    for (const [k, v] of Object.entries(val ?? {})) m[k] = (m[k] ?? 0) + Number(v);
  }
  return m;
}

function getFunnel(snap: Snap) {
  return snap.metrics.funnel as Record<string, number> | undefined;
}

async function handleExec(sb: Sb, tenant: number, range: number) {
  const [cur, prev] = await Promise.all([
    snapshots(sb, tenant, range), snapshots(sb, tenant, range, range),
  ]);
  const kpi = (f: (m: Record<string, unknown>) => number) => {
    const c = sum(cur, f), pr = sum(prev, f);
    return { value: c, prev: pr, delta: pr ? Number((((c - pr) / pr) * 100).toFixed(1)) : null };
  };
  const half = Math.floor(cur.length / 2);
  const agg = (slice: Snap[]) => {
    const m: Record<string, number> = {};
    for (const s of slice) {
      const top = s.metrics.top_listings as Record<string, unknown> | undefined;
      for (const [t, v] of Object.entries(top ?? {})) m[t] = (m[t] ?? 0) + Number(v);
    }
    return m;
  };
  const a = agg(cur.slice(0, half)), b = agg(cur.slice(half));
  const movers = Object.keys({ ...a, ...b })
    .map(t => ({ title: t, before: a[t] ?? 0, after: b[t] ?? 0, delta: (b[t] ?? 0) - (a[t] ?? 0) }))
    .sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta)).slice(0, 8);
  const today = new Date().toISOString().slice(0, 10);
  const { count: todayEvents } = await sb.from('dm_activity_log')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenant).gte('created_at', today + 'T00:00:00Z');
  const twoH = new Date(Date.now() - 2 * 3600e3).toISOString();
  const slaBreaches = tenant === 300
    ? (await sb.from('sell_leads').select('id', { count: 'exact', head: true })
        .in('status', ['new', 'reviewing']).lte('created_at', twoH)).count
    : 0;
  const alerts: { level: string; text: string }[] = [];
  if ((todayEvents ?? 0) === 0) alerts.push({ level: 'red', text: 'No storefront events today' });
  if ((slaBreaches ?? 0) > 0) alerts.push({ level: 'red', text: `${slaBreaches} sell lead(s) breaching the 2h SLA (SA013)` });
  const lastWeekAvg = sum(cur.slice(-7), m => (m.visitors as number) ?? 0) / 7;
  const prevWeekAvg = sum(cur.slice(-14, -7), m => (m.visitors as number) ?? 0) / 7;
  if (prevWeekAvg > 5 && lastWeekAvg < prevWeekAvg * 0.6) {
    alerts.push({ level: 'amber', text: `Traffic down ${Math.round((1 - lastWeekAvg / prevWeekAvg) * 100)}% week-over-week` });
  }
  return NextResponse.json({
    kpis: {
      visitors: kpi(m => (m.visitors as number) ?? 0),
      page_views: kpi(m => (m.page_views as number) ?? 0),
      conversions: kpi(m => (m.conversions as number) ?? 0),
      leads: kpi(m => getFunnel({ date: '', metrics: m })?.leads ?? 0),
      listing_views: kpi(m => getFunnel({ date: '', metrics: m })?.listing_views ?? 0),
      won: kpi(m => getFunnel({ date: '', metrics: m })?.won ?? 0),
    },
    trend: cur.map(s => ({
      date: s.date,
      visitors: (s.metrics.visitors as number) ?? 0,
      leads: getFunnel(s)?.leads ?? 0,
      conversions: (s.metrics.conversions as number) ?? 0,
    })),
    movers, alerts, days: cur.length,
  });
}

async function handleFunnel(sb: Sb, tenant: number, range: number) {
  const [cur, prev] = await Promise.all([
    snapshots(sb, tenant, range), snapshots(sb, tenant, range, range),
  ]);
  const stageSums = (snaps: Snap[]) => ({
    visits: sum(snaps, m => getFunnel({ date: '', metrics: m })?.visits ?? 0),
    listing_views: sum(snaps, m => getFunnel({ date: '', metrics: m })?.listing_views ?? 0),
    engaged: sum(snaps, m => getFunnel({ date: '', metrics: m })?.engaged ?? 0),
    leads: sum(snaps, m => getFunnel({ date: '', metrics: m })?.leads ?? 0),
    won: sum(snaps, m => getFunnel({ date: '', metrics: m })?.won ?? 0),
  });
  const cs = stageSums(cur), ps = stageSums(prev);
  const leadSplit = {
    sell_leads: sum(cur, m => getFunnel({ date: '', metrics: m })?.sell_leads ?? 0),
    crm_leads: sum(cur, m => getFunnel({ date: '', metrics: m })?.crm_leads ?? 0),
    dm_offers: sum(cur, m => getFunnel({ date: '', metrics: m })?.dm_offers ?? 0),
  };
  const device = mergeMaps(cur, 'by_device');
  const bFrom = new Date(Date.now() - range * 86400e3).toISOString();
  const { data: bRows } = await sb.from('dm_activity_sessions')
    .select('browser').eq('tenant_id', tenant).gte('started_at', bFrom).limit(5000);
  const browser: Record<string, number> = {};
  for (const r of bRows ?? []) { const k = (r.browser as string) || 'Unknown'; browser[k] = (browser[k] ?? 0) + 1; }
  return NextResponse.json({
    stages: cs, prev_stages: ps, lead_split: leadSplit, by_device: device, by_browser: browser,
    trend: cur.map(s => ({ date: s.date, ...getFunnel(s) })),
  });
}

async function handleSessions(sb: Sb, tenant: number, range: number) {
  const days = Math.min(range, 30);
  const from = new Date(Date.now() - days * 86400e3).toISOString();
  const { data, error } = await sb.from('dm_activity_sessions')
    .select('session_id, started_at, ended_at, duration_sec, page_count, is_bounce, event_types, entry_page, exit_page, utm_source, utm_medium, utm_campaign, device_type, browser, country_code, region, city, referrer')
    .eq('tenant_id', tenant).gte('started_at', from)
    .order('started_at', { ascending: false }).limit(400);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const rows = (data ?? []).map(s => {
    const types: string[] = (s.event_types as string[]) ?? [];
    const converted = types.some(t => CONVERSIONS.has(t));
    const listingViews = types.filter(t => t === 'listing_view').length;
    const engagement = Math.min(10, Math.round(
      ((s.page_count as number) ?? 1) * 0.8 + Math.min(((s.duration_sec as number) ?? 0) / 120, 4) + (converted ? 3 : 0)));
    return { ...s, converted, engagement, has_utm: Boolean(s.utm_source), listing_views: listingViews };
  });
  return NextResponse.json({ sessions: rows });
}

async function handleTrace(sb: Sb, sid: string) {
  const { data } = await sb.from('dm_activity_log')
    .select('created_at, event_type, page, listing_title, listing_slug, metadata, device_type, city, country')
    .eq('session_id', sid).order('created_at').limit(500);
  const events = (data ?? []) as Record<string, unknown>[];
  const timeline = events.map((e, i) => ({
    ...e,
    dwell_sec: i < events.length - 1
      ? Math.round((new Date(events[i + 1].created_at as string).getTime() - new Date(e.created_at as string).getTime()) / 1000)
      : null,
    uid: (e.metadata as Record<string, unknown>)?.uid ?? null,
  }));
  const uid = timeline.find(t => t.uid)?.uid ?? null;
  let shopper = null;
  if (uid) {
    const { data: prof } = await sb.from('dm_profiles')
      .select('display_name, account_type, dealer_verified').eq('id', uid).maybeSingle();
    shopper = prof ? { uid, ...prof } : { uid };
  }
  return NextResponse.json({ timeline, shopper });
}

async function handleTraffic(sb: Sb, tenant: number, range: number) {
  const [cur, prev] = await Promise.all([
    snapshots(sb, tenant, range), snapshots(sb, tenant, range, range),
  ]);
  const curSrc = mergeMaps(cur, 'by_source'), prevSrc = mergeMaps(prev, 'by_source');
  const sources = Object.keys({ ...curSrc, ...prevSrc })
    .map(k => ({ source: k, value: curSrc[k] ?? 0, prev: prevSrc[k] ?? 0 }))
    .sort((a, b) => b.value - a.value).slice(0, 25);
  const from = new Date(Date.now() - range * 86400e3).toISOString();
  const { data: utmRows } = await sb.from('dm_activity_sessions')
    .select('utm_source, utm_medium, utm_campaign, event_types, page_count')
    .eq('tenant_id', tenant).gte('started_at', from).not('utm_source', 'is', null).limit(2000);
  const camp: Record<string, { sessions: number; converted: number }> = {};
  for (const s of utmRows ?? []) {
    const k = [s.utm_source, s.utm_medium, s.utm_campaign].filter(Boolean).join(' / ');
    camp[k] ??= { sessions: 0, converted: 0 };
    camp[k].sessions++;
    if (((s.event_types as string[]) ?? []).some((t: string) => CONVERSIONS.has(t))) camp[k].converted++;
  }
  const { data: brRows } = await sb.from('dm_activity_sessions')
    .select('browser').eq('tenant_id', tenant).gte('started_at', from).limit(5000);
  const browsers: Record<string, number> = {};
  for (const r of brRows ?? []) { const k = (r.browser as string) || 'Unknown'; browsers[k] = (browsers[k] ?? 0) + 1; }
  return NextResponse.json({
    sources,
    campaigns: Object.entries(camp).map(([k, v]) => ({ campaign: k, ...v })).sort((a, b) => b.sessions - a.sessions),
    devices: mergeMaps(cur, 'by_device'),
    browsers,
    trend: cur.map(s => ({ date: s.date, visitors: s.metrics.visitors, page_views: s.metrics.page_views })),
    totals: { visitors: sum(cur, m => (m.visitors as number) ?? 0), prev_visitors: sum(prev, m => (m.visitors as number) ?? 0) },
  });
}

async function handleListing(sb: Sb, tenant: number, range: number, slug: string | null) {
  const from = new Date(Date.now() - range * 86400e3).toISOString();
  if (!slug) {
    const cur = await snapshots(sb, tenant, range);
    const m: Record<string, number> = {};
    for (const s of cur) {
      const top = s.metrics.top_listings as Record<string, unknown> | undefined;
      for (const [k, v] of Object.entries(top ?? {})) m[k] = (m[k] ?? 0) + Number(v);
    }
    const { data: convs } = await sb.from('dm_conversations')
      .select('listing_id, created_at, bop_listings(ref_no)').gte('created_at', from);
    const contacts: Record<string, number> = {};
    for (const c of convs ?? []) {
      const refNo = (c as { bop_listings?: { ref_no?: string } }).bop_listings?.ref_no;
      if (refNo) contacts[refNo] = (contacts[refNo] ?? 0) + 1;
    }
    const ranking = Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 40)
      .map(([title, views]) => ({ title, views }));
    return NextResponse.json({ ranking, contacts });
  }
  const { data: ev } = await sb.from('dm_activity_log')
    .select('created_at, event_type')
    .eq('tenant_id', tenant).eq('listing_slug', slug).gte('created_at', from).limit(5000);
  const byDay: Record<string, Record<string, number>> = {};
  for (const e of ev ?? []) {
    const d = (e.created_at as string).slice(0, 10);
    (byDay[d] ??= {})[(e.event_type as string)] = (byDay[d][e.event_type as string] ?? 0) + 1;
  }
  return NextResponse.json({
    listing: slug,
    daily: Object.entries(byDay).sort().map(([date, types]) => ({ date, ...types })),
    totals: (ev ?? []).reduce((a: Record<string, number>, e) => {
      a[e.event_type as string] = (a[e.event_type as string] ?? 0) + 1; return a;
    }, {}),
  });
}

async function handleMonitor(sb: Sb, tenant: number) {
  const hourAgo = new Date(Date.now() - 3600e3).toISOString();
  const dayAgo = new Date(Date.now() - 86400e3).toISOString();
  const [{ count: lastHour }, { count: last24 }, { data: rules }, cur] = await Promise.all([
    sb.from('dm_activity_log').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant).gte('created_at', hourAgo),
    sb.from('dm_activity_log').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant).gte('created_at', dayAgo),
    sb.from('anl_alert_rules').select('*').eq('tenant_id', tenant).order('rule'),
    snapshots(sb, tenant, 14),
  ]);
  const { data: notFound } = await sb.from('dm_activity_log').select('page')
    .eq('tenant_id', tenant).eq('event_type', '404').gte('created_at', dayAgo).limit(500);
  const nf: Record<string, number> = {};
  for (const r of notFound ?? []) nf[r.page as string] = (nf[r.page as string] ?? 0) + 1;
  const baseline = sum(cur.slice(0, 7), m => (m.visitors as number) ?? 0) / 7;
  const lastDays = sum(cur.slice(-7), m => (m.visitors as number) ?? 0) / 7;
  const checks = [
    { name: 'Events last hour', value: lastHour ?? 0, status: (lastHour ?? 0) > 0 ? 'green' : 'red' },
    { name: 'Events last 24h', value: last24 ?? 0, status: (last24 ?? 0) > 10 ? 'green' : (last24 ?? 0) > 0 ? 'amber' : 'red' },
    { name: '7d visitors vs prior 7d', value: baseline ? Math.round((lastDays / baseline) * 100) + '%' : 'n/a', status: !baseline ? 'amber' : lastDays >= baseline * 0.6 ? 'green' : 'red' },
    { name: '404 pages (24h)', value: Object.keys(nf).length, status: Object.keys(nf).length < 10 ? 'green' : 'amber' },
  ];
  return NextResponse.json({
    checks, rules: rules ?? [],
    top_404: Object.entries(nf).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([page, n]) => ({ page, n })),
  });
}

export async function GET(req: NextRequest) {
  const sb = getServerClient();
  const p = new URL(req.url).searchParams;
  const view = p.get('view') ?? 'exec';
  const tenant = Number(p.get('tenant_id') ?? 300);
  const range = Math.min(Number(p.get('range') ?? 30), 180);

  if (view === 'exec') return handleExec(sb, tenant, range);
  if (view === 'funnel') return handleFunnel(sb, tenant, range);
  if (view === 'sessions') return handleSessions(sb, tenant, Math.min(Number(p.get('range') ?? 7), 30));
  if (view === 'trace') {
    const sid = p.get('session');
    if (!sid) return NextResponse.json({ error: 'session required' }, { status: 400 });
    return handleTrace(sb, sid);
  }
  if (view === 'traffic') return handleTraffic(sb, tenant, range);
  if (view === 'listing') return handleListing(sb, tenant, range, p.get('listing'));
  if (view === 'monitor') return handleMonitor(sb, tenant);

  return NextResponse.json({ error: 'unknown view' }, { status: 400 });
}

export async function PATCH(req: NextRequest) {
  const sb = getServerClient();
  const b = await req.json() as Record<string, unknown>;
  if (!b.id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const patch: Record<string, unknown> = {};
  if (typeof b.enabled === 'boolean') patch.enabled = b.enabled;
  if (b.threshold !== undefined) patch.threshold = Number(b.threshold);
  if (b.notify_email !== undefined) patch.notify_email = b.notify_email || null;
  const { error } = await sb.from('anl_alert_rules').update(patch).eq('id', b.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

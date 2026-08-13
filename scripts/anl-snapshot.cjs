#!/usr/bin/env node
// Analytics daily snapshots — tenant-aware port of descamper's
// analytics-snapshot. Usage:
//   node scripts/anl-snapshot.cjs                → yesterday, tenants 100+300
//   node scripts/anl-snapshot.cjs 2026-07-01     → one specific day
//   node scripts/anl-snapshot.cjs --backfill 90  → last N days
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");
fs.readFileSync(".env.local", "utf8").split("\n").forEach(l => {
  const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/"/g, "");
});
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const TENANTS = process.env.TENANTS ? process.env.TENANTS.split(",").map(Number) : [199, 300, 400, 500]; // deshold, desmobil, desshop, dessystems (descamper 100 excluded)
// single source of truth for what counts as a conversion (shared with cockpits)
const CONVERSION_EVENTS = new Set([
  "form_submit", "lead_submitted", "appointment_submit", "contact_submitted",
  "quote_submitted", "sell_lead_submitted", "share",
]);
const ENGAGE_EVENTS = new Set(["favorite", "share", "save_search"]);

function dayBounds(dateStr) {
  return { start: dateStr + "T00:00:00.000Z", end: dateStr + "T23:59:59.999Z" };
}

async function pageAll(query) {
  // page through supabase 1000-row limit
  const out = [];
  for (let i = 0; ; i += 1000) {
    const { data, error } = await query.range(i, i + 999);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

async function snapshotDay(tenant, dateStr) {
  const { start, end } = dayBounds(dateStr);

  const events = await pageAll(
    sb.from("dm_activity_log")
      .select("event_type, page, session_id, listing_id, listing_title, country, device_type, referrer, metadata")
      .eq("tenant_id", tenant).gte("created_at", start).lte("created_at", end)
      .order("created_at", { ascending: true })
  );
  let sessions = [];
  try {
    sessions = await pageAll(
      sb.from("dm_activity_sessions")
        .select("id, session_id, duration_sec, page_count, is_bounce, event_types, utm_source, utm_medium, utm_campaign, device_type, country_code, browser, referrer, entry_page")
        .eq("tenant_id", tenant).gte("started_at", start).lte("started_at", end)
        .order("started_at", { ascending: true })
    );
  } catch { /* sessions table optional */ }

  const uniqSessions = new Set(events.map(e => e.session_id).filter(Boolean));
  const byType = {}, bySource = {}, byDevice = {}, topListings = {};
  let pageViews = 0, conversions = 0, views = 0, identified = 0;
  const engaged = new Set(), converted = new Set();
  const host = (r) => { try { return new URL(r).hostname.replace(/^www\./, ""); } catch { return "direct"; } };
  for (const e of events) {
    byType[e.event_type] = (byType[e.event_type] ?? 0) + 1;
    if (e.event_type === "page_view" || e.event_type === "pageview") pageViews++;
    const src = e.referrer ? host(e.referrer) : "direct";
    bySource[src] = (bySource[src] ?? 0) + 1;
    if (e.device_type) byDevice[e.device_type] = (byDevice[e.device_type] ?? 0) + 1;
    const isListingView = e.event_type === "listing_view" ||
      (e.event_type === "page_view" && /\/\d{6}-/.test(e.page ?? ""));
    if (isListingView) {
      views++;
      const key = e.listing_title || (e.page ?? "").split("/").pop();
      if (key) topListings[key] = (topListings[key] ?? 0) + 1;
    }
    if (ENGAGE_EVENTS.has(e.event_type) && e.session_id) engaged.add(e.session_id);
    if (CONVERSION_EVENTS.has(e.event_type)) { conversions++; if (e.session_id) converted.add(e.session_id); }
    if (e.metadata && (e.metadata.uid || e.metadata.user_id)) identified++;
  }
  // utm sources from sessions override referrer-derived when present
  for (const s of sessions) if (s.utm_source) bySource[s.utm_source] = (bySource[s.utm_source] ?? 0) + 1;

  // leads created that day (business side of the funnel) — tenant-aware.
  // sell_leads / dm offers / won are desmobil-only concepts (no tenant column);
  // crm_leads is multi-tenant and must be filtered by tenant_id.
  const isDesmobil = tenant === 300;
  const zero = Promise.resolve({ count: 0 });
  const [{ count: sellLeads }, { count: crmLeads }, { count: dmOffers }, { count: won }] = await Promise.all([
    isDesmobil ? sb.from("sell_leads").select("id", { count: "exact", head: true }).gte("created_at", start).lte("created_at", end) : zero,
    sb.from("crm_leads").select("id", { count: "exact", head: true }).eq("tenant_id", tenant).gte("created_at", start).lte("created_at", end),
    isDesmobil ? sb.from("dm_messages").select("id", { count: "exact", head: true }).eq("kind", "offer").gte("created_at", start).lte("created_at", end) : zero,
    isDesmobil ? sb.from("sell_leads").select("id", { count: "exact", head: true }).eq("status", "purchased").gte("updated_at", start).lte("updated_at", end) : zero,
  ]);

  const metrics = {
    visitors: uniqSessions.size,
    sessions: sessions.length || uniqSessions.size,
    page_views: pageViews,
    events_total: events.length,
    events_by_type: byType,
    conversions,
    by_source: Object.fromEntries(Object.entries(bySource).sort((a, b) => b[1] - a[1]).slice(0, 20)),
    by_device: byDevice,
    top_listings: Object.fromEntries(Object.entries(topListings).sort((a, b) => b[1] - a[1]).slice(0, 15)),
    identified_events: identified,
    session_quality: {
      avg_duration: sessions.length ? Math.round(sessions.reduce((a, s) => a + (s.duration_sec ?? 0), 0) / sessions.length) : null,
      converted_sessions: sessions.filter(s => (s.event_types ?? []).some(t => CONVERSION_EVENTS.has(t))).length || converted.size,
      bounce: sessions.filter(s => s.is_bounce).length,
      utm_sessions: sessions.filter(s => s.utm_source).length,
    },
    funnel: {
      visits: uniqSessions.size,
      listing_views: views,
      engaged: engaged.size,
      leads: (sellLeads ?? 0) + (crmLeads ?? 0) + (dmOffers ?? 0),
      sell_leads: sellLeads ?? 0, crm_leads: crmLeads ?? 0, dm_offers: dmOffers ?? 0,
      won: won ?? 0,
    },
  };

  const { error } = await sb.from("anl_daily_snapshots").upsert({ tenant_id: tenant, date: dateStr, metrics });
  if (error) throw new Error(error.message);
  return metrics;
}

(async () => {
  const arg = process.argv[2];
  const days = [];
  if (arg === "--backfill") {
    const n = Number(process.argv[3] ?? 90);
    for (let i = 1; i <= n; i++) {
      const d = new Date(Date.now() - i * 86400e3);
      days.push(d.toISOString().slice(0, 10));
    }
  } else if (arg) {
    days.push(arg);
  } else {
    days.push(new Date(Date.now() - 86400e3).toISOString().slice(0, 10));
  }
  for (const day of days) {
    for (const t of TENANTS) {
      try {
        const m = await snapshotDay(t, day);
        console.log(`${day} t${t}: visitors=${m.visitors} pv=${m.page_views} conv=${m.conversions} leads=${m.funnel.leads}`);
      } catch (e) { console.error(`${day} t${t}: ERR`, e.message); }
    }
  }
  console.log("snapshot done");
})();

// Analytics flow + authored manuals for the cockpit screens (P7).
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");
fs.readFileSync(".env.local", "utf8").split("\n").forEach(l => {
  const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/"/g, "");
});
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const FLOW = {
  slug: "analytics-insight",
  name: "Analytics Insight Loop",
  screens: ["AN001", "AN002", "AN003", "AN004", "AN005", "AN006"],
  overview: "**Analytics Insight Loop** turns desmobil visitor activity into decisions. Data flows: storefront `/api/log` → dedicated `dm_activity_log`/`dm_activity_sessions` (fully separated from descamper) → nightly snapshot rollups (`anl_daily_snapshots`, cron 02:25) → six cockpits.\n\n**Chain:** **AN001** exec check → **AN004** where traffic comes from → **AN002** where it converts or drops → **AN003** why (session journeys) → **AN005** which listings work → **AN006** is the pipeline healthy.",
  steps: "1. **Morning (AN001):** KPIs with deltas, alert strip (SLA breaches, traffic anomalies, tracking-dead), top movers.\n2. **Acquisition (AN004):** sources vs previous period; UTM campaign table with per-campaign conversion — tag your ads with utm_* to appear here.\n3. **Funnel (AN002):** visits → listing views → engaged → leads (sell+crm+dm offers) → won; drop-off % per stage.\n4. **Diagnose (AN003):** cohort chips (converted / ≥3 listings / UTM / bounce), engagement scores, per-session journey timeline with dwell times — identified shoppers link to their dm-account.\n5. **Inventory (AN005):** views ranking with ⚠ no-contacts flags; slug drill-down for daily series.\n6. **Health (AN006):** green/amber/red checks, editable alert rules, 404s.",
  faq: [
    ["Why did numbers start at the split date?", "History was migrated (604 events / 61 sessions copied from the shared tables), so trends carry over. Descamper's tables are untouched — desmobil logs are fully separate now."],
    ["Where do snapshots come from?", "scripts/anl-snapshot.cjs runs nightly at 02:25 (crontab) and can backfill: `node scripts/anl-snapshot.cjs --backfill 90`."],
  ],
};

const DOCS = [
  ["AN001", "Executive Cockpit — the 60-second morning view", "KPI tiles (visitors, page/listing views, conversions, leads, won) with **deltas vs the previous period**, sparkline trends, an alert strip (SLA breaches from SA013, traffic anomalies, tracking-dead detection) and top listing movers. Data: `anl_daily_snapshots`."],
  ["AN002", "Conversion Funnel — visit → view → engage → lead → won", "Stage bars with per-stage conversion % and period deltas; lead source split (sell/crm/dm-offers); device mix; leads trend. The overall visit→lead and lead→won rates are printed under the funnel. Data: snapshots (funnel block)."],
  ["AN003", "Session Intelligence — cohorts and journey traces", "Engagement-scored session explorer (score = pages + duration + conversion bonus) with cohort chips and filters; click a session for its full event timeline with dwell times. Sessions of logged-in shoppers show the **identified shopper** card (uid from metadata). Data: `dm_activity_sessions` + `dm_activity_log`."],
  ["AN004", "Traffic & Acquisition — sources and campaigns", "Sources ranked with current-vs-previous comparison; **UTM campaign attribution** (sessions → conversions per campaign); devices; visitors trend. Campaigns appear when links carry utm_source/medium/campaign."],
  ["AN005", "Listing Performance — ranking and drill-down", "Views ranking from snapshots with **⚠ no contacts** actionability flags (views without dm-conversations); per-slug daily drill-down from raw events. Use it to find listings that attract eyes but no inquiries — price or photo problem."],
  ["AN006", "Quality Monitor — health checks and alert rules", "Threshold checks (events last hour/24h, 7d visitor baseline, 404 pages) with green/amber/red semantics; editable `anl_alert_rules` (toggle, threshold); top 404 list. Auto-refreshes every 60s."],
];

(async () => {
  await sb.from("bop_objects").upsert([{ object_id: "process:" + FLOW.slug, type: "process", module: "ANL", name: FLOW.name, status: "active", lifecycle_state: "active" }], { onConflict: "object_id", ignoreDuplicates: true });
  await sb.from("bop_dependencies").upsert(FLOW.screens.map(s => ({ from_id: "process:" + FLOW.slug, to_id: "screen:" + s, dep_type: "involves" })), { onConflict: "from_id,to_id,dep_type", ignoreDuplicates: true });

  await sb.from("bop_documentation").delete().eq("target_type", "process").eq("target_id", FLOW.slug);
  const rows = [
    { target_type: "process", target_id: FLOW.slug, doc_type: "overview", seq: 0, title: FLOW.name, body_md: FLOW.overview, status: "active", owner: "system" },
    { target_type: "process", target_id: FLOW.slug, doc_type: "steps", seq: 1, title: "The daily loop", body_md: FLOW.steps, status: "active", owner: "system" },
    ...FLOW.faq.map(([t, b], i) => ({ target_type: "process", target_id: FLOW.slug, doc_type: "faq", seq: i + 1, title: t, body_md: b, status: "active", owner: "system" })),
  ];
  for (const [id, title, body] of DOCS) {
    await sb.from("bop_documentation").delete().eq("target_type", "screen").eq("target_id", id);
    rows.push({ target_type: "screen", target_id: id, doc_type: "overview", seq: 0, title, body_md: body, status: "active", owner: "system" });
    rows.push({
      target_type: "screen", target_id: id, doc_type: "process", seq: 1,
      title: "Part of flow: " + FLOW.name,
      body_md: `This cockpit is a step in the **${FLOW.name}** (\`process:${FLOW.slug}\`) — the daily loop from raw desmobil activity to decisions.`,
      status: "active", owner: "system",
    });
  }
  const { error } = await sb.from("bop_documentation").insert(rows);
  console.log("analytics flow + manuals:", error ? error.message : rows.length + " rows");
})();

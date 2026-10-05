// Sync documentation for week 40 (2026-09-28 → 2026-10-05) enhancements
// into _screen_docs_en.json and generate bop_documentation upsert SQL.
//
// Enhancements covered:
//   1. SA017/SA018 — DM-INQ reference code on inquiry screens
//   2. SA017 — Date format fix (dd-mm-yyyy HH:mm with year)
//   3. Branding — 2E Terminal / Code Prompt logo concept (Shell, nav, footer, favicon)
//   4. GA4 + Cloudflare analytics sync endpoints (admin API)
//   5. i18n — portal translations unified, 10 locales complete, de/fr gaps filled
//   6. SY043 — TFE Flow Viewer already documented; no new doc needed
//
// Usage:
//   node scripts/sync-week-enhancements-2026w40.mjs          (dry-run: writes JSON + SQL files)
//   node scripts/sync-week-enhancements-2026w40.mjs --apply   (also upserts into Supabase)

import { readFileSync, writeFileSync } from "fs";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCS_PATH = path.join(__dirname, "_screen_docs_en.json");
const SQL_OUT = path.join(__dirname, "_week40_docs_upsert.sql");

const docs = JSON.parse(readFileSync(DOCS_PATH, "utf8"));
const existingIds = new Set(docs.map((d) => `${d.target_id}:${d.doc_type}:${d.seq}`));

const NEW_DOCS = [
  // ── SA017 Buyer Inquiries ────────────────────────────
  {
    target_id: "SA017",
    doc_type: "overview",
    seq: 0,
    title: "Buyer Inquiries — Inbox",
    body_md:
      "**Buyer Inquiries** (`SA017`) is the inbox for structured buyer questions submitted from desmobil listing pages. Route: `/console/sal/inquiries`.\n\n" +
      "Each inquiry carries question chips (intent tags), free-text, and contact details. " +
      "The list shows a **Ref** column (DM-INQ-XXXXXXXX) as the first column in orange monospace font, computed from the inquiry UUID.\n\n" +
      "**Key columns:** Ref · Listing · Intent tags · Contact · Status · Received (dd-mm-yyyy HH:mm)\n\n" +
      "**Statuses:** `new` → `seen` → `replied` → `closed` (or `converted` via CRM lead promotion on SA018).\n\n" +
      "**API:** `GET /api/bop/sal/inquiries` — returns inquiry list with computed `ref_code` field.",
  },
  {
    target_id: "SA017",
    doc_type: "reference",
    seq: 1,
    title: "APIs & data",
    body_md:
      "- `GET /api/bop/sal/inquiries` — returns `dm_inquiries` rows with computed `ref_code` (DM-INQ-XXXXXXXX from UUID prefix)\n" +
      "- `ref_code` is computed at API level: `DM-INQ-` + first 8 chars of UUID uppercased\n" +
      "- Received date format: `dd-mm-yyyy HH:mm` (includes year)\n" +
      "- Filter param: `?status=new|seen|replied|closed|converted`\n" +
      "- Table: `dm_inquiries` — columns: id, listing_id, question_codes, intent_tags, free_text, contact_name, contact_email, status, locale, created_at",
  },
  {
    target_id: "SA017",
    doc_type: "steps",
    seq: 2,
    title: "Recent enhancements (Oct 2026)",
    body_md:
      "**DM-INQ Reference Code** (6bf9050) — Each inquiry now has a computed reference code `DM-INQ-XXXXXXXX` displayed as the first column in orange monospace. Computed from the inquiry UUID, not stored.\n\n" +
      "**Date Format Fix** (fc3d83d) — Received date column now shows full year: `dd-mm-yyyy HH:mm` instead of `dd-mm HH:mm`.",
  },

  // ── SA018 Buyer Inquiry Detail ────────────────────────
  {
    target_id: "SA018",
    doc_type: "overview",
    seq: 0,
    title: "Buyer Inquiry Detail",
    body_md:
      "**Buyer Inquiry Detail** (`SA018`) shows the full detail view for a single buyer inquiry. Route: `/console/sal/inquiries/[id]`.\n\n" +
      "The page title displays the **DM-INQ reference code** (DM-INQ-XXXXXXXX). The detail card shows:\n" +
      "- Question chips with intent tags (general, b2b, inspection, logistics, technical)\n" +
      "- Contact information (name, email)\n" +
      "- **Acquisition source** and **traffic channel** fields\n" +
      "- Free-text message\n" +
      "- Status machine with transitions (new → seen → replied → closed)\n" +
      "- CRM lead promotion action\n\n" +
      "**API:** `GET /api/bop/sal/inquiries/[id]` — single inquiry with ref_code, acquisition_source, traffic_channel.",
  },
  {
    target_id: "SA018",
    doc_type: "steps",
    seq: 1,
    title: "Recent enhancements (Oct 2026)",
    body_md:
      "**DM-INQ Reference Code** (6bf9050) — ref_code displayed in page title and listing card header.\n\n" +
      "**Acquisition & Traffic Fields** (6bf9050) — Now shows `acquisition_source` and `traffic_channel` on the detail card, giving visibility into where the inquiry originated.",
  },

  // ── Branding — platform-level doc ────────────────────
  {
    target_id: "platform-branding",
    doc_type: "overview",
    seq: 0,
    title: "2E Terminal / Code Prompt — Brand Identity",
    body_md:
      "**Brand refresh (Oct 2026):** The BOP console and public site now use the **>_ des.systems** terminal-style logo concept.\n\n" +
      "**Elements:**\n" +
      "- Logo: `>_` prompt in brand blue (#3B82F6) + `des` in dark + `.systems` with blue dot\n" +
      "- Font: **IBM Plex Mono** (loaded via `next/font/google`, CSS variable `--font-ibm-plex-mono`)\n" +
      "- Tagline: `BUSINESS OPERATING PLATFORM` in tracked uppercase\n" +
      "- Favicon: navy rounded square with blue `>_` prompt (SVG at `app/icon.svg`)\n" +
      "- Dark/light theme support on all logo elements\n\n" +
      "**Files changed:**\n" +
      "- `components/Shell.tsx` — console header logo\n" +
      "- `components/nav.tsx` — public site navigation logo\n" +
      "- `components/footer.tsx` — public site footer logo\n" +
      "- `app/icon.svg` — favicon\n" +
      "- `app/layout.tsx` — IBM Plex Mono font registration",
  },

  // ── GA4 + Cloudflare Sync Endpoints ──────────────────
  {
    target_id: "BO018",
    doc_type: "steps",
    seq: 2,
    title: "GA4 Sync Endpoint (Oct 2026)",
    body_md:
      "**New endpoint:** `POST /api/admin/ga4/sync`\n\n" +
      "Fetches Google Analytics 4 Data API for all tenants with `ga4_property_id` configured in `bop_tenants`, writes daily metrics to the `ga4_analytics` table.\n\n" +
      "**Auth:** `x-studio-worker-secret` header\n" +
      "**Params:** `?tenant_id=N` (optional, sync single tenant), `?days=30` (lookback window)\n" +
      "**Mechanism:** JWT auth via Google service account (`lib/ga4-data.ts`), fetches GA4 runReport with dimensions: date, sessionDefaultChannelGrouping; metrics: sessions, activeUsers, screenPageViews, conversions, totalRevenue.\n\n" +
      "**File:** `app/api/admin/ga4/sync/route.ts` + `lib/ga4-data.ts`",
  },
  {
    target_id: "BO019",
    doc_type: "steps",
    seq: 2,
    title: "Cloudflare Analytics Sync Endpoint (Oct 2026)",
    body_md:
      "**New endpoint:** `POST /api/admin/cloudflare/sync`\n\n" +
      "Fetches Cloudflare GraphQL Analytics API (`httpRequests1dGroups`) for all tenants with `cloudflare_zone_id` configured in `bop_tenants`, upserts daily metrics into `cloudflare_analytics`.\n\n" +
      "**Auth:** `x-studio-worker-secret` header\n" +
      "**Params:** `?tenant_id=N` (optional), `?days=30` (lookback)\n" +
      "**Metrics:** requests, pageViews, threats, bandwidth, unique visitors, country breakdown, status code breakdown, content type breakdown.\n\n" +
      "**File:** `app/api/admin/cloudflare/sync/route.ts`",
  },

  // ── SY043 TFE Flow Viewer (missing from docs seed) ────
  {
    target_id: "SY043",
    doc_type: "overview",
    seq: 0,
    title: "TFE Flow Viewer",
    body_md:
      "**TFE Flow Viewer** (`SY043`) is an interactive visual guide to the Trade Flow Engine. Route: `/console/sys/tfe-flow`.\n\n" +
      "**Tabs:**\n" +
      "- **Pipeline & Status Machines** — 7-object document pipeline (Lead → Quotation → Order → Invoice → Handover → Warranty → Survey) plus Sell Lead. Click any object to see its status machine, transitions, guards, and RPCs.\n" +
      "- **Acquisition Funnel** — Sell Lead system: state machine diagram, Comm Center V2 email pipeline (SL-001 to SL-005), token map, ref code generation, file map.\n" +
      "- **DES Shop E-Commerce** — Cart → Order → Payment → Fulfilment → Shipment pipeline with Mollie/Sendcloud integrations, email triggers, and screen/API maps.\n" +
      "- **Short-Link Attribution** — link tracking and attribution flow.\n" +
      "- **Guard Rails** — RPC-enforced status changes, audit trail, adjacency tables, OLS vehicle locking, customer approvals, doc-flow integrity.\n" +
      "- **Doc-Flow Relations** — converted, replaced, spawned, reversed, partial relation types.\n\n" +
      "**Cross-links:** SY034 Documentation Browser links visual flow docs to SY043 via `VISUAL_FLOW_MAP` (trade-flow-engine, sell-lead-acquisition, desshop-commerce, shortlink-attribution).",
  },
  {
    target_id: "SY043",
    doc_type: "reference",
    seq: 1,
    title: "Business objects modeled",
    body_md:
      "**TFE Pipeline (7 objects):**\n" +
      "- `crm_leads` (Lead) — CRM module, field: stage\n" +
      "- `sal_quotations` (Quotation) — SAL module, field: status\n" +
      "- `sal_orders` (Order) — SAL module, field: status\n" +
      "- `fin_invoices` (Invoice) — FIN module, field: status\n" +
      "- `sal_handovers` (Handover) — SAL module, field: status\n" +
      "- `sal_warranties` (Warranty) — POST module, field: status\n" +
      "- `sal_surveys` (Survey) — POST module, field: status\n\n" +
      "**Sell Lead (standalone):** `sell_leads` — SAL module, field: status. State machine enforced at app layer, not via RPC guards.\n\n" +
      "**DES Shop Pipeline (5 objects):**\n" +
      "- `shop_carts` (Cart), `shop_orders` (Order), `shop_payments` (Payment), `shop_allocations` (Fulfilment), `shop_shipments` (Shipment) — SHP module\n\n" +
      "**No dedicated API** — SY043 is a purely client-side visualization. SQL mapping associates it with sell-leads API routes.",
  },

  // ── i18n Portal Unification ──────────────────────────
  {
    target_id: "platform-i18n",
    doc_type: "overview",
    seq: 0,
    title: "Internationalization — Portal & Console",
    body_md:
      "**i18n architecture** uses `next-intl` with centralized message files under `messages/{lang}.json`.\n\n" +
      "**Supported locales (10):** en, nl, de, fr, tr, ro, bg, el, es, it\n" +
      "**Config:** `i18n/config.ts` registers all 10 locales with display labels.\n\n" +
      "**Console:** nav labels use `tn('keyName')`, group labels use `tg('groupKey')`, screen titles under `\"screens\"` namespace — all in `messages/{lang}.json`.\n\n" +
      "**Portal:** portal-facing labels read from `messages/{lang}.json` under the `\"portal\"` namespace (61 keys). Previously had a separate `lib/portal/labels.ts` — now unified into the centralized files.",
  },
  {
    target_id: "platform-i18n",
    doc_type: "steps",
    seq: 1,
    title: "i18n Unification (Oct 2026)",
    body_md:
      "**Portal namespace added** (722b31e) — 61 portal keys added to en, nl, de, fr message files. `lib/portal/labels.ts` now reads from centralized `messages/*.json` instead of its own hardcoded map.\n\n" +
      "**10 locales complete** — Expanded tr, ro, bg, el, es, it locale files with full key coverage from en.json baseline.\n\n" +
      "**de/fr gaps filled** — 132 missing keys backfilled from en.json into de.json and fr.json.\n\n" +
      "**Files:** `messages/*.json` (12 files, ~9800 lines changed), `i18n/config.ts`, `lib/portal/labels.ts`",
  },
];

// ── Merge into _screen_docs_en.json ────────────────────
let added = 0;
let updated = 0;
for (const newDoc of NEW_DOCS) {
  const key = `${newDoc.target_id}:${newDoc.doc_type}:${newDoc.seq}`;
  const idx = docs.findIndex(
    (d) =>
      d.target_id === newDoc.target_id &&
      d.doc_type === newDoc.doc_type &&
      d.seq === newDoc.seq
  );
  if (idx >= 0) {
    docs[idx] = { ...docs[idx], ...newDoc };
    updated++;
  } else {
    docs.push({ doc_id: randomUUID(), ...newDoc });
    added++;
  }
}

writeFileSync(DOCS_PATH, JSON.stringify(docs, null, 2) + "\n");
console.log(
  `_screen_docs_en.json: ${added} added, ${updated} updated (total ${docs.length})`
);

// ── Generate SQL for bop_documentation upsert ──────────
const escSql = (s) => s.replace(/'/g, "''");
const sqlLines = [
  "-- Week 40 (2026-09-28 → 2026-10-05) documentation upserts",
  "-- Generated by sync-week-enhancements-2026w40.mjs",
  "-- Run with: bash /root/scripts/des-sql.sh --commit < scripts/_week40_docs_upsert.sql",
  "",
  "BEGIN;",
  "",
];

for (const d of NEW_DOCS) {
  const targetType = d.target_id.startsWith("platform-")
    ? "platform"
    : "screen";
  const mod = d.target_id.startsWith("SA")
    ? "SAL"
    : d.target_id.startsWith("BO")
      ? "BOP"
      : d.target_id.startsWith("SY")
        ? "SYS"
        : null;
  const relatedScreens = d.target_id.startsWith("platform-")
    ? "NULL"
    : `ARRAY['${d.target_id}']`;

  sqlLines.push(`INSERT INTO bop_documentation (target_type, target_id, doc_type, seq, title, body_md, status, owner, version, module, related_screens)
VALUES ('${targetType}', '${escSql(d.target_id)}', '${d.doc_type}', ${d.seq},
  '${escSql(d.title)}',
  '${escSql(d.body_md)}',
  'active', 'system', 1, ${mod ? `'${mod}'` : "NULL"}, ${relatedScreens})
ON CONFLICT (target_type, target_id, doc_type, seq)
DO UPDATE SET title = EXCLUDED.title, body_md = EXCLUDED.body_md,
  status = 'active', owner = 'system', version = bop_documentation.version + 1,
  module = EXCLUDED.module, updated_at = now();
`);
}

sqlLines.push("COMMIT;");
writeFileSync(SQL_OUT, sqlLines.join("\n"));
console.log(`SQL written to: ${SQL_OUT}`);

// ── Optional: apply to Supabase directly ───────────────
if (process.argv.includes("--apply")) {
  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  for (const d of NEW_DOCS) {
    const targetType = d.target_id.startsWith("platform-")
      ? "platform"
      : "screen";
    const mod = d.target_id.startsWith("SA")
      ? "SAL"
      : d.target_id.startsWith("BO")
        ? "BOP"
        : d.target_id.startsWith("SY")
          ? "SYS"
          : null;

    const { data: existing } = await sb
      .from("bop_documentation")
      .select("doc_id, version")
      .eq("target_type", targetType)
      .eq("target_id", d.target_id)
      .eq("doc_type", d.doc_type)
      .eq("seq", d.seq)
      .maybeSingle();

    if (existing) {
      await sb
        .from("bop_documentation")
        .update({
          title: d.title,
          body_md: d.body_md,
          status: "active",
          owner: "system",
          version: (existing.version ?? 1) + 1,
          module: mod,
        })
        .eq("doc_id", existing.doc_id);
      console.log(`  updated ${d.target_id} (${d.doc_type}#${d.seq})`);
    } else {
      await sb.from("bop_documentation").insert({
        target_type: targetType,
        target_id: d.target_id,
        doc_type: d.doc_type,
        seq: d.seq,
        title: d.title,
        body_md: d.body_md,
        status: "active",
        owner: "system",
        version: 1,
        module: mod,
      });
      console.log(`  inserted ${d.target_id} (${d.doc_type}#${d.seq})`);
    }
  }
  console.log("Supabase upsert complete.");
}

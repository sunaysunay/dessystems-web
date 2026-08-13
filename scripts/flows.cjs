// Business-flow documentation layer.
// Integration model:
//   bop_objects:        type='process', object_id='process:<slug>' — flows are
//                       first-class catalog objects like screens/apis/tables.
//   bop_dependencies:   ('process:<slug>' → 'screen:XX000', dep_type='involves')
//                       — impact graph: which screens participate in which flow.
//   bop_documentation:  target_type='process', target_id='<slug>' — the flow
//                       manual itself (overview + steps + faq);
//                       target_type='screen', doc_type='process' — the link
//                       shown inside each participating screen's help panel.
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");
fs.readFileSync(".env.local", "utf8").split("\n").forEach(l => {
  const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/"/g, "");
});
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const FLOWS = [
  {
    slug: "sell-acquisition",
    name: "Sell Acquisition (Inkoop)",
    screens: ["SA013", "SA014", "MP001", "MP003"],
    overview:
`**Sell Acquisition** is DES's vehicle buying funnel: a seller on desmobil.com submits their vehicle, DES responds with a personal offer within **2 business hours**, and purchased vehicles become marketplace listings. Revenue = trade-to-retail margin.

**Chain:** desmobil \`/sell\` wizard → \`sell_leads\` → **SA013** triage → **SA014** offer & negotiation → \`purchased\` → listing creation in **MP001/MP003**.`,
    steps:
`1. **Seller submits** on desmobil.com/sell: NL plate (RDW auto-fill) or manual entry, vehicle type, 5 questions, photos (optional), contact + asking price. Lead ref \`SL-YYYY-NNNNN\`; internal alert + seller confirmation emails fire automatically.
2. **Triage (SA013):** work red SLA badges first — the 2-hour promise is the differentiator. Open the lead.
3. **Evaluate (SA014):** review vehicle/RDW data, five answers, photos. Set internal valuation low/high.
4. **Offer (SA014):** enter our offer € → **Send offer email** (template C, 7-day validity, seller's locale). Status → \`offer_sent\`.
5. **Negotiate:** by phone/WhatsApp/email reply. Track via status machine: \`negotiating → accepted → purchased\` (exits: declined_by_us, rejected_by_seller, expired, lost). Every change is event-logged.
6. **Convert:** after \`purchased\`, create the listing in **MP001/MP003** — the lead's \`category_code\` maps directly to the listing taxonomy (one-click promote is a planned Phase 2 feature).`,
    faq: [
      ["Where do leads come from?", "The desmobil.com /sell wizard (source `web`). The funnel is dev-gated by `SELL_FUNNEL_ENABLED` until launch. WhatsApp/phone leads can be entered manually later."],
      ["What guards lead quality?", "Honeypot field, 5 submissions/hour/IP rate limit, RDW verification for NL plates, and photo evidence. Junk rarely survives all four."],
    ],
  },
  {
    slug: "buyer-messaging",
    name: "Buyer Messaging & Offers",
    screens: ["SA015", "SA016", "CR001"],
    overview:
`**Buyer Messaging** keeps all buyer↔DES conversations on-platform — the buyer's email is never exposed, every message is auditable, and offers become CRM pipeline entries automatically.

**Chain:** desmobil listing → **Contact Seller** (login required) → \`dm_conversations\` (one thread per buyer × listing) → **SA015** inbox → **SA016** reply → offer messages mirror into \`crm_leads\` (**CR001**).`,
    steps:
`1. **Buyer writes** from a listing page (verified account required). Quick actions: *Is it still available?* / *Request call* / *Make offer €*.
2. **Notification:** internal alert email with console deep link. First messages containing URLs/phone numbers arrive **flagged** (scam pattern).
3. **Reply (SA016):** answer as DESMOBIL — buyer gets an email with a deep link back to their desmobil account inbox (content never travels by email).
4. **Offers:** arrive as structured messages AND create a \`crm_leads\` row with \`expected_value\` — pipeline in **CR001**.
5. **Verify dealers (SA016):** business buyers show amber *UNVERIFIED* until you check KVK/VAT and press **Verify dealer** (sets \`dealer_verified\` — the future gate for dealer capabilities).
6. **Close/Block:** finished threads → Close; abuse → Block (buyer can no longer post).`,
    faq: [
      ["Why on-platform only?", "Anti-fraud (content scanning, flagging), auditability, and platform stickiness — the mobile.de/Marktplaats pattern. Email notifications carry links, never content."],
      ["What does the 10th crm_lead trigger?", "The frozen MCP build revisit reminder — offers mirroring into crm_leads count toward it."],
    ],
  },
  {
    slug: "dm-account-journey",
    name: "DESMOBIL Account Journey",
    screens: ["SA015", "SA016"],
    overview:
`**Account Journey** is the desmobil end-user lifecycle: anonymous browsing → registration nudge → logged-in retention loop (favorites, saved-search alerts, messaging).

**Chain:** anonymous favorites (localStorage) → magic-link/Google login (\`dm_profiles\` trigger) → favorites/recent-views **merge** → saved searches + hourly alert cron → conversations → console **SA015/SA016**.`,
    steps:
`1. **Anonymous:** hearts and recently-viewed work without an account (localStorage) — zero friction.
2. **Registration driver:** "log in to keep your saved vehicles" — the #1 conversion trick of every major marketplace. Magic link primary (no passwords), Google secondary, dealer/business checkbox.
3. **Merge on first login:** localStorage favorites + recent views upsert into \`dm_favorites\` (with \`price_at_save\` for drop alerts).
4. **Retention loop:** saved searches (instant/daily/weekly) + price-drop alerts — \`scripts/dm-alerts.mjs\` hourly cron emails matches with deep links.
5. **Engagement:** Contact Seller / Make Offer require the account — feeding the Buyer Messaging flow (SA015/SA016).
6. **Trust ladder:** private → business (self-declared) → verified dealer (console-set) — self-declaration never grants capabilities.`,
    faq: [
      ["Where do shopper accounts live?", "Same Supabase project as staff (`auth.users`) but a separate `dm_profiles` table — one DES Group identity, different lifecycle. RLS owner-only is the entire storefront ACL."],
    ],
  },
];

(async () => {
  // 1) register processes in bop_objects + involvement edges
  const objs = FLOWS.map(f => ({
    object_id: "process:" + f.slug, type: "process", module: "BOP",
    name: f.name, route: null, status: "active", lifecycle_state: "active",
  }));
  await sb.from("bop_objects").upsert(objs, { onConflict: "object_id", ignoreDuplicates: true });
  const edges = FLOWS.flatMap(f => f.screens.map(s => ({
    from_id: "process:" + f.slug, to_id: "screen:" + s, dep_type: "involves",
  })));
  await sb.from("bop_dependencies").upsert(edges, { onConflict: "from_id,to_id,dep_type", ignoreDuplicates: true });
  console.log("processes registered:", objs.length, "| involvement edges:", edges.length);

  // 2) flow manuals (target_type='process') — replace previous system-owned
  await sb.from("bop_documentation").delete().eq("target_type", "process").eq("owner", "system");
  const rows = [];
  for (const f of FLOWS) {
    rows.push({ target_type: "process", target_id: f.slug, doc_type: "overview", seq: 0, title: f.name, body_md: f.overview, status: "active", owner: "system" });
    rows.push({ target_type: "process", target_id: f.slug, doc_type: "steps", seq: 1, title: "End-to-end flow", body_md: f.steps, status: "active", owner: "system" });
    f.faq.forEach(([t, b], i) => rows.push({ target_type: "process", target_id: f.slug, doc_type: "faq", seq: i + 1, title: t, body_md: b, status: "active", owner: "system" }));
  }

  // 3) per-screen flow links (doc_type='process' inside each screen's manual)
  const perScreen = {};
  for (const f of FLOWS) for (const s of f.screens) (perScreen[s] ??= []).push(f);
  const screenIds = Object.keys(perScreen);
  await sb.from("bop_documentation").delete().eq("target_type", "screen").eq("doc_type", "process").in("target_id", screenIds).eq("owner", "system");
  for (const [sid, flows] of Object.entries(perScreen)) {
    flows.forEach((f, i) => {
      const step = f.steps.split("\n").find(l => l.includes(sid)) ?? "";
      rows.push({
        target_type: "screen", target_id: sid, doc_type: "process", seq: i + 1,
        title: "Part of flow: " + f.name,
        body_md: `This screen is a step in the **${f.name}** business flow (\`process:${f.slug}\`).\n\n${f.overview.split("\n\n")[1] ?? ""}${step ? "\n\nThis screen's step: " + step.replace(/^\d+\.\s*/, "") : ""}`,
        status: "active", owner: "system",
      });
    });
  }
  const { error } = await sb.from("bop_documentation").insert(rows);
  console.log("docs:", error ? error.message : rows.length + " rows (flow manuals + per-screen links)");
})();

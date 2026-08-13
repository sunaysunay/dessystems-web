// Business flows — wave 2: eight flows covering the operational core.
// Same integration as flows.cjs: bop_objects(process) + involves edges +
// process manuals + per-screen process links.
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");
fs.readFileSync(".env.local", "utf8").split("\n").forEach(l => {
  const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/"/g, "");
});
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const FLOWS = [
  {
    slug: "listing-lifecycle", name: "Listing Lifecycle",
    screens: ["IN002", "IN006", "IN003", "MP001", "MP003", "MP004", "MP002"],
    overview: "**Listing Lifecycle** takes a vehicle from taxonomy to published listing to performance review.\n\n**Chain:** brand/model catalog (**IN002/IN006**) + category tree (**IN003**) → create in **MP001** Listing Manager → enrich in **MP003** (content, media, specs, pricing — under Object Lock) → **MP004** Channel Publisher → **MP002** Channel Analytics.",
    steps: "1. **Prerequisites:** brand exists in **IN002**, model in **IN006**, category/body type in **IN003** (numeric codes: main 1000-step, sub 4-digit).\n2. **Create (MP001):** new listing gets a ref_no business key (YYWWNN pattern planned) and lands in draft.\n3. **Enrich (MP003):** content per locale, photos via the sharp ingest pipeline (EXIF rotate, GPS strip), category-tagged media, specs per vehicle type (van/car tables), pricing. The screen takes an **exclusive object lock** — others see a read-only banner (SY032 monitors locks).\n4. **Publish (MP004):** push to channels; workflow_status → published makes it visible on desmobil.com.\n5. **Review (MP002):** channel performance; storefront view/click events feed the analytics.",
    faq: [["Why is a listing read-only?", "Another session holds the object lock (SAP-style enqueue). Wait for the banner to clear, or force-release in SY032 Lock Monitor if the holder is gone."]],
  },
  {
    slug: "lead-to-order", name: "Lead to Order (Sales Pipeline)",
    screens: ["CR001", "CR002", "CR006", "SA003", "SA001", "SA002", "SA009", "SA010", "SA005"],
    overview: "**Lead to Order** is the buy-side sales pipeline: an interested customer becomes a paying one.\n\n**Chain:** **CR001/CR002** lead intake & qualification → **CR006** pipeline kanban → **SA003** Quote Builder → **SA001/SA002** quotation follow-up → **SA009/SA010** order → **SA005** payments.",
    steps: "1. **Capture (CR001):** leads arrive from storefront forms, desmobil offers (buyer messaging mirror), phone and email. Qualify in **CR002**.\n2. **Track (CR006):** move the lead across pipeline stages on the kanban.\n3. **Quote (SA003):** build line items (vehicle, options, fees, BTW rates) → send.\n4. **Follow up (SA001/SA002):** quotation status draft → sent → accepted/rejected/expired.\n5. **Order (SA009/SA010):** accepted quote converts to an order; track fulfilment.\n6. **Collect (SA005):** register payments against the order until settled.",
    faq: [["Where do desmobil offers appear?", "Buyer offers from the messaging flow create crm_leads rows automatically with expected_value — they enter this pipeline at step 1."]],
  },
  {
    slug: "order-to-cash", name: "Order to Cash (Finance)",
    screens: ["SA009", "FI004", "FI011", "FI002", "FI009", "FI003"],
    overview: "**Order to Cash** turns fulfilled orders into invoiced, collected revenue and P&L truth.\n\n**Chain:** **SA009** order → **FI004** Facturen (invoice creation) → **FI011** Invoice Detail → **FI002** Payment Tracking → **FI009** Winst & Verlies / **FI003** Rapporten.",
    steps: "1. **Invoice (FI004):** create the invoice from the order — BTW handling per line (21%/9%/0%, marge regime for used vehicles where applicable).\n2. **Detail (FI011):** line items, credit notes, PDF output, email to customer.\n3. **Track (FI002):** open/paid/overdue; reminders on overdue.\n4. **Close the loop (FI009/FI003):** revenue lands in P&L and periodic reports; **FI012** covers the supplier (AP) side.",
    faq: [["BTW vs marge invoicing?", "Vehicle sales may fall under the margin scheme (no BTW shown, tax on margin only) — set per line/vehicle; FI008 BTW Assistent AI helps classify edge cases."]],
  },
  {
    slug: "vehicle-asset-lifecycle", name: "Vehicle Asset Lifecycle",
    screens: ["AS001", "AS002", "AS003", "AS004", "LG001", "WR001"],
    overview: "**Vehicle Asset Lifecycle** tracks owned stock from intake to sale: costs, work, movements.\n\n**Chain:** **AS001** inventory intake → **AS002** Vehicle 360 (single source of truth per unit) → **AS003** lifecycle stages → **AS004** cost tracking → **LG001** transport jobs → **WR001** work orders (recon/repair).",
    steps: "1. **Intake (AS001):** vehicle enters stock (purchase, trade-in from the sell-acquisition flow, consignment).\n2. **360 view (AS002):** documents, history, linked listing, costs, tasks per vehicle.\n3. **Stage (AS003):** intake → recon → photo → listed → reserved → sold → delivered.\n4. **Costs (AS004):** every euro against the unit — purchase, transport, recon, fees — feeding true margin (OP003 Profit Lab).\n5. **Move (LG001):** transport jobs for pickup/delivery.\n6. **Work (WR001):** recon and repair orders with status and cost capture.",
    faq: [["Where does trade-in stock come from?", "Purchased sell-acquisition leads (SA014 status purchased) become inventory here — the lead's data and photos carry over."]],
  },
  {
    slug: "auction-trading", name: "Auction Trading",
    screens: ["AU001", "AU002", "AU004"],
    overview: "**Auction Trading** covers dealer-side buying/selling via auctions.\n\n**Chain:** **AU001** Auction Manager (create/monitor) → **AU002** Auction Detail (lots, terms, timing) → **AU004** Bidding Console (live bids).",
    steps: "1. **Set up (AU001):** create the auction, add lots, define reserve prices and windows.\n2. **Manage (AU002):** lot detail, bidder activity, extend/close.\n3. **Bid (AU004):** live console — current price, increments, auto-bid, time remaining.\n4. **Settle:** winning bids flow into orders/finance; unsold lots relist or exit.",
    faq: [["Is this the desmobil sell funnel?", "No — the desmobil /sell funnel is direct purchase (DES buys). Auctions are the separate dealer-trading module; the storefront explicitly has no bidding."]],
  },
  {
    slug: "access-governance", name: "Access Governance (IAM)",
    screens: ["SY020", "SY011", "SY002", "SY021", "SY022", "SY016", "SY012"],
    overview: "**Access Governance** is the SAP-GRC-style identity cycle: request → grant → verify → recertify → audit.\n\n**Chain:** **SY020** access request workflow → **SY011/SY002** role assignment (RBAC + catalog) → **SY021** SoD conflict check → **SY022** periodic recertification → **SY016/SY012** audit trail.",
    steps: "1. **Request (SY020):** user requests roles; approver workflow.\n2. **Grant (SY011):** assign roles from the **SY002** catalog; PBAC permissions follow `<domain>.<resource>.<action>`.\n3. **Check (SY021):** SoD report flags toxic combinations (e.g. create vendor + approve payment).\n4. **Recertify (SY022):** periodic manager attestation of who still needs what.\n5. **Audit (SY016/SY012):** every access change is logged; SY015 User Cockpit for per-user drill-down.",
    faq: [["Who can force-release locks or bypass guards?", "super_admin only — and core-table DDL is additionally blocked by the bop_protected_tables guard regardless of role."]],
  },
  {
    slug: "ai-marketing", name: "AI Marketing & Intelligence",
    screens: ["MK001", "MK002", "MK003", "MK005", "MK006", "AI003", "AI005"],
    overview: "**AI Marketing** turns market intelligence into campaigns.\n\n**Chain:** **MK001** overview → **MK002** market evaluation / **MK003** competitor activity / **MK005** listing intelligence → **MK006** AI Campaigns (generation + scheduling, shared bop_mkt_* tables with descamper) → prompts/models governed in **AI003/AI005**.",
    steps: "1. **Read the market (MK002/MK003):** pricing position, competitor moves, demand signals.\n2. **Per-listing intel (MK005):** which listings under/over-perform and why.\n3. **Campaign (MK006):** AI-generated content per channel and locale; approve → schedule → publish.\n4. **Govern (AI003/AI005):** prompt versions and model configuration; **AI004** audits every AI action.",
    faq: [["Campaigns fail with 401?", "The bop_ai_agents Anthropic key is invalid/expired — replace it in AI005 Model Configuration."]],
  },
  {
    slug: "dev-lifecycle", name: "Development Lifecycle (DLM)",
    screens: ["DV002", "DV003", "DV004", "DV005", "DV006", "DV007"],
    overview: "**Development Lifecycle** governs how changes reach production.\n\n**Chain:** **DV002** enhancement intake → **DV003** production queue → **DV004** commits → **DV005** releases → **DV006** deployments (promote.sh log) → **DV007** definition audit (registry completeness gate).",
    steps: "1. **Intake (DV002):** enhancement/bug with priority and scope.\n2. **Queue (DV003):** approved work ordered for build.\n3. **Build (DV004):** commits land on dev (:4401); single-line subjects feed the handoff hook.\n4. **Release (DV005/DV006):** promote.sh syncs dev → prod (:4400) and logs the deployment.\n5. **Gate (DV007):** run the audit after each build wave — every new screen must be registered, wired, documented, and in a flow before it counts as done (populate-definition rule).",
    faq: [["Why did my new screen not appear in the menu?", "Navigation is DB-driven from bop_screens.nav_* — register nav_group/nav_order/nav_visible (Menu Config SY019), not just code."]],
  },
];

(async () => {
  const objs = FLOWS.map(f => ({
    object_id: "process:" + f.slug, type: "process", module: "BOP",
    name: f.name, route: null, status: "active", lifecycle_state: "active",
  }));
  await sb.from("bop_objects").upsert(objs, { onConflict: "object_id", ignoreDuplicates: true });
  const edges = FLOWS.flatMap(f => f.screens.map(s => ({
    from_id: "process:" + f.slug, to_id: "screen:" + s, dep_type: "involves",
  })));
  const { error: ee } = await sb.from("bop_dependencies").upsert(edges, { onConflict: "from_id,to_id,dep_type", ignoreDuplicates: true });
  console.log("wave2 processes:", objs.length, "| edges:", edges.length, ee ? "EDGE ERR " + ee.message : "");

  const slugs = FLOWS.map(f => f.slug);
  await sb.from("bop_documentation").delete().eq("target_type", "process").in("target_id", slugs);
  const rows = [];
  for (const f of FLOWS) {
    rows.push({ target_type: "process", target_id: f.slug, doc_type: "overview", seq: 0, title: f.name, body_md: f.overview, status: "active", owner: "system" });
    rows.push({ target_type: "process", target_id: f.slug, doc_type: "steps", seq: 1, title: "End-to-end flow", body_md: f.steps, status: "active", owner: "system" });
    f.faq.forEach(([t, b], i) => rows.push({ target_type: "process", target_id: f.slug, doc_type: "faq", seq: i + 1, title: t, body_md: b, status: "active", owner: "system" }));
  }
  const perScreen = {};
  for (const f of FLOWS) for (const s of f.screens) (perScreen[s] ??= []).push(f);
  const screenIds = Object.keys(perScreen);
  // remove only OUR wave-2 links (title match) to stay idempotent without touching wave 1
  for (const f of FLOWS) {
    await sb.from("bop_documentation").delete().eq("target_type", "screen").eq("doc_type", "process")
      .eq("title", "Part of flow: " + f.name);
  }
  for (const [sid, flows] of Object.entries(perScreen)) {
    flows.forEach(f => {
      const stepLine = f.steps.split("\n").find(l => l.includes(sid)) ?? "";
      rows.push({
        target_type: "screen", target_id: sid, doc_type: "process", seq: 10 + FLOWS.indexOf(f),
        title: "Part of flow: " + f.name,
        body_md: "This screen is a step in the **" + f.name + "** business flow (`process:" + f.slug + "`).\n\n" +
          (f.overview.split("\n\n")[1] ?? "") +
          (stepLine ? "\n\nThis screen's step: " + stepLine.replace(/^\d+\.\s*/, "") : ""),
        status: "active", owner: "system",
      });
    });
  }
  const { error } = await sb.from("bop_documentation").insert(rows);
  console.log("wave2 docs:", error ? error.message : rows.length + " rows | screens linked: " + screenIds.length);
})();

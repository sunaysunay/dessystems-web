import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Link } from "@/src/i18n/routing"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { dxCss } from "@/components/dx-styles"

/* ── Article data ─────────────────────────────────────────────────────────── */

type Section =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "list"; items: string[] }
  | { type: "quote"; text: string; attr?: string }
  | { type: "callout"; label: string; text: string }
  | { type: "table"; head: string[]; rows: string[][] }

interface Article {
  slug: string
  category: string
  readTime: string
  date: string
  author: string
  title: string
  intro: string
  gradient: string
  thumbLabel: string
  sections: Section[]
}

const articles: Article[] = [
  {
    slug: "s4hana-2027-deadline",
    category: "SAP & ERP",
    readTime: "12 min read",
    date: "August 2026",
    author: "DES Systems SAP Practice",
    gradient: "linear-gradient(135deg,#0f3d7a,#1d6cf0 70%,#4d8bff)",
    thumbLabel: "S/4",
    title: "The 2027 ECC deadline is closer than your roadmap thinks",
    intro: "SAP confirmed it and hasn't moved it: mainstream maintenance for ECC ends December 31, 2027. No extensions. After that date, SAP will no longer issue security patches, legal updates, or compliance corrections for ECC 6.0. What most mid-market manufacturers are underestimating is that a disciplined S/4HANA migration takes 12–18 months minimum — which means that if you haven't started by now, your window is closing fast.",
    sections: [
      { type: "h2", text: "What actually ends in 2027" },
      { type: "p", text: "Mainstream maintenance ending means SAP stops delivering new security patches, regulatory corrections (tax and legal changes), and quality patches for ECC. Customers who stay on ECC after December 2027 automatically fall into Customer-Specific Maintenance — same invoice, but no new fixes. You're paying to stand still on an unpatched system." },
      { type: "p", text: "SAP offers Extended Maintenance until 2030, but at a price premium and still no new functional development. Extended maintenance buys breathing room, not a solution. Every organisation we talk to that has gone the extended route is planning their migration anyway — they've just pushed the same work into a shorter, more pressured window." },
      { type: "callout", label: "The maths", text: "Over 17,000 ECC customers globally have not yet licensed S/4HANA. The average mid-market migration (500–5,000 users) takes 12–18 months. Companies starting in Q3 2026 have 15 months to December 2027 — tight, not impossible, but only if they start now with a clear scope." },
      { type: "h2", text: "Why mid-market timelines are longer than you think" },
      { type: "p", text: "Enterprise migration estimates are built from large-programme experience. Mid-market programmes are proportionally slower, not faster — they run with smaller teams, fewer dedicated resources, and less ability to freeze business change during the migration. The things that blow timelines are almost always the same: poor master data quality discovered late, custom Z-code that nobody documented, and a business that keeps adding scope." },
      { type: "list", items: [
        "Master data remediation typically consumes 20–30% of total project time and is almost always underestimated",
        "Average SAP systems carry 40–60% dead custom code (Z-reports, modifications) that must be assessed for S/4HANA compatibility",
        "Licence sizing done before process redesign produces numbers that need to be redone after go-live",
        "Change management in mid-market runs lean — training and cutover plans are often left until the last quarter",
      ]},
      { type: "h2", text: "The migration approach that works: data first, processes second, licences last" },
      { type: "p", text: "Every programme we've delivered that stayed on schedule started with a data-first phase before any system configuration began. Clean material masters, vendor records, and open items make everything downstream faster. Configuration built on dirty data has to be rebuilt once the data is fixed — we've seen this pattern cost three months on programmes that skipped it." },
      { type: "h3", text: "Phase 1 — Data readiness (months 1–3)" },
      { type: "p", text: "Audit master data against S/4HANA's simplified data model. Business Partner consolidation (replacing separate Vendor/Customer tables) and the removal of classic Material Ledger are the two areas that create the most remediation work. Start here, not in the system." },
      { type: "h3", text: "Phase 2 — Process redesign (months 2–5, overlapping)" },
      { type: "p", text: "S/4HANA's simplified stock transport, embedded analytics, and FIORI UX are genuinely different from ECC. This is where you decide what to adopt and what to carry forward via compatibility mode. Our recommendation: adopt S/4HANA native processes for anything you're touching anyway. Compatibility mode is a migration tool, not a long-term strategy." },
      { type: "h3", text: "Phase 3 — System build and migration (months 4–14)" },
      { type: "p", text: "Classic implementation sprints: configuration, custom code remediation, integration testing, UAT, cutover planning. The difference from a greenfield project is that every decision has a legacy reference to resolve. Cutover planning should start no later than month 8 — late cutover planning is the single most common reason programmes overrun." },
      { type: "h3", text: "Phase 4 — Licence sizing (after go-live design is set)" },
      { type: "p", text: "Size your S/4HANA licence against your actual future-state processes, not your current ECC usage. Named users versus concurrent access decisions, and the inclusion of S/4HANA embedded analytics versus separate BW, should be based on real designs — not vendor estimates from before the project started." },
      { type: "quote", text: "The organisations that finish on time are the ones that treated the data as the project, not a prerequisite to the project.", attr: "DES Systems SAP Practice" },
      { type: "h2", text: "What to do this week" },
      { type: "list", items: [
        "Run SAP's Readiness Check 2.0 on your current system — it identifies custom code conflicts and missing OSS notes",
        "Commission a master data quality assessment — not a full remediation, just a health check to understand the scale of the problem",
        "Get an indicative scope and timeline from a partner who has delivered S/4HANA for organisations your size",
        "Do not let licence discussions gate the project start — scope first, size after",
      ]},
    ],
  },

  {
    slug: "mes-erp-single-source",
    category: "MES & Manufacturing",
    readTime: "8 min read",
    date: "July 2026",
    author: "DES Systems Engineering",
    gradient: "linear-gradient(135deg,#1d6cf0,#4d8bff)",
    thumbLabel: "MES",
    title: "Shop floor to top floor: making MES and ERP tell the same story",
    intro: "A July 2026 industry survey found that 93% of manufacturers run MES software, but only 23% have it fully integrated across their ERP, quality, and operational technology systems. The other 70% are running two versions of production truth — and the discrepancy shows up in every planning cycle, every quality report, and every OEE calculation.",
    sections: [
      { type: "h2", text: "Why production data diverges in the first place" },
      { type: "p", text: "MES and ERP are built on fundamentally different time horizons and data granularities. ERP thinks in orders, materials, and cost centres — it cares about planned versus actual at the order level and wants a confirmed goods receipt at shift end. MES thinks in operations, machines, and seconds — it captures every start, stop, scrap event, and operator confirmation in real time." },
      { type: "p", text: "The divergence accumulates through three mechanisms. First, batch synchronisation lag: MES pushes confirmed operations at shift end or midnight; ERP reads them the next morning. Any planning run executed during that gap works on yesterday's truth. Second, data model mismatches: MES works with routing operations and production resources; ERP works with work centres and routing steps. The mapping is never 1:1, and unmapped events become ghost transactions. Third, ownership vacuums: nobody owns the interface between the two systems, so when it drifts, it drifts slowly and invisibly." },
      { type: "callout", label: "The cost", text: "44% of manufacturers rank MES-ERP integration as their top data challenge. The downstream effects include planning runs on stale stock levels, quality holds applied in MES but invisible to SAP QM, and OEE calculations that differ between plant and corporate reports — sometimes by 12–18 percentage points." },
      { type: "h2", text: "Three integration patterns, in order of maturity" },
      { type: "h3", text: "Pattern 1 — Direct IDoc / BAPI (simple, brittle)" },
      { type: "p", text: "MES writes production confirmations directly into SAP via IDoc or BAPI calls. Fast to implement, zero middleware, easy to understand. The failure modes are equally straightforward: the interface is point-to-point, so any schema change on either side requires custom development; there's no replay capability if SAP is down for maintenance; and monitoring is split between two systems with no unified view." },
      { type: "p", text: "This pattern works well for stable, low-volume environments where the MES vendor already maintains an SAP connector. It becomes painful as soon as you have more than one MES or more than one SAP system." },
      { type: "h3", text: "Pattern 2 — Event-driven middleware (scalable, requires setup)" },
      { type: "p", text: "MES publishes production events (order confirmation, quality result, downtime record) to a message broker. A middleware layer — typically SAP BTP Integration Suite, Azure Service Bus, or a purpose-built integration platform — transforms and routes them into SAP. SAP publishes planned orders and material movements back through the same broker." },
      { type: "p", text: "This pattern decouples the two systems correctly. MES doesn't need to know SAP's BAPI signatures, and SAP doesn't need to know MES's database schema. The investment is in designing and maintaining the canonical message format that both sides speak to, which is real work but pays back every time you upgrade either system." },
      { type: "h3", text: "Pattern 3 — Real-time OPC-UA pipeline (gold standard for modern plant)" },
      { type: "p", text: "Machine data flows via OPC-UA into a processing layer that contextualises raw signals (spindle on/off, part count, alarm code) into structured production events. Those events feed simultaneously into MES for operational tracking and into SAP for goods receipts and quality results. Both systems read from the same stream — there is no reconciliation step because there is no second source." },
      { type: "p", text: "This architecture requires modern, OPC-UA-capable machine controllers or a hardware gateway layer for legacy equipment. It's the right investment for new plant builds and major machine replacement cycles, not for brownfield integration projects on a three-month timeline." },
      { type: "h2", text: "The principle that governs all three" },
      { type: "quote", text: "Don't re-platform the MES to fix an integration problem. The MES is usually right about production. The integration layer is what's wrong.", attr: "DES Systems Engineering" },
      { type: "p", text: "We have seen manufacturers invest in replacing capable MES software because the integration to ERP was broken. In every case, the replacement MES had the same integration problem six months later. The data model, the ownership question, and the synchronisation lag are integration architecture problems — they follow you to the new system." },
      { type: "h2", text: "Where to start" },
      { type: "list", items: [
        "Map the data flows that matter most: production confirmations, goods movements, quality results, downtime — in that priority order",
        "Audit your current synchronisation: how old is the data in ERP compared to MES at planning run time?",
        "Choose the pattern that matches your current middleware maturity, not the one you aspire to",
        "Own the canonical data model in a document — every field, every mapping, every null handling rule",
        "Put one person in charge of the interface. Not the MES vendor. Not the SAP team. One person.",
      ]},
    ],
  },

  {
    slug: "idoc-vs-api",
    category: "Integration",
    readTime: "6 min read",
    date: "June 2026",
    author: "DES Systems Engineering",
    gradient: "linear-gradient(135deg,#0b1626,#12294d)",
    thumbLabel: "EDI",
    title: "IDoc, EDI or REST? Choosing the right interface for the job",
    intro: "The question comes up on every SAP integration project: should we use IDocs, EDI, or a REST API? The answer is not a matter of preference — each interface has a design intent, and using the wrong one creates failure modes that look like system bugs but are actually architecture bugs. Here's a framework for deciding, with the failure modes we've actually seen in production.",
    sections: [
      { type: "h2", text: "What each interface is actually designed for" },
      { type: "h3", text: "IDocs — SAP-native asynchronous messaging" },
      { type: "p", text: "Intermediate Documents (IDocs) are SAP's internal message format for asynchronous data exchange. They're optimised for high-volume, batch-oriented scenarios: goods movements, order confirmations, invoice postings. IDocs have excellent native monitoring in SAP (transactions BD87 and WE05), straightforward reprocessing for failed documents, and decades of production hardening." },
      { type: "p", text: "The key property is asynchronous fire-and-forget: the sender posts the IDoc and continues; the receiver processes it when it can. This is exactly what you want for outbound delivery confirmations to logistics partners, inbound purchase orders from procurement portals, and production confirmations from MES. It is not what you want when you need a synchronous response — IDocs don't work that way." },
      { type: "h3", text: "EDI — Industry-standard partner communication" },
      { type: "p", text: "Electronic Data Interchange (ANSI X12, EDIFACT, ODETTE) is the lingua franca of B2B document exchange. When your customer sends you a purchase order via EDI, they are not sending an SAP IDoc — they're sending an X12 850 or an EDIFACT ORDERS message. Your middleware (SAP PI/PO, BTP Integration Suite, or a dedicated EDI platform) translates that into the SAP data structures your system understands." },
      { type: "p", text: "EDI carries contractual and legal weight that APIs do not. An EDI 856 Advanced Ship Notice creates a legally defined handoff point in supply chains. An EDI 810 invoice has specific compliance requirements in many jurisdictions. If your trading partners use EDI, you use EDI — it's not a technology preference, it's a business requirement." },
      { type: "h3", text: "REST / OData — Synchronous, real-time integration" },
      { type: "p", text: "OData APIs are the foundation of SAP's modern integration model, particularly for S/4HANA Cloud. REST is synchronous — the caller waits for a response — which makes it ideal for UI-driven integrations (a web app looking up available stock, a mobile app confirming a delivery), and for integrations that need an immediate success/failure signal." },
      { type: "callout", label: "Critical note for S/4HANA Cloud", text: "IDocs are not available in S/4HANA Public Cloud Edition. If you're migrating to the public cloud, your IDoc-based integrations need to be re-architected to REST/OData or BTP event mesh before go-live. This is a material scope item that is frequently underestimated during cloud migration planning." },
      { type: "h2", text: "The decision framework" },
      { type: "table",
        head: ["Scenario", "Recommended interface", "Why"],
        rows: [
          ["Outbound delivery to logistics partner", "IDoc / EDI", "Asynchronous, batch-tolerant, industry standard"],
          ["Inbound purchase order from customer", "EDI", "Contractual requirement, X12/EDIFACT standard"],
          ["MES production confirmation to SAP", "IDoc (on-premise) or REST event (cloud)", "High volume, async, native SAP monitoring"],
          ["Web portal stock availability check", "REST/OData", "Synchronous, real-time response required"],
          ["Mobile app delivery confirmation", "REST/OData", "User-facing, needs immediate success/error"],
          ["S/4HANA Cloud any external integration", "REST/OData or BTP Event Mesh", "IDocs not available in cloud edition"],
          ["Intercompany transfer between SAP systems", "IDoc", "Native, reliable, zero middleware required"],
        ],
      },
      { type: "h2", text: "Failure modes we've seen in production" },
      { type: "h3", text: "IDoc failure modes" },
      { type: "list", items: [
        "Monitoring overhead accumulates: a high-volume interface that isn't actively monitored builds up thousands of unprocessed IDocs that collectively mask the ones that actually matter",
        "Reprocessing without investigation: IDocs are easy to re-trigger, which creates a habit of reprocessing errors without fixing the root cause — until the root cause causes a much larger failure",
        "Schema coupling: if you modify an IDoc type without regenerating partner profiles, silent data truncation occurs with no error",
      ]},
      { type: "h3", text: "EDI failure modes" },
      { type: "list", items: [
        "Character set collisions: special characters in product descriptions or addresses break fixed-width EDI formats in ways that are extremely difficult to diagnose",
        "Mapping version drift: trading partner upgrades their EDI standard version; your mapping stays on the old one; documents start failing silently or partially",
        "Acknowledgement loops: missing or incorrect functional acknowledgements (997/CONTRL) can stall your partner's system without any error on your side",
      ]},
      { type: "h3", text: "REST failure modes" },
      { type: "list", items: [
        "You own error handling: REST gives you a status code and walks away — retry logic, dead-letter queuing, and alerting on persistent failures are entirely your responsibility",
        "Session and token management: OAuth token expiry during a long-running batch process creates hard-to-reproduce failures that look like network issues",
        "Synchronous coupling: if the target system is slow or down, your calling system waits — in a synchronous chain, one slow node degrades the entire flow",
      ]},
      { type: "quote", text: "The interface that looks simplest to implement is almost never the one that's simplest to operate. Design for operations first, implementation second.", attr: "DES Systems Engineering" },
    ],
  },

  {
    slug: "warehouse-automation-roi",
    category: "Automation",
    readTime: "7 min read",
    date: "June 2026",
    author: "DES Systems Logistics Practice",
    gradient: "linear-gradient(135deg,#0a42c8,#1d6cf0)",
    thumbLabel: "WM",
    title: "Warehouse automation ROI: where the payback really comes from",
    intro: "The automation narrative in logistics has been captured by robotics vendors. Autonomous mobile robots, shuttle systems, and goods-to-person conveyors dominate trade show floors and analyst reports. For most warehouses under 5,000 orders per day, they're the wrong starting point. Software-based automation — scanning, wave planning, directed putaway — consistently returns 2–3× more per euro invested than hardware in the first two years. Here's the data and the reasoning.",
    sections: [
      { type: "h2", text: "What moves the needle first: the software stack" },
      { type: "p", text: "Warehouses running paper-based picking or manual keying lose an average of 20–35% of potential throughput to three specific inefficiencies: travel time from suboptimal pick paths, re-checks caused by picking errors, and bin search time from poor putaway discipline. All three are software problems, not hardware problems." },
      { type: "h3", text: "Mobile barcode scanning" },
      { type: "p", text: "This is the highest-ROI single investment in most warehouses. Scan-confirmed picking eliminates manual keying errors entirely and creates a real-time inventory position that replaces the end-of-day stock count. 62% of third-party logistics providers already run mobile scanning as standard infrastructure — for warehouses that haven't deployed it yet, it's the first action, not an item to evaluate alongside robotics." },
      { type: "p", text: "Typical payback: 3–6 months. Typical accuracy improvement: from 97–98% to 99.5%+ on pick accuracy. The improvement in inventory accuracy has a compounding effect: fewer emergency orders, fewer write-offs, better planning input." },
      { type: "h3", text: "Wave planning" },
      { type: "p", text: "Wave planning groups orders into batches optimised for travel distance, carrier departure time, and resource allocation. A warehouse without wave planning has pickers crossing paths, picks routed inefficiently, and shipping teams waiting on late waves. A well-configured wave plan reduces pick travel distance by 25–40% on average — confirmed by multiple implementations we've run in SAP EWM and SAP WM." },
      { type: "p", text: "This is the single largest productivity lever available to most warehouses and it requires no hardware. The configuration work is substantial — zone definitions, carrier cut-offs, batch size parameters — but it runs on infrastructure you already have." },
      { type: "h3", text: "Directed putaway" },
      { type: "p", text: "When goods arrive, where they go should not be decided by the person holding the box. Algorithmic putaway assigns locations based on velocity (fast-movers near dispatch), physical constraints (weight, hazmat, temperature), and space optimisation. The payback comes from reduced search time during picking — a misplaced item costs between 3 and 8 minutes to locate, a loss that multiplies fast at scale." },
      { type: "callout", label: "The numbers", text: "Warehouses running mobile scanning + wave planning + directed putaway consistently achieve 20–35% efficiency improvement in the first year. At a 50-person warehouse with average labour cost of €35,000 per FTE, a 25% efficiency gain is worth roughly €437,500 in annual throughput — at a software investment typically under €100,000." },
      { type: "h2", text: "When robotics actually make sense" },
      { type: "p", text: "Autonomous mobile robots (AMRs) and goods-to-person systems deliver strong ROI — but under specific conditions. The payback calculation only works when all of the following are true:" },
      { type: "list", items: [
        "Volume: above 5,000 orders per day consistently, not seasonally",
        "Labour: you have sustained labour availability problems, not just cost pressure",
        "Operations: you run 24/7 or double shifts — robots don't have shift patterns",
        "SKU profile: relatively stable — high SKU churn makes programming and slot management expensive",
        "Space: your warehouse layout can accommodate robot lanes or goods-to-person stations without a re-fit that costs more than the robots",
      ]},
      { type: "p", text: "For operations below this threshold, the honest answer from a vendor who's seen both is: fix the software first, then revisit robotics in 18 months when you have a clean baseline to measure against. Many operations discover that a well-optimised software stack gets them to their throughput targets without the capital outlay." },
      { type: "h2", text: "The sequencing that actually works" },
      { type: "table",
        head: ["Month", "Action", "Expected outcome"],
        rows: [
          ["1–2", "Deploy mobile scanning across all pick zones", "Error rate drops, real-time inventory position established"],
          ["2–4", "Configure wave planning with carrier cut-offs", "Travel time reduction, on-time dispatch improvement"],
          ["3–6", "Implement directed putaway rules", "Search time reduction, space utilisation improvement"],
          ["6–12", "Add exception management and KPI dashboards", "Management visibility, continuous improvement baseline"],
          ["12+", "Evaluate robotics against clean baseline data", "Informed decision with real throughput numbers"],
        ],
      },
      { type: "quote", text: "Every warehouse that jumped to robotics without fixing its software first ended up with very expensive robots running inefficient processes.", attr: "DES Systems Logistics Practice" },
    ],
  },

  {
    slug: "headless-commerce-lessons",
    category: "E-Commerce",
    readTime: "9 min read",
    date: "May 2026",
    author: "DES Systems Commerce Practice",
    gradient: "linear-gradient(135deg,#12294d,#0f3d7a)",
    thumbLabel: "EC",
    title: "What running our own shops taught us about headless commerce",
    intro: "DES Systems operates multi-brand storefronts daily — DES Campers (RV sales and rental), DESSHOP (outdoor and camper e-commerce), and DESMOBIL (cross-border vehicle marketplace). That means we've lived through the architecture decisions we advise on, not just designed them. Here's what we learned about headless and composable commerce from actually running them at scale.",
    sections: [
      { type: "h2", text: "What 'headless' and 'composable' actually mean" },
      { type: "p", text: "These terms are used loosely enough that projects built on different definitions fail to meet their own goals. Let's be precise. Headless commerce means decoupling the frontend presentation layer from the commerce backend — checkout, pricing, catalog, and inventory stay in your commerce platform, but you build your own frontend using its APIs. Your storefront renders via Next.js or Nuxt; the platform handles the transaction logic." },
      { type: "p", text: "Composable commerce extends that idea by also decomposing the backend into best-of-breed services. Your checkout is from one vendor, your search from another, your PIM from a third, your OMS from a fourth — all orchestrated by a data layer and exposed through APIs. Every component is replaceable in theory. The integration overhead required to make this work in practice is the source of most of the cost." },
      { type: "h2", text: "What the TCO data says" },
      { type: "p", text: "IDC's 2024 Worldwide Digital Commerce Spending Guide found that composable commerce's total cost of ownership runs 2.2× to 3.1× higher than a headless implementation over a three-year period, when you include integration maintenance. The gap comes from the permanent integration team required to maintain and version the service boundaries between components." },
      { type: "p", text: "Each service boundary in a composable architecture is a contract surface. That contract must be versioned, monitored, and maintained every time either service updates. A four-component composable stack has six boundary contracts. A ten-component stack has 45. Most organisations dramatically underestimate the ongoing cost of those contracts when the vendor is presenting them a per-licence proposal." },
      { type: "callout", label: "The threshold", text: "Composable starts to pay back for enterprises above roughly €20M in digital revenue with capabilities their platform genuinely cannot deliver. Below that threshold, the integration overhead exceeds the benefit of best-of-breed components. Most mid-market operators should go headless at most." },
      { type: "h2", text: "What we actually learned from running our own shops" },
      { type: "h3", text: "Lesson 1: Product data is the real problem, not the architecture" },
      { type: "p", text: "A headless storefront built on bad product data is just a faster 404. Before we invested in frontend architecture for DES Campers, we spent months getting our product data right: consistent attribute schemas, clean pricing logic, proper category taxonomy, complete image sets. The architecture work took weeks. The data work took months. Every project that skipped the data work and started with the architecture has regretted it." },
      { type: "h3", text: "Lesson 2: Marketplace feeds amplify your data quality problems" },
      { type: "p", text: "When you syndicate to marketplace channels — Marktplaats, Mobile.de, AutoScout24, Bol.com — every missing attribute, every wrong unit, every unmapped category becomes a listing rejection or a ranking penalty. For DESMOBIL operating across 12+ countries, the first six months of marketplace syndication were mostly data remediation, not feature development. Build your product data model for the strictest marketplace you want to feed, then your own storefront becomes easy." },
      { type: "h3", text: "Lesson 3: Headless pays back when you need custom UX that your platform genuinely can't deliver" },
      { type: "p", text: "For DES Campers, we went headless because we needed a booking and availability calendar integrated with rental fleet management — something no off-the-shelf commerce theme could provide. The custom frontend justified the investment. For DESSHOP, which sells camping accessories with a fairly standard buy-flow, we stayed on a configured platform theme. The headless overhead wasn't justified by the UX requirements." },
      { type: "h3", text: "Lesson 4: The hidden cost is the SAP integration, not the frontend" },
      { type: "p", text: "For any operator with SAP in the stack, the real integration complexity is SAP SD (Sales & Distribution) and SAP MM talking to your commerce layer in real time. Stock availability, pricing, and order-to-cash flows all touch SAP. Getting this integration to perform at storefront latency requirements — under 200ms for stock checks — is the hard engineering problem. The headless frontend is comparatively straightforward once the SAP integration is solid." },
      { type: "h2", text: "Our recommendation by segment" },
      { type: "table",
        head: ["Situation", "Recommendation"],
        rows: [
          ["Standard buy-flow, no unusual UX needs", "Stay on your platform theme — headless overhead not justified"],
          ["Custom UX requirements your platform can't deliver", "Go headless with Next.js frontend, keep platform backend"],
          ["Multiple brands, different UX, shared catalog", "Headless with brand-specific frontends, shared commerce layer"],
          ["Best-of-breed requirement for specific capability", "Composable for that component only, not the whole stack"],
          ["Above €20M revenue, outgrowing your platform's capabilities", "Full composable with dedicated integration engineering team"],
        ],
      },
      { type: "quote", text: "We've seen organisations spend €400K building a composable stack they didn't need, then spend another €200K maintaining it. The correct starting question is not 'headless or composable?' — it's 'what does our platform genuinely not do that we need?'", attr: "DES Systems Commerce Practice" },
    ],
  },

  {
    slug: "workflow-automation-first-90-days",
    category: "Automation",
    readTime: "5 min read",
    date: "May 2026",
    author: "DES Systems Automation Practice",
    gradient: "linear-gradient(135deg,#4d8bff,#8fb4ff)",
    thumbLabel: "WF",
    title: "The first 90 days of workflow automation: pick boring processes",
    intro: "Every workflow automation engagement starts with the same conversation: the business wants to automate the complex, high-visibility process; the implementation team recommends starting with the boring one. The business is usually right about the value of automating the complex process. The implementation team is right about where to start. Here's why — and a practical 90-day playbook.",
    sections: [
      { type: "h2", text: "Why boring processes deliver faster" },
      { type: "p", text: "Boring processes share three properties that make them excellent first automation targets: they're well-defined (everyone agrees what the correct output is), they're high-frequency (the volume justifies the investment quickly), and they have low exception rates (the happy path dominates). Complex, high-value processes have the opposite profile — ambiguous requirements, exception handling that requires human judgement, and stakeholder disagreement about what 'correct' looks like." },
      { type: "p", text: "The first 90 days of an automation programme should demonstrate ROI quickly and build confidence in the tooling and the team. A boring process done well in 90 days creates the institutional trust that lets you tackle the complex processes in months 4–12. A complex process attempted first and delivered late or partially creates exactly the opposite environment." },
      { type: "h2", text: "The processes that deliver fastest" },
      { type: "h3", text: "Purchase order approval routing" },
      { type: "p", text: "Routing purchase orders to the correct approver based on value, cost centre, and vendor type is a process every organisation has, most do via email, and all want faster. The happy path is simple: PO created → amount checked → approver identified → notification sent → approval recorded → PO released. The automation replaces email chains with a tracked, auditable flow. Typical time-to-value: 6–8 weeks from process definition to go-live." },
      { type: "h3", text: "Order confirmation dispatch" },
      { type: "p", text: "When a sales order is entered in SAP, the customer needs a confirmation. In most organisations this is a manual step: someone prints or exports the confirmation, attaches it to an email, and sends it. Automating this dispatch — triggered by the SAP order save event, formatted from the SAP document, sent via your email infrastructure — eliminates the step entirely. Payback is immediate and measurable: every confirmation sent is one that didn't require manual handling." },
      { type: "h3", text: "Document routing (invoices, delivery notes)" },
      { type: "p", text: "Inbound invoices, outbound delivery notes, and goods receipt documents all follow defined routing logic that someone currently executes manually. Automating the routing and archiving of these documents reduces processing time by 60–80% in the first six months and creates a searchable archive that resolves supplier disputes in minutes rather than days." },
      { type: "callout", label: "The 90-day structure", text: "Weeks 1–2: process mapping and exception inventory. Weeks 3–6: build and test the happy path. Weeks 7–10: exception handling and edge cases. Weeks 11–12: go-live monitoring and handover to business ownership. Do not expand scope during the build phase." },
      { type: "h2", text: "The classic scope traps" },
      { type: "list", items: [
        "The exception that becomes the rule: a process with 40 exception types is not a good automation candidate — map exceptions before you commit to automating",
        "The integration that wasn't in scope: connecting to a legacy system mid-project doubles timelines; integrate what you know, leave unknown systems for phase 2",
        "The stakeholder who discovers requirements at UAT: hold a process walkthrough with every affected role before design begins, not after",
        "The AI pilot that gets added to impress management: AI augmentation in automation is powerful, but adding it to an in-flight project guarantees a delayed launch — schedule it as a phase 2 enhancement on a stable foundation",
      ]},
      { type: "h2", text: "Choosing your tooling" },
      { type: "p", text: "If you're in a SAP-heavy environment, SAP BTP Workflow Management and SAP Build Process Automation have the native integrations that reduce the integration work dramatically. For organisations with mixed stacks, Power Automate or a dedicated integration platform (Boomi, MuleSoft, or similar) provides broader connectivity at the cost of deeper SAP-specific functionality." },
      { type: "p", text: "The tool choice matters less than the process clarity. We've delivered excellent automation on every major platform — the failures we've seen came from automating an unclear process, not from a technology limitation." },
      { type: "quote", text: "The organisations that build a ten-year automation programme get there one boring process at a time. The ones that start with the exciting use case are usually still on it two years later.", attr: "DES Systems Automation Practice" },
    ],
  },

  {
    slug: "case-cross-border-vehicle-trade",
    category: "Case Study",
    readTime: "10 min read",
    date: "April 2026",
    author: "DES Systems",
    gradient: "linear-gradient(135deg,#0f3d7a,#0a42c8)",
    thumbLabel: "CASE",
    title: "Case study: digitalising cross-border vehicle trade in 12+ countries",
    intro: "Cross-border used-car transactions account for 5–8% of total European used-car volume and the share is growing as logistics barriers fall. But despite the EU single market, buying or selling a vehicle across a national border remains genuinely complex: registration documents, homologation requirements, emissions taxation, and COC certificates all vary by country. This is the story of how DESMOBIL — the DES Group's vehicle marketplace — automated that complexity at scale.",
    sections: [
      { type: "h2", text: "The problem: every country is a different system" },
      { type: "p", text: "European harmonisation has standardised a great deal of vehicle trade, but the friction that remains is concentrated in exactly the places that matter most for multi-country operations. Three categories of national variation drive most of the complexity:" },
      { type: "list", items: [
        "Registration documentation: the Netherlands requires RDW approval and a Dutch registration certificate; Germany requires a Zulassung with a CoC; Belgium requires provincial registration; each country has different legacy requirements for older vehicles imported before EU certificate of conformity became standard",
        "Emissions-based taxation: BPM (Netherlands), Nova (Spain), NOx levy (Norway), and VRT (Ireland) are each calculated differently using different base values and different measurement standards — NEDC vs WLTP creates material differences in tax liability for the same vehicle in different markets",
        "Homologation: vehicles not originally sold in the target country may require individual type approval, lighting changes, or speedometer modification — the rules differ by vehicle age, origin market, and destination country",
      ]},
      { type: "p", text: "Manually navigating these requirements for a single vehicle takes 3–5 working days of skilled administrative work. At marketplace scale — hundreds of vehicles per month across a dozen countries — that manual process is not viable." },
      { type: "h2", text: "The architecture: API-first inventory with a per-country compliance engine" },
      { type: "p", text: "The DESMOBIL platform is built on a single canonical vehicle record. When a vehicle enters inventory — sourced from dealer auctions, fleet disposals, or private sellers — it receives a structured data record built from VIN decoding, manual inspection input, and external data enrichment (registration history, mileage verification, damage reports)." },
      { type: "p", text: "That canonical record feeds three parallel systems: a compliance engine, a listing syndication layer, and a document generation service." },
      { type: "h3", text: "The compliance engine" },
      { type: "p", text: "The compliance engine encodes the eligibility rules for each destination country as a rule set. For a given vehicle and destination country, it calculates: the documents required (COC, odometer statement, customs form, specific national declarations), the tax liability in the destination country at current rates, and any homologation flags that require human review. The engine is updated when national rules change — a single update propagates to all relevant vehicle records." },
      { type: "h3", text: "Document generation" },
      { type: "p", text: "Required documents are generated from the canonical vehicle record automatically. COC data is pulled from manufacturer databases via API. Odometer and ownership statements are formatted to destination-country specifications. Customs declarations are pre-populated from the vehicle record and the transaction data. What previously required manual document preparation for each transaction now requires a human review of a generated draft — a step that takes minutes, not hours." },
      { type: "h3", text: "Listing syndication" },
      { type: "p", text: "One vehicle record publishes to multiple national platforms simultaneously — with localised descriptions, country-specific pricing inclusive of destination taxes, and correct categorisation for each marketplace's taxonomy. Platforms covered include AutoScout24, Mobile.de, Marktplaats, AutoTrader, and national equivalents across 12+ countries. Listing updates (price changes, availability changes) propagate to all channels automatically." },
      { type: "callout", label: "The result", text: "Time to market per vehicle reduced from 5–7 working days to same-day for standard transactions. The compliance review step for flagged vehicles (homologation issues, missing documentation) reduced from 3 days to 4 hours. Administrative headcount per 100 vehicles traded per month reduced by 60%." },
      { type: "h2", text: "What made this possible — and what didn't work first" },
      { type: "p", text: "The first version of this system was built around country-specific processes — one workflow for Netherlands purchases, another for Germany, another for Belgium. It worked but didn't scale: every new country required a new workflow build, and rule changes in one country required hunting through which workflow to update." },
      { type: "p", text: "The architectural shift to a country-agnostic canonical record with per-country rules encoded in the compliance engine was the decision that made the platform scalable. Adding a new country now means encoding its rules in the engine, not rebuilding a workflow. The last two countries added to the platform were live in under two weeks each." },
      { type: "h2", text: "Lessons for other multi-country operations" },
      { type: "list", items: [
        "Build one canonical data model first, before you build country-specific processes — retrofitting a canonical model onto country-specific workflows is expensive and usually incomplete",
        "Encode compliance rules as data, not as code — rules that change frequently belong in a rule engine or a configurable table, not hardcoded in application logic",
        "VIN decoding and external data enrichment are worth the integration cost — manually entered vehicle data has error rates that compound through every downstream step",
        "Marketplace taxonomy mapping is ongoing maintenance, not a one-time task — each platform changes its categories periodically and the mapping must be maintained",
        "Document generation from structured data scales better than document capture via OCR — scan-and-extract works, but generate-from-record is faster and more accurate",
      ]},
    ],
  },
]

/* ── Metadata ─────────────────────────────────────────────────────────────── */

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string; locale: string }> }
): Promise<Metadata> {
  const { slug } = await params
  const article = articles.find(a => a.slug === slug)
  if (!article) return { title: "Article not found — DES Systems" }
  return {
    title: `${article.title} — DES Systems Insights`,
    description: article.intro.slice(0, 160),
  }
}

/* ── Page ─────────────────────────────────────────────────────────────────── */

export default async function ArticlePage(
  { params }: { params: Promise<{ slug: string; locale: string }> }
) {
  const { slug } = await params
  const article = articles.find(a => a.slug === slug)
  if (!article) notFound()

  return (
    <div className="dx" style={{ paddingTop: 72 }}>
      <style dangerouslySetInnerHTML={{ __html: dxCss + pageCss }} />

      {/* Article hero */}
      <section className="art-hero">
        <div className="art-fig" style={{ background: article.gradient }}>{article.thumbLabel}</div>
        <div className="wrap art-hero-body">
          <Link href="/insights" className="art-back"><ArrowLeft size={14} /> All insights</Link>
          <div className="art-meta">
            <span className="art-cat">{article.category}</span>
            <span>{article.readTime}</span>
            <span>{article.date}</span>
          </div>
          <h1 className="art-title">{article.title}</h1>
          <p className="art-author">By {article.author}</p>
        </div>
      </section>

      {/* Article body */}
      <section className="section">
        <div className="wrap art-layout">
          <div className="art-body">
            <p className="art-intro">{article.intro}</p>
            {article.sections.map((s, i) => <SectionBlock key={i} section={s} />)}
          </div>
          <aside className="art-sidebar">
            <div className="art-sidebar-card">
              <span className="eyebrow" style={{ fontSize: 11 }}>About DES Systems</span>
              <p style={{ fontSize: 13.5, marginTop: 10, color: "var(--slate)" }}>Enterprise solutions for manufacturing, logistics and retail — written by practitioners who still build.</p>
              <Link href="/contact" className="btn btn-primary" style={{ marginTop: 16, fontSize: 13, padding: "10px 18px" }}>
                Talk to us <ArrowRight size={14} />
              </Link>
            </div>
            <div className="art-sidebar-card" style={{ marginTop: 14 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", letterSpacing: ".08em", textTransform: "uppercase" }}>More insights</span>
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                {articles.filter(a => a.slug !== slug).slice(0, 3).map(a => (
                  <Link href={`/insights/${a.slug}`} key={a.slug} style={{ fontSize: 13, color: "var(--navy)", lineHeight: 1.4, display: "block" }}>
                    {a.title}
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* CTA */}
      <section className="section soft">
        <div className="wrap">
          <div className="cta">
            <h2>Have a project in mind?</h2>
            <p>Talk to a consultant who has solved this problem before — in your industry.</p>
            <div className="row">
              <Link href="/contact" className="btn btn-primary">Get in touch <ArrowRight size={16} /></Link>
              <Link href="/insights" className="btn btn-ghost">More insights</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

/* ── Section renderer ─────────────────────────────────────────────────────── */

function SectionBlock({ section }: { section: Section }) {
  switch (section.type) {
    case "h2": return <h2 className="art-h2">{section.text}</h2>
    case "h3": return <h3 className="art-h3">{section.text}</h3>
    case "p":  return <p className="art-p">{section.text}</p>
    case "list": return (
      <ul className="art-list">
        {section.items.map((item, i) => <li key={i}>{item}</li>)}
      </ul>
    )
    case "quote": return (
      <blockquote className="art-quote">
        <p>&ldquo;{section.text}&rdquo;</p>
        {section.attr && <cite>— {section.attr}</cite>}
      </blockquote>
    )
    case "callout": return (
      <div className="art-callout">
        <strong>{section.label}</strong>
        <p>{section.text}</p>
      </div>
    )
    case "table": return (
      <div className="art-table-wrap">
        <table className="art-table">
          <thead>
            <tr>{section.head.map(h => <th key={h}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {section.rows.map((row, i) => (
              <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }
}

/* ── Scoped styles ────────────────────────────────────────────────────────── */

const pageCss = `
/* hero */
.art-hero{position:relative;overflow:hidden}
.art-fig{height:260px;display:flex;align-items:center;justify-content:center;font-size:4rem;font-weight:800;color:rgba(255,255,255,.28);letter-spacing:.05em}
.art-hero-body{padding:36px 0 52px;background:#fff;position:relative}
.art-back{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:var(--accent);margin-bottom:20px;text-decoration:none}
.art-back:hover{text-decoration:underline}
.art-meta{display:flex;gap:16px;font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--slate);flex-wrap:wrap;margin-bottom:16px}
.art-cat{color:var(--accent)}
.art-title{font-size:clamp(1.6rem,3.5vw,2.4rem);font-weight:800;line-height:1.15;color:var(--navy);max-width:780px;letter-spacing:-.02em}
.art-author{font-size:13px;color:var(--slate);margin-top:12px}
/* layout */
.art-layout{display:grid;grid-template-columns:1fr 280px;gap:56px;align-items:start}
@media(max-width:900px){.art-layout{grid-template-columns:1fr}.art-sidebar{display:none}}
/* body typography */
.art-intro{font-size:1.1rem;line-height:1.75;color:var(--ink);font-weight:500;margin-bottom:36px;padding-bottom:36px;border-bottom:1px solid var(--line)}
.art-h2{font-size:1.4rem;font-weight:800;color:var(--navy);margin:40px 0 14px;letter-spacing:-.01em}
.art-h3{font-size:1.05rem;font-weight:700;color:var(--navy);margin:28px 0 10px}
.art-p{font-size:1rem;line-height:1.75;color:var(--ink-2,#3a4d68);margin-bottom:18px}
.art-list{margin:0 0 20px 0;padding:0;list-style:none;display:flex;flex-direction:column;gap:8px}
.art-list li{font-size:.97rem;line-height:1.65;color:var(--ink-2,#3a4d68);padding-left:20px;position:relative}
.art-list li::before{content:"";position:absolute;left:0;top:10px;width:6px;height:6px;border-radius:2px;background:var(--accent)}
.art-quote{border-left:3px solid var(--accent);padding:20px 24px;margin:32px 0;background:rgba(29,108,240,.05);border-radius:0 var(--radius) var(--radius) 0}
.art-quote p{font-size:1.1rem;font-weight:600;color:var(--navy);line-height:1.55;font-style:italic;margin:0}
.art-quote cite{display:block;font-size:12px;color:var(--slate);font-style:normal;margin-top:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase}
.art-callout{background:rgba(29,108,240,.07);border:1px solid rgba(29,108,240,.2);border-radius:var(--radius);padding:20px 22px;margin:28px 0}
.art-callout strong{display:block;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--accent);margin-bottom:8px}
.art-callout p{font-size:.95rem;color:var(--ink);margin:0;line-height:1.65}
.art-table-wrap{overflow-x:auto;margin:24px 0}
.art-table{width:100%;border-collapse:collapse;font-size:13.5px}
.art-table th{text-align:left;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--slate);padding:10px 14px;border-bottom:2px solid var(--line);background:#fff}
.art-table td{padding:11px 14px;border-bottom:1px solid var(--line);color:var(--ink-2,#3a4d68);vertical-align:top;line-height:1.5}
.art-table tr:last-child td{border-bottom:none}
.art-table tr:hover td{background:rgba(29,108,240,.03)}
/* sidebar */
.art-sidebar-card{background:#fff;border:1px solid var(--line);border-radius:var(--radius);padding:22px;box-shadow:var(--shadow)}
.art-sidebar{position:sticky;top:88px}
/* cta ghost btn */
.dx .btn-ghost{border:1px solid rgba(255,255,255,.28);color:#fff;background:transparent}
.dx .btn-ghost:hover{background:rgba(255,255,255,.1)}
`

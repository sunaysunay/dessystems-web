"use client"

import { useState } from "react"
import { Link } from "@/src/i18n/routing"

const articles = [
  {
    slug: "s4hana-2027-deadline",
    thumb: "S/4",
    gradient: "linear-gradient(135deg,#0f3d7a,#1d6cf0 70%,#4d8bff)",
    cat: "SAP & ERP",
    readTime: "12 min",
    title: "The 2027 ECC deadline is closer than your roadmap thinks",
    desc: "Most mid-market manufacturers still underestimate the true lead time of an S/4HANA transition. A realistic 18-month migration plan — data first, processes second, licences last — based on programmes we have actually delivered.",
    by: "DES Systems SAP Practice · August 2026",
    featured: true,
  },
  {
    slug: "mes-erp-single-source",
    thumb: "MES",
    gradient: "linear-gradient(135deg,#1d6cf0,#4d8bff)",
    cat: "MES & Manufacturing",
    readTime: "8 min",
    title: "Shop floor to top floor: making MES and ERP tell the same story",
    desc: "93% of manufacturers run MES software but only 23% have it fully integrated with ERP. Here's why production data diverges and the integration patterns that close the gap without re-platforming.",
    by: "DES Systems Engineering · July 2026",
    featured: false,
  },
  {
    slug: "idoc-vs-api",
    thumb: "EDI",
    gradient: "linear-gradient(135deg,#0b1626,#12294d)",
    cat: "Integration",
    readTime: "6 min",
    title: "IDoc, EDI or REST? Choosing the right interface for the job",
    desc: "A pragmatic decision framework for SAP-connected integrations — with the specific failure modes of each option we have met in production.",
    by: "DES Systems Engineering · June 2026",
    featured: false,
  },
  {
    slug: "warehouse-automation-roi",
    thumb: "WM",
    gradient: "linear-gradient(135deg,#0a42c8,#1d6cf0)",
    cat: "Automation",
    readTime: "7 min",
    title: "Warehouse automation ROI: where the payback really comes from",
    desc: "Software-first automation returns 2–3x more per euro than robotics for warehouses under 5,000 orders per day. The data behind that claim and when the calculus flips.",
    by: "Logistics Practice · June 2026",
    featured: false,
  },
  {
    slug: "headless-commerce-lessons",
    thumb: "EC",
    gradient: "linear-gradient(135deg,#12294d,#0f3d7a)",
    cat: "E-Commerce",
    readTime: "9 min",
    title: "What running our own shops taught us about headless commerce",
    desc: "Lessons from operating DES Campers, DESSHOP and DESMOBIL. Composable TCO runs 2.2–3.1x higher than headless over three years. Here is what to do instead.",
    by: "Commerce Practice · May 2026",
    featured: false,
  },
  {
    slug: "workflow-automation-first-90-days",
    thumb: "WF",
    gradient: "linear-gradient(135deg,#4d8bff,#8fb4ff)",
    cat: "Automation",
    readTime: "5 min",
    title: "The first 90 days of workflow automation: pick boring processes",
    desc: "Approvals, order confirmations and document routing deliver faster ROI than AI pilots. A practical 90-day playbook with the classic scope traps to avoid.",
    by: "Automation Practice · May 2026",
    featured: false,
  },
  {
    slug: "case-cross-border-vehicle-trade",
    thumb: "CASE",
    gradient: "linear-gradient(135deg,#0f3d7a,#0a42c8)",
    cat: "Case Studies",
    readTime: "10 min",
    title: "Case study: digitalising cross-border vehicle trade in 12+ countries",
    desc: "How DESMOBIL automated EU import documentation, per-country compliance checks and multi-national listings — reducing time-to-market per vehicle from 5–7 days to same day.",
    by: "DES Systems · April 2026",
    featured: false,
  },
]

const filters = ["All", "SAP & ERP", "MES & Manufacturing", "Automation", "Integration", "E-Commerce", "Case Studies"]

export function InsightsGrid() {
  const [active, setActive] = useState("All")

  const featured = articles.find(a => a.featured)!
  const showFeatured = active === "All" || featured.cat === active
  const grid = active === "All"
    ? articles.filter(a => !a.featured)
    : articles.filter(a => !a.featured && a.cat === active)

  return (
    <>
      <div className="ins-filters">
        {filters.map(f => (
          <button
            key={f}
            className={"ins-chip" + (active === f ? " on" : "")}
            onClick={() => setActive(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {showFeatured && (
        <Link href={"/insights/" + featured.slug} className="ins-featured">
          <div className="ins-fig">{featured.thumb}</div>
          <div className="ins-feat-body">
            <span className="ins-meta">{"Featured · " + featured.cat + " · " + featured.readTime + " read"}</span>
            <p className="ins-feat-title">{featured.title}</p>
            <p className="ins-feat-desc">{featured.desc}</p>
            <span className="ins-readmore">Read the article &rarr;</span>
          </div>
        </Link>
      )}

      {grid.length > 0 ? (
        <div className="grid grid-3">
          {grid.map(a => (
            <Link href={"/insights/" + a.slug} className="ins-post" key={a.slug}>
              <div className="ins-thumb" style={{ background: a.gradient }}>{a.thumb}</div>
              <div className="ins-post-body">
                <span className="ins-post-meta">{a.cat + " · " + a.readTime}</span>
                <p className="ins-post-title">{a.title}</p>
                <p className="ins-post-desc">{a.desc}</p>
                <span className="ins-post-by">{a.by}</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="ins-empty">
          <p style={{ color: "var(--slate)", padding: "48px 0", textAlign: "center" }}>No articles in this category yet — check back soon.</p>
        </div>
      )}
    </>
  )
}

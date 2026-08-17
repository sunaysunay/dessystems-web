import type { Metadata } from "next"
import { Link } from "@/src/i18n/routing"
import { ArrowRight } from "lucide-react"
import { dxCss } from "@/components/dx-styles"

export const metadata: Metadata = {
  title: "Industries — DES Systems | Sector Expertise Across Verticals",
  description: "DES Systems serves manufacturing, logistics, automotive & mobility, retail and e-commerce with ERP, MES and automation expertise shaped by operational realities.",
}

const industries = [
  {
    num: "01", title: "Manufacturing",
    desc: "Discrete and process manufacturers rely on us to connect planning, production and quality into one governed flow. From S/4HANA PP and QM to real-time MES connectivity, we give plant leadership the visibility to act — not just report.",
    tags: ["S/4HANA PP · QM · MM", "MES Integration", "OEE & Traceability", "Shop-floor Analytics"],
  },
  {
    num: "02", title: "Logistics & Supply Chain",
    desc: "Warehousing, transport and cross-border distribution demand systems that never blink. We implement and optimise SAP WM/EWM and TM, automate carrier and customs flows, and build EDI backbones that keep goods — and data — moving.",
    tags: ["SAP WM · EWM · TM", "EDI & IDoc", "Carrier Integration", "Track & Trace"],
  },
  {
    num: "03", title: "Automotive & Mobility",
    desc: "Through DES Group's own automotive division — dealer operations, cross-border vehicle trade and rental fleets — we know this sector from the inside. We digitalise inventory, import documentation, compliance and multi-country sales processes.",
    tags: ["Dealer Management", "Vehicle Import Flows", "Fleet & Rental Ops", "Compliance Automation"],
  },
  {
    num: "04", title: "Retail & E-Commerce",
    desc: "We run e-commerce at group scale every day. That experience translates into headless storefronts, unified product data, marketplace feeds and order-to-cash automation that scale from a single shop to a multi-brand, multi-country operation.",
    tags: ["Headless Commerce", "PIM & Product Feeds", "SAP SD Integration", "CRM & Marketing Automation"],
  },
  {
    num: "05", title: "Wholesale & Distribution",
    desc: "Margin lives in the details: pricing, availability, returns and touchless order processing. We automate quote-to-cash, connect B2B portals to the ERP core and give distributors the same digital experience their B2C customers expect.",
    tags: ["Quote-to-Cash", "B2B Portals", "Pricing & Availability APIs", "Returns Automation"],
  },
]

const proof = [
  { num: "23+", label: "years of hands-on SAP logistics experience across MM, PP, QM, WM, SD and TM." },
  { num: "4",   label: "operating companies in the DES Group serve as live proving grounds for our platforms." },
  { num: "12+", label: "European countries where our solutions run in production today." },
  { num: "1",   label: "partner across the full enterprise stack — strategy, build, run and optimise." },
]

export default function IndustriesPage() {
  return (
    <div className="dx" style={{ paddingTop: 72 }}>
      <style dangerouslySetInnerHTML={{ __html: dxCss + pageCss }} />

      {/* Hero */}
      <section className="pg-hero">
        <div className="wrap">
          <span className="pg-kicker">Industries</span>
          <h1 className="pg-h1">Sector expertise, shaped by operational realities.</h1>
          <p className="pg-lead">We don&apos;t learn your industry on your budget. DES Systems consultants have run production lines, warehouses, dealerships and webshops — including our own, inside the DES Group.</p>
        </div>
      </section>

      {/* Industries list */}
      <section className="section">
        <div className="wrap">
          <div className="pg-sec-head">
            <span className="eyebrow">Where we operate</span>
            <h2>Deep verticals, not thin coverage</h2>
            <p className="lead">Five sectors where our teams deliver measurable outcomes, from S/4HANA cores to last-mile fulfilment.</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {industries.map(ind => (
              <div className="ind-row" key={ind.num}>
                <div className="ind-num">{ind.num}</div>
                <div className="ind-body">
                  <h3 style={{ fontSize: 22, marginBottom: 10 }}>{ind.title}</h3>
                  <p style={{ maxWidth: 720 }}>{ind.desc}</p>
                  <div className="ind-tags">
                    {ind.tags.map(t => <span className="ind-tag" key={t}>{t}</span>)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Proof */}
      <section className="section soft">
        <div className="wrap">
          <div className="pg-sec-head">
            <span className="eyebrow">Why it works</span>
            <h2>We operate businesses, not just systems</h2>
            <p className="lead">DES Systems is the technology backbone of the DES Group — spanning enterprise software, automotive trade and e-commerce retail. Everything we sell, we use.</p>
          </div>
          <div className="grid grid-4">
            {proof.map(p => (
              <div className="card" key={p.num} style={{ textAlign: "center", padding: "32px 20px" }}>
                <b style={{ display: "block", fontSize: 40, fontWeight: 800, color: "var(--accent)", lineHeight: 1 }}>{p.num}</b>
                <span style={{ fontSize: 14, color: "var(--slate)", marginTop: 10, display: "block" }}>{p.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section">
        <div className="wrap">
          <div className="cta">
            <h2>Talk to someone who speaks your sector.</h2>
            <p>Book a working session with a consultant who has solved your problem before — in your industry.</p>
            <div className="row">
              <Link href="/contact" className="btn btn-primary">Get in touch <ArrowRight /></Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

const pageCss = `
.pg-hero{background:linear-gradient(135deg,#0b1f3a 0%,#12294d 60%,#0f3d7a 100%);color:#fff;padding:96px 0 80px}
.pg-kicker{display:inline-block;font-size:11px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#8fb4ff;margin-bottom:16px}
.pg-h1{font-size:clamp(1.9rem,4vw,3rem);line-height:1.1;font-weight:800;max-width:820px;color:#fff;letter-spacing:-.03em;margin-top:0}
.pg-lead{margin-top:20px;max-width:640px;color:#c3cfe2;font-size:1.05rem}
.pg-sec-head{max-width:720px;margin-bottom:48px}
.pg-sec-head h2{margin-top:10px}
.ind-row{display:grid;grid-template-columns:80px 1fr;gap:28px;border:1px solid var(--line);border-radius:var(--radius);padding:36px 32px;background:#fff;box-shadow:var(--shadow);transition:.2s}
.ind-row:hover{box-shadow:0 14px 40px rgba(11,31,58,.10);border-color:#cdd8ea}
.ind-num{font-size:1.5rem;font-weight:800;color:#d5dfef;align-self:start;padding-top:4px}
.ind-body p{color:var(--slate);font-size:15px;line-height:1.7}
.ind-tags{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}
.ind-tag{font-size:12px;font-weight:600;color:var(--accent);background:rgba(29,108,240,.08);border-radius:6px;padding:5px 12px}
@media(max-width:640px){.ind-row{grid-template-columns:1fr}.ind-num{display:none}}
`

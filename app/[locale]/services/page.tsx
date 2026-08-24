import type { Metadata } from "next"
import { Link } from "@/src/i18n/routing"
import { ArrowRight, Settings, Factory, Workflow, Webhook, LayoutGrid, ShoppingBag } from "lucide-react"
import { dxCss } from "@/components/dx-styles"

export const metadata: Metadata = {
  title: "Services — DES Systems | ERP, SAP, MES & Automation",
  description: "End-to-end enterprise services from DES Systems: SAP S/4HANA consulting, MES integration, workflow automation, integration & APIs, and digital commerce engineering across Europe.",
}

const services = [
  {
    id: "erp", label: "S4", Icon: Settings,
    title: "ERP & SAP Logistics Consulting",
    desc: "S/4HANA implementation, migration, support and optimisation delivered by consultants with more than two decades in the field.",
    bullets: ["MM · PP · QM · WM · SD · TM modules", "Greenfield, brownfield & selective migrations", "Process design, rollout & hypercare support"],
  },
  {
    id: "mes", label: "MES", Icon: Factory,
    title: "MES Integration",
    desc: "Real-time production visibility from shop floor to top floor, connecting machines, operators and your ERP core.",
    bullets: ["Shop-floor to ERP connectivity", "Production monitoring & traceability", "OEE, quality & downtime analytics"],
  },
  {
    id: "automation", label: "WF", Icon: Workflow,
    title: "Workflow Automation",
    desc: "Digital operations that remove manual handovers, reduce error rates and shorten cycle times across departments.",
    bullets: ["Process discovery & mapping", "Approval, order & document flows", "RPA & low-code orchestration"],
  },
  {
    id: "integration", label: "API", Icon: Webhook,
    title: "Integration & APIs",
    desc: "Reliable data exchange between your ERP, partners and platforms — built for uptime and auditability.",
    bullets: ["REST API design & development", "EDI & IDoc development", "Middleware & event-driven architecture"],
  },
  {
    id: "bop", label: "BOP", Icon: LayoutGrid,
    title: "Business Operating Platform",
    desc: "Our proprietary multi-tenant platform for core operations — inventory, orders, fulfilment and reporting in one place.",
    bullets: ["Multi-entity & multi-tenant by design", "Modular: activate only what you need", "Native integrations to SAP & commerce"],
  },
  {
    id: "ecommerce", label: "EC", Icon: ShoppingBag,
    title: "E-Commerce & Digital Marketing",
    desc: "Headless commerce engineering and performance marketing, proven daily across the DES Group's own retail brands.",
    bullets: ["Headless commerce & storefront builds", "SEO, paid media & CRM automation", "Product data & marketplace feeds"],
  },
]

const phases = [
  { step: "01", title: "Discover", desc: "Assessment of processes, systems and data. We define the target state and the business case together." },
  { step: "02", title: "Design", desc: "Solution architecture, process blueprints and an implementation roadmap with fixed milestones." },
  { step: "03", title: "Deliver", desc: "Agile implementation with transparent sprints, rigorous testing and structured change management." },
  { step: "04", title: "Drive", desc: "Hypercare, managed support and continuous optimisation — we stay accountable after go-live." },
]

export default function ServicesPage() {
  return (
    <div className="dx" style={{ paddingTop: 72 }}>
      <style dangerouslySetInnerHTML={{ __html: dxCss + pageCss }} />

      {/* Hero */}
      <section className="pg-hero">
        <div className="wrap">
          <span className="pg-kicker">Services</span>
          <h1 className="pg-h1">Core expertise, end to end.<br />One partner across the full enterprise stack.</h1>
          <p className="pg-lead">From SAP S/4HANA programmes to shop-floor MES connectivity and workflow automation, DES Systems delivers the services that keep manufacturing, logistics and retail operations running — measurably better.</p>
          <div className="pg-actions">
            <Link href="/contact" className="btn btn-primary">Start a conversation <ArrowRight /></Link>
          </div>
        </div>
      </section>

      {/* Stats band */}
      <div className="band">
        <div className="wrap">
          <div className="grid-4">
            <div className="s"><b>23+</b><span>Years of SAP expertise</span></div>
            <div className="s"><b>6</b><span>SAP modules covered end-to-end</span></div>
            <div className="s"><b>12+</b><span>Countries served across Europe</span></div>
            <div className="s"><b>100%</b><span>Remote &amp; on-site delivery</span></div>
          </div>
        </div>
      </div>

      {/* Services grid */}
      <section className="section" id="services">
        <div className="wrap">
          <div className="pg-sec-head">
            <span className="eyebrow">What we do</span>
            <h2>Services shaped by operational reality</h2>
            <p className="lead">Every engagement is grounded in hands-on experience from the plant floor, the warehouse and the storefront — not slideware.</p>
          </div>
          <div className="grid grid-3">
            {services.map(s => (
              <div className="card" key={s.id}>
                <div className="pg-svc-label">{s.label}</div>
                <h3 style={{ margin: "14px 0 8px" }}>{s.title}</h3>
                <p>{s.desc}</p>
                <ul className="pg-bullets">
                  {s.bullets.map(b => <li key={b}>{b}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="section soft">
        <div className="wrap">
          <div className="pg-sec-head">
            <span className="eyebrow">How we work</span>
            <h2>A delivery model built for certainty</h2>
            <p className="lead">Clear phases, measurable outcomes, and senior people in the room from day one.</p>
          </div>
          <div className="grid grid-4">
            {phases.map(p => (
              <div className="pg-step" key={p.step}>
                <span className="pg-step-label">Phase {p.step}</span>
                <h3 style={{ margin: "10px 0 8px" }}>{p.title}</h3>
                <p style={{ fontSize: 14, color: "var(--slate)" }}>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section">
        <div className="wrap">
          <div className="cta">
            <h2>Ready to modernise your operations?</h2>
            <p>Tell us where it hurts — we&apos;ll show you what better looks like, with numbers attached.</p>
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
.pg-actions{margin-top:32px;display:flex;gap:14px;flex-wrap:wrap}
.pg-sec-head{max-width:720px;margin-bottom:48px}
.pg-sec-head h2{margin-top:10px}
.pg-svc-label{width:46px;height:46px;border-radius:11px;background:linear-gradient(135deg,#1d6cf0,#0f9d8c);color:#fff;font-weight:800;font-size:12px;display:flex;align-items:center;justify-content:center}
.pg-bullets{list-style:none;margin-top:14px;display:flex;flex-direction:column;gap:6px;padding:0}
.pg-bullets li{font-size:13.5px;color:var(--slate);padding-left:16px;position:relative}
.pg-bullets li::before{content:"";position:absolute;left:0;top:7px;width:6px;height:6px;border-radius:2px;background:var(--accent)}
.pg-step{padding:26px 22px;border-left:3px solid var(--accent);background:#fff;border-radius:0 var(--radius) var(--radius) 0;box-shadow:var(--shadow)}
.pg-step-label{font-size:11px;font-weight:700;letter-spacing:.16em;color:var(--accent);text-transform:uppercase}
`

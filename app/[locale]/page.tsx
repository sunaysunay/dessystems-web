import HeroPanels from "@/components/hero-panels"
import { dxCss } from "@/components/dx-styles"
import { Link } from "@/src/i18n/routing"
import {
  ArrowRight, Check, LayoutGrid, Settings, Workflow, Webhook,
  Car, Factory, Truck, ShoppingBag, Cog, Plus,
} from "lucide-react"

// Scoped styling ported from the DES Systems sample layout. Everything is
// namespaced under `.dx` so it never leaks into the dark nav/footer or globals.

const flier = [
  "AI · ERP · MES · CRM · DevOps", "SAP S/4HANA", "ERP Consulting", "MES Integration",
  "Workflow Automation", "Autonomous AI Agents", "EDI / IDoc", "Enterprise Solutions",
  "AI Marketing Automation", "AI Lead Generation", "Predictive Lead Scoring",
  "E-Commerce AI", "Headless Commerce", "AI Product Listings", "Smart Catalog Management",
  "AI Content Generation", "Programmatic Advertising", "AI Personalisation",
  "Conversational AI", "RAG / LLM Pipelines", "Corporate AI Solutions",
]

const solutions = [
  { Icon: LayoutGrid, title: "ERP & SAP Consulting", desc: "S/4HANA implementation, support and optimisation across MM, PP, QM, WM and SD." },
  { Icon: Settings,   title: "Automation",           desc: "Workflow automation that removes manual bottlenecks, cuts cost and reduces error rates." },
  { Icon: Workflow,   title: "MES Integration",      desc: "Real-time production visibility by connecting shop-floor MES with your ERP backbone." },
  { Icon: Webhook,    title: "Integration & APIs",   desc: "REST APIs, EDI and IDoc development to unify systems, data and processes." },
]

const checks = ["Process Analysis & Design", "ERP Implementation", "Data Migration", "System Optimisation", "Training & Support", "Change Management"]
const sapModules = ["SAP MM", "SAP PP", "SAP QM", "SAP WM/EWM", "SAP PM", "SAP SD", "SAP TM"]

const mesChecks = ["MES Rollout & Configuration", "Shop-Floor Connectivity", "Real-Time OEE & Monitoring", "ERP ↔ MES Synchronisation", "IoT & Machine Data", "EDI / IDoc Interfaces"]
const mesModules = ["OPC-UA", "MQTT", "SCADA", "PLC", "OEE", "SAP DM", "EDI", "IDoc"]

const ecomChecks = ["Webshop Development", "Headless Commerce", "SEO & Content", "Paid Media (SEA / Social)", "CRM & Marketing Automation", "Analytics & CRO"]
const ecomModules = ["Shopify", "Next.js", "Headless", "SEO", "Google Ads", "Meta Ads", "Klaviyo", "GA4"]

const stats = [
  ["23+", "Years of SAP experience"], ["50+", "Successful projects"],
  ["99.2%", "On-time delivery"], ["EU", "Coverage & compliance"],
]

const industries = [
  { Icon: Car,         title: "Automotive",               desc: "Manufacturing and supply-chain solutions for tier suppliers and OEMs." },
  { Icon: Factory,     title: "Manufacturing",            desc: "Production planning and shop-floor integration for real-time control." },
  { Icon: Truck,       title: "Logistics & Supply Chain", desc: "End-to-end visibility and process optimisation across the chain." },
  { Icon: ShoppingBag, title: "Retail & Distribution",    desc: "Inventory, order and distribution management at scale." },
  { Icon: Cog,         title: "Engineering",              desc: "Project-driven, engineered-to-order solutions and processes." },
  { Icon: Plus,        title: "More Industries",          desc: "Tailored solutions for your specific operational requirements." },
]

const testimonials = [
  { q: "The S/4HANA migration was delivered on schedule and our WM cycle times dropped noticeably within the first quarter.", n: "Markus Keller", r: "Head of Operations, NORDWERK", a: "MK" },
  { q: "Clear process design, strong SAP logistics depth, and a team that actually understood our shop floor.", n: "Sofia Demir", r: "Supply Chain Lead, Helix Logistics", a: "SD" },
  { q: "Automation removed days of manual reporting every month. The ROI was obvious within weeks.", n: "Lars Visser", r: "CFO, Vantis", a: "LV" },
]

const insights = [
  { cat: "ERP",         title: "How ERP drives operational excellence",  desc: "How modern ERP systems help businesses improve efficiency and agility." },
  { cat: "Automation",  title: "The power of business automation",       desc: "Why automation has become a necessity for growth and scalability." },
  { cat: "Integration", title: "MES & ERP integration best practices",   desc: "Key strategies for successful MES and ERP integration in manufacturing." },
]

export default function HomePage() {
  return (
    <>
      {/* HERO — multi-panel major activities (unchanged) */}
      <HeroPanels />

      <div className="dx">
        <style dangerouslySetInnerHTML={{ __html: dxCss }} />

        {/* FLIER — running banner (descamper style) */}
        <div className="flier" aria-hidden="true">
          <div className="track">
            {[...flier, ...flier].map((item, i) => <span className="item" key={i}>{item}</span>)}
          </div>
        </div>

        {/* LOGOS */}
        <section className="logos">
          <div className="wrap">
            <p>Trusted by manufacturing &amp; logistics teams across Europe</p>
            <div className="logo-row">
              {["NORDWERK", "Vantis", "METRA Group", "Helix Logistics", "AXIOM", "Procyon"].map(n => <b key={n}>{n}</b>)}
            </div>
          </div>
        </section>

        {/* SOLUTIONS */}
        <section className="section" id="solutions">
          <div className="wrap">
            <div className="center" style={{ marginBottom: 46 }}>
              <span className="eyebrow">What we do</span>
              <h2 style={{ marginTop: 10 }}>Core expertise, end to end</h2>
              <p className="lead">From greenfield SAP implementations to automation at scale — one partner across the full enterprise stack.</p>
            </div>
            <div className="grid grid-4">
              {solutions.map(s => (
                <div className="card" key={s.title}>
                  <div className="ic"><s.Icon /></div>
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                  <Link href="/solutions" className="more">Discover more <ArrowRight /></Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SAP SPLIT */}
        <section className="section soft" id="services">
          <div className="wrap split">
            <div>
              <span className="eyebrow">ERP Consulting Services</span>
              <h2 style={{ margin: "10px 0 16px" }}>SAP &amp; ERP expertise that delivers</h2>
              <p className="lead">We help businesses implement, optimise and support their ERP systems — ensuring better processes, accurate data and outcomes you can measure.</p>
              <ul className="checks">
                {checks.map(c => <li key={c}><Check />{c}</li>)}
              </ul>
              <Link href="/solutions" className="btn btn-primary">View ERP services</Link>
            </div>
            <div className="panelcard">
              <h3>SAP Logistics Expertise</h3>
              <p>Deep, hands-on knowledge of SAP S/4HANA logistics modules — from planning to execution, greenfield to brownfield.</p>
              <div className="modules">
                {sapModules.map(m => <span className="chip" key={m}>{m}</span>)}
              </div>
            </div>
          </div>
        </section>

        {/* MES */}
        <section className="section" id="mes">
          <div className="wrap split">
            <div>
              <span className="eyebrow">MES & Integration</span>
              <h2 style={{ margin: "10px 0 16px" }}>Establish MES and integrations</h2>
              <p className="lead">We connect shop-floor systems to your ERP — deploying MES, capturing machine data in real time, and wiring up the integrations that keep production and planning in sync.</p>
              <ul className="checks">
                {mesChecks.map(c => <li key={c}><Check />{c}</li>)}
              </ul>
              <Link href="/solutions" className="btn btn-primary">View MES services</Link>
            </div>
            <div className="panelcard">
              <h3>Shop-Floor to Top-Floor</h3>
              <p>From sensor to SAP — unified production data across every layer of your operation.</p>
              <div className="modules">
                {mesModules.map(m => <span className="chip" key={m}>{m}</span>)}
              </div>
            </div>
          </div>
        </section>

        {/* E-COMMERCE & MARKETING */}
        <section className="section soft" id="ecommerce">
          <div className="wrap split">
            <div>
              <span className="eyebrow">E-Commerce & Marketing</span>
              <h2 style={{ margin: "10px 0 16px" }}>Commerce and growth marketing</h2>
              <p className="lead">We build and scale online stores and run the marketing that fills them — from headless webshops to SEO, paid media and lifecycle automation.</p>
              <ul className="checks">
                {ecomChecks.map(c => <li key={c}><Check />{c}</li>)}
              </ul>
              <Link href="/contact" className="btn btn-primary">View commerce services</Link>
            </div>
            <div className="panelcard">
              <h3>Digital Growth Stack</h3>
              <p>A modern commerce and marketing toolkit, integrated end to end with your ERP and data.</p>
              <div className="modules">
                {ecomModules.map(m => <span className="chip" key={m}>{m}</span>)}
              </div>
            </div>
          </div>
        </section>

        {/* STATS BAND */}
        <section className="band">
          <div className="wrap grid grid-4">
            {stats.map(([b, s]) => (
              <div className="s" key={s}><b>{b}</b><span>{s}</span></div>
            ))}
          </div>
        </section>

        {/* INDUSTRIES */}
        <section className="section" id="industries">
          <div className="wrap">
            <div className="head-row">
              <div>
                <span className="eyebrow">Industries we serve</span>
                <h2 style={{ marginTop: 10 }}>Sector expertise across verticals</h2>
              </div>
              <p className="lead">Solutions shaped by the operational realities of each industry we work in.</p>
            </div>
            <div className="grid grid-3">
              {industries.map(i => (
                <div className="card" key={i.title}>
                  <div className="ic"><i.Icon /></div>
                  <h3>{i.title}</h3>
                  <p>{i.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="section soft" id="about">
          <div className="wrap">
            <div className="center" style={{ marginBottom: 44 }}>
              <span className="eyebrow">Client results</span>
              <h2 style={{ marginTop: 10 }}>What partners say</h2>
            </div>
            <div className="grid grid-3">
              {testimonials.map(t => (
                <div className="quote" key={t.n}>
                  <div className="stars">★★★★★</div>
                  <p>&ldquo;{t.q}&rdquo;</p>
                  <div className="by"><span className="avatar">{t.a}</span><div><b>{t.n}</b><span>{t.r}</span></div></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* INSIGHTS */}
        <section className="section" id="insights">
          <div className="wrap">
            <div className="head-row">
              <div><span className="eyebrow">Latest insights</span><h2 style={{ marginTop: 10 }}>News &amp; articles</h2></div>
              <Link href="/contact" className="btn btn-outline">View all insights</Link>
            </div>
            <div className="grid grid-3">
              {insights.map(a => (
                <article className="card" key={a.title}>
                  <span className="eyebrow" style={{ color: "var(--accent-2)" }}>{a.cat}</span>
                  <h3 style={{ margin: "10px 0 6px" }}>{a.title}</h3>
                  <p>{a.desc}</p>
                  <Link href="/contact" className="more">Read article <ArrowRight /></Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="section" id="contact">
          <div className="wrap">
            <div className="cta">
              <h2>Let&apos;s discuss your project</h2>
              <p>Available for remote &amp; on-site engagements across Europe. Tell us about your systems and we&apos;ll map the fastest path to results.</p>
              <div className="row">
                <a href="mailto:info@dessystems.io" className="btn btn-primary">Get in touch</a>
                <Link href="/solutions" className="btn btn-ghost">Our solutions</Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}

import HeroPanels from "@/components/hero-panels"
import { Link } from "@/src/i18n/routing"
import {
  ArrowRight, Check, LayoutGrid, Settings, Workflow, Webhook,
  Car, Factory, Truck, ShoppingBag, Cog, Plus,
} from "lucide-react"

// Scoped styling ported from the DES Systems sample layout. Everything is
// namespaced under `.dx` so it never leaks into the dark nav/footer or globals.
const css = `
.dx{--navy:#0b1f3a;--navy-2:#13294b;--ink:#1a2233;--slate:#5a6678;--line:#e4e8ef;--bg:#fff;--bg-soft:#f5f7fa;--accent:#1d6cf0;--accent-2:#0f9d8c;--radius:14px;--shadow:0 1px 2px rgba(11,31,58,.06),0 8px 24px rgba(11,31,58,.06);--maxw:1180px;color:var(--ink);background:var(--bg)}
.dx a{color:inherit;text-decoration:none}
.dx .wrap{max-width:var(--maxw);margin:0 auto;padding:0 24px}
.dx .eyebrow{font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--accent)}
.dx h2{font-size:clamp(26px,3.4vw,38px);line-height:1.15;font-weight:800;letter-spacing:-.02em;color:var(--navy)}
.dx h3{font-size:18px;font-weight:700;color:var(--navy);letter-spacing:-.01em}
.dx p.lead{color:var(--slate);font-size:17px;max-width:620px}
.dx .section{padding:88px 0}
.dx .section.soft{background:var(--bg-soft)}
.dx .center{text-align:center}
.dx .center p.lead{margin:14px auto 0}
.dx .btn{display:inline-flex;align-items:center;gap:8px;font-weight:600;font-size:15px;padding:13px 22px;border-radius:10px;transition:.18s ease;border:1px solid transparent;cursor:pointer}
.dx .btn svg{width:16px;height:16px}
.dx .btn-primary{background:var(--accent);color:#fff;box-shadow:0 6px 16px rgba(29,108,240,.28)}
.dx .btn-primary:hover{background:#1559cc;transform:translateY(-1px)}
.dx .btn-ghost{background:transparent;color:var(--navy);border-color:var(--line)}
.dx .btn-ghost:hover{border-color:var(--accent);color:var(--accent)}
.dx .btn-outline{background:#fff;color:var(--navy);border-color:var(--line)}
.dx .btn-outline:hover{border-color:var(--accent);color:var(--accent)}
.dx .logos{padding:34px 0;border-bottom:1px solid var(--line)}
.dx .logos p{text-align:center;font-size:12px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--slate);margin-bottom:22px}
.dx .logo-row{display:flex;flex-wrap:wrap;gap:42px;justify-content:center;align-items:center;opacity:.62}
.dx .logo-row b{font-size:20px;font-weight:800;color:var(--navy);letter-spacing:-.02em}
.dx .grid{display:grid;gap:22px}
.dx .grid-3{grid-template-columns:repeat(3,1fr)}
.dx .grid-4{grid-template-columns:repeat(4,1fr)}
.dx .grid-2{grid-template-columns:1fr 1fr}
@media(max-width:920px){.dx .grid-3,.dx .grid-4{grid-template-columns:1fr 1fr}}
@media(max-width:600px){.dx .grid-3,.dx .grid-4,.dx .grid-2{grid-template-columns:1fr}}
.dx .card{background:#fff;border:1px solid var(--line);border-radius:var(--radius);padding:26px;box-shadow:var(--shadow);transition:.2s}
.dx .card:hover{transform:translateY(-3px);border-color:#cdd8ea;box-shadow:0 12px 30px rgba(11,31,58,.10)}
.dx .ic{width:46px;height:46px;border-radius:11px;display:grid;place-items:center;margin-bottom:16px;background:linear-gradient(135deg,rgba(29,108,240,.12),rgba(15,157,140,.12))}
.dx .ic svg{width:23px;height:23px;color:var(--accent)}
.dx .card p{color:var(--slate);font-size:14.5px;margin-top:8px}
.dx .card .more{display:inline-flex;align-items:center;gap:6px;margin-top:14px;font-size:14px;font-weight:600;color:var(--accent)}
.dx .card .more svg{width:15px;height:15px}
.dx .head-row{display:flex;justify-content:space-between;align-items:flex-end;gap:24px;margin-bottom:40px;flex-wrap:wrap}
.dx .head-row p.lead{margin-top:12px}
.dx .split{display:grid;grid-template-columns:1fr 1fr;gap:56px;align-items:center}
@media(max-width:860px){.dx .split{grid-template-columns:1fr;gap:36px}}
.dx .checks{list-style:none;display:grid;grid-template-columns:1fr 1fr;gap:12px 22px;margin:26px 0 30px;padding:0}
.dx .checks li{display:flex;align-items:center;gap:10px;font-weight:500;font-size:15px;color:var(--ink)}
.dx .checks svg{width:20px;height:20px;flex:none;color:var(--accent-2)}
.dx .modules{display:flex;flex-wrap:wrap;gap:9px;margin-top:18px}
.dx .chip{background:#fff;border:1px solid var(--line);color:var(--navy);font-weight:600;font-size:13px;padding:8px 14px;border-radius:8px}
.dx .panelcard{background:var(--navy);border-radius:18px;padding:34px;color:#fff;box-shadow:var(--shadow)}
.dx .panelcard h3{color:#fff;font-size:20px;margin-bottom:10px}
.dx .panelcard p{color:#bccadf;font-size:15px}
.dx .band{background:var(--navy);color:#fff}
.dx .band .grid-4{gap:0}
.dx .band .s{padding:46px 26px;text-align:center;border-left:1px solid rgba(255,255,255,.10)}
.dx .band .s:first-child{border-left:none}
.dx .band .s b{display:block;font-size:40px;font-weight:800;letter-spacing:-.02em}
.dx .band .s span{color:#9fb0cc;font-size:14px}
@media(max-width:600px){.dx .band .s{border-left:none;border-top:1px solid rgba(255,255,255,.1)}.dx .band .s:first-child{border-top:none}}
.dx .quote{background:#fff;border:1px solid var(--line);border-radius:var(--radius);padding:30px;box-shadow:var(--shadow)}
.dx .quote .stars{color:#f5a623;letter-spacing:3px;font-size:15px;margin-bottom:14px}
.dx .quote p{font-size:16px;color:var(--ink);font-weight:500}
.dx .quote .by{display:flex;align-items:center;gap:12px;margin-top:20px}
.dx .avatar{width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--navy));color:#fff;display:grid;place-items:center;font-weight:700;font-size:15px}
.dx .by b{font-size:14px;color:var(--navy);display:block}
.dx .by span{font-size:13px;color:var(--slate)}
.dx .cta{background:linear-gradient(135deg,var(--navy),var(--navy-2));color:#fff;border-radius:20px;padding:56px;text-align:center}
.dx .cta h2{color:#fff}
.dx .cta p{color:#bccadf;margin:14px auto 28px;max-width:520px}
.dx .cta .row{display:flex;gap:14px;justify-content:center;flex-wrap:wrap}
.dx .cta .btn-ghost{color:#fff;border-color:rgba(255,255,255,.28)}
.dx .cta .btn-ghost:hover{background:rgba(255,255,255,.08)}
.dx .flier{background:var(--navy);border-top:1px solid rgba(255,255,255,.08);overflow:hidden}
.dx .flier .track{display:flex;width:max-content;white-space:nowrap;padding:6px 0;animation:dxmarq 30s linear infinite}
.dx .flier:hover .track{animation-play-state:paused}
.dx .flier .item{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#9fb0cc;padding:0 38px;position:relative;flex:none}
.dx .flier .item:before{content:"";position:absolute;left:-3px;top:50%;transform:translateY(-50%);width:4px;height:4px;border-radius:50%;background:var(--accent-2)}
@keyframes dxmarq{to{transform:translateX(-50%)}}
`

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
        <style dangerouslySetInnerHTML={{ __html: css }} />

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

import HeroPanels from "@/components/hero-panels"
import { dxCss } from "@/components/dx-styles"
import { Link } from "@/src/i18n/routing"
import { useTranslations } from "next-intl"
import {
  ArrowRight, Check, Layers, LayoutGrid, Settings, Workflow, Webhook,
  Car, Factory, Truck, ShoppingBag, Cog, Plus,
} from "lucide-react"

// Keyword banner + tech chips + client logos stay as-is (universal tech / brand
// terms). Everything else is driven by the HomeContent i18n namespace.
const flier = [
  "AI · ERP · MES · CRM · DevOps", "SAP S/4HANA", "ERP Consulting", "MES Integration",
  "Workflow Automation", "Autonomous AI Agents", "EDI / IDoc", "Enterprise Solutions",
  "AI Marketing Automation", "AI Lead Generation", "Predictive Lead Scoring",
  "E-Commerce AI", "Headless Commerce", "AI Product Listings", "Smart Catalog Management",
  "AI Content Generation", "Programmatic Advertising", "AI Personalisation",
  "Conversational AI", "RAG / LLM Pipelines", "Corporate AI Solutions",
]
const sapModules = ["SAP MM", "SAP PP", "SAP QM", "SAP WM/EWM", "SAP PM", "SAP SD", "SAP TM"]
const mesModules = ["OPC-UA", "MQTT", "SCADA", "PLC", "OEE", "SAP DM", "EDI", "IDoc"]
const ecomModules = ["Shopify", "Next.js", "Headless", "SEO", "Google Ads", "Meta Ads", "Klaviyo", "GA4"]
const logos = ["NORDWERK", "Vantis", "METRA Group", "Helix Logistics", "AXIOM", "Procyon"]
const statNums = ["23+", "50+", "99.2%", "EU"]

export default function HomePage() {
  const t = useTranslations("HomeContent")

  const solutions = [
    { Icon: Layers,     name: t("bop_name"), desc: t("bop_desc"), href: "/platform" },
    { Icon: LayoutGrid, name: t("s1_name"),  desc: t("s1_desc"),  href: "/solutions" },
    { Icon: Settings,   name: t("s2_name"),  desc: t("s2_desc"),  href: "/solutions" },
    { Icon: Workflow,   name: t("s3_name"),  desc: t("s3_desc"),  href: "/solutions" },
    { Icon: Webhook,    name: t("s4_name"),  desc: t("s4_desc"),  href: "/solutions" },
  ]
  const checks = [t("chk1"), t("chk2"), t("chk3"), t("chk4"), t("chk5"), t("chk6")]
  const mesChecks = [t("mchk1"), t("mchk2"), t("mchk3"), t("mchk4"), t("mchk5"), t("mchk6")]
  const ecomChecks = [t("echk1"), t("echk2"), t("echk3"), t("echk4"), t("echk5"), t("echk6")]
  const stats = statNums.map((n, i) => [n, t(`stat${i + 1}_sub`)] as const)
  const industries = [
    { Icon: Car,         name: t("i1_name"), desc: t("i1_desc") },
    { Icon: Factory,     name: t("i2_name"), desc: t("i2_desc") },
    { Icon: Truck,       name: t("i3_name"), desc: t("i3_desc") },
    { Icon: ShoppingBag, name: t("i4_name"), desc: t("i4_desc") },
    { Icon: Cog,         name: t("i5_name"), desc: t("i5_desc") },
    { Icon: Plus,        name: t("i6_name"), desc: t("i6_desc") },
  ]
  const testimonials = [
    { q: t("q1"), n: "Markus Keller", r: "Head of Operations, NORDWERK", a: "MK" },
    { q: t("q2"), n: "Sofia Demir",   r: "Supply Chain Lead, Helix Logistics", a: "SD" },
    { q: t("q3"), n: "Lars Visser",   r: "CFO, Vantis", a: "LV" },
  ]
  const insights = [
    { cat: t("a1_cat"), title: t("a1_title"), desc: t("a1_desc") },
    { cat: t("a2_cat"), title: t("a2_title"), desc: t("a2_desc") },
    { cat: t("a3_cat"), title: t("a3_title"), desc: t("a3_desc") },
  ]

  return (
    <>
      {/* HERO — multi-panel major activities (unchanged) */}
      <HeroPanels />

      <div className="dx">
        <style dangerouslySetInnerHTML={{ __html: dxCss }} />

        {/* FLIER — running banner */}
        <div className="flier" aria-hidden="true">
          <div className="track">
            {[...flier, ...flier].map((item, i) => <span className="item" key={i}>{item}</span>)}
          </div>
        </div>

        {/* LOGOS */}
        <section className="logos">
          <div className="wrap">
            <p>{t("logos_caption")}</p>
            <div className="logo-row">
              {logos.map(n => <b key={n}>{n}</b>)}
            </div>
          </div>
        </section>

        {/* SOLUTIONS */}
        <section className="section" id="solutions">
          <div className="wrap">
            <div className="center" style={{ marginBottom: 46 }}>
              <span className="eyebrow">{t("sol_eyebrow")}</span>
              <h2 style={{ marginTop: 10 }}>{t("sol_title")}</h2>
              <p className="lead">{t("sol_lead")}</p>
            </div>
            <div className="grid grid-5">
              {solutions.map(s => (
                <div className="card" key={s.name}>
                  <div className="ic"><s.Icon /></div>
                  <h3>{s.name}</h3>
                  <p>{s.desc}</p>
                  <Link href={s.href} className="more">{t("discover_more")} <ArrowRight /></Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SAP SPLIT */}
        <section className="section soft" id="services">
          <div className="wrap split">
            <div>
              <span className="eyebrow">{t("sap_eyebrow")}</span>
              <h2 style={{ margin: "10px 0 16px" }}>{t("sap_title")}</h2>
              <p className="lead">{t("sap_lead")}</p>
              <ul className="checks">
                {checks.map(c => <li key={c}><Check />{c}</li>)}
              </ul>
              <Link href="/solutions" className="btn btn-primary">{t("sap_btn")}</Link>
            </div>
            <div className="panelcard">
              <h3>{t("sap_box_title")}</h3>
              <p>{t("sap_box_desc")}</p>
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
              <span className="eyebrow">{t("mes_eyebrow")}</span>
              <h2 style={{ margin: "10px 0 16px" }}>{t("mes_title")}</h2>
              <p className="lead">{t("mes_lead")}</p>
              <ul className="checks">
                {mesChecks.map(c => <li key={c}><Check />{c}</li>)}
              </ul>
              <Link href="/solutions" className="btn btn-primary">{t("mes_btn")}</Link>
            </div>
            <div className="panelcard">
              <h3>{t("mes_box_title")}</h3>
              <p>{t("mes_box_desc")}</p>
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
              <span className="eyebrow">{t("ecom_eyebrow")}</span>
              <h2 style={{ margin: "10px 0 16px" }}>{t("ecom_title")}</h2>
              <p className="lead">{t("ecom_lead")}</p>
              <ul className="checks">
                {ecomChecks.map(c => <li key={c}><Check />{c}</li>)}
              </ul>
              <Link href="/contact" className="btn btn-primary">{t("ecom_btn")}</Link>
            </div>
            <div className="panelcard">
              <h3>{t("ecom_box_title")}</h3>
              <p>{t("ecom_box_desc")}</p>
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
                <span className="eyebrow">{t("ind_eyebrow")}</span>
                <h2 style={{ marginTop: 10 }}>{t("ind_title")}</h2>
              </div>
              <p className="lead">{t("ind_lead")}</p>
            </div>
            <div className="grid grid-3">
              {industries.map(i => (
                <div className="card" key={i.name}>
                  <div className="ic"><i.Icon /></div>
                  <h3>{i.name}</h3>
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
              <span className="eyebrow">{t("test_eyebrow")}</span>
              <h2 style={{ marginTop: 10 }}>{t("test_title")}</h2>
            </div>
            <div className="grid grid-3">
              {testimonials.map(tm => (
                <div className="quote" key={tm.n}>
                  <div className="stars">★★★★★</div>
                  <p>&ldquo;{tm.q}&rdquo;</p>
                  <div className="by"><span className="avatar">{tm.a}</span><div><b>{tm.n}</b><span>{tm.r}</span></div></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* INSIGHTS */}
        <section className="section" id="insights">
          <div className="wrap">
            <div className="head-row">
              <div><span className="eyebrow">{t("ins_eyebrow")}</span><h2 style={{ marginTop: 10 }}>{t("ins_title")}</h2></div>
              <Link href="/contact" className="btn btn-outline">{t("ins_viewall")}</Link>
            </div>
            <div className="grid grid-3">
              {insights.map(a => (
                <article className="card" key={a.title}>
                  <span className="eyebrow" style={{ color: "var(--accent-2)" }}>{a.cat}</span>
                  <h3 style={{ margin: "10px 0 6px" }}>{a.title}</h3>
                  <p>{a.desc}</p>
                  <Link href="/contact" className="more">{t("read_article")} <ArrowRight /></Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="section" id="contact">
          <div className="wrap">
            <div className="cta">
              <h2>{t("cta_title")}</h2>
              <p>{t("cta_lead")}</p>
              <div className="row">
                <a href="mailto:info@dessystems.io" className="btn btn-primary">{t("cta_btn1")}</a>
                <Link href="/solutions" className="btn btn-ghost">{t("cta_btn2")}</Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}

"use client"
import { dxCss } from "@/components/dx-styles"
import { VerifiedBadge } from "@/components/verified-badge"
import { Link } from "@/src/i18n/routing"
import { ArrowRight, Factory, Cog, Webhook, Workflow, BarChart3, Users } from "lucide-react"

const arms = [
  { Icon: Cog,      name: "ERP & SAP Consulting",    tag: "Core service",   desc: "S/4HANA implementations, module configuration and logistics consulting across PP, QM, MM, eWM and SD." },
  { Icon: Factory,  name: "Digital Manufacturing",    tag: "Specialisation", desc: "MES setup, shop-floor integration and real-time production visibility from machine to ERP." },
  { Icon: Webhook,  name: "Systems Integration",      tag: "Technical",      desc: "Connecting factory automation, RFID, scanning and inspection devices to SAP via IDoc, RFC and web services." },
  { Icon: Workflow, name: "Process Automation",       tag: "Operations",     desc: "Workflow automation that removes manual bottlenecks, cuts cost and reduces error rates across enterprise processes." },
  { Icon: BarChart3,name: "Data, IoT & Intelligence", tag: "Transformation", desc: "Big Data, IoT platforms and AI data lakes fed straight from the shop floor for real-time visibility." },
  { Icon: Users,    name: "DES Platform (BOP)",       tag: "Product",        desc: "Our proprietary Business Operating Platform — managing leads, listings, operations and analytics in one ecosystem." },
]

const stats = [
  { n: "20+", l: "Years in enterprise IT" },
  { n: "20+", l: "Factories consulted" },
  { n: "3",   l: "Industries: Glass · Biotech · Oil" },
  { n: "15+", l: "Major SAP / MES rollouts" },
]

const facts = [
  { label: "Founded",    value: "2024" },
  { label: "HQ",         value: "Dordrecht, Netherlands" },
  { label: "Reach",      value: "NL · BE · DE · FR · TR" },
  { label: "Stack",      value: "Next.js · Supabase · AI" },
  { label: "Infra",      value: "Own VPS · DES BOP platform" },
]

export default function AboutPage() {
  return (
    <div className="dx" style={{ paddingTop: 72 }}>
      <style dangerouslySetInnerHTML={{ __html: dxCss }} />

      {/* Hero */}
      <section className="section" style={{ background: "var(--navy)", paddingTop: 88, paddingBottom: 88 }}>
        <div className="wrap">
          <span className="eyebrow" style={{ color: "#5b9dff" }}>About DES Systems</span>
          <h2 style={{ color: "#fff", marginTop: 12, maxWidth: 700 }}>Enterprise software expertise.<br />Built from the factory floor up.</h2>
          <p className="lead" style={{ color: "#9fb0cc", marginTop: 18 }}>DES Systems delivers SAP consulting, MES integration, process automation and digital-transformation services to manufacturers and enterprises across Europe.</p>
        </div>
      </section>

      {/* Stats band */}
      <div className="band">
        <div className="wrap">
          <div className="grid grid-4 band" style={{ gap: 0 }}>
            {stats.map(s => (
              <div key={s.l} className="s">
                <b>{s.n}</b>
                <span>{s.l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Story + facts */}
      <section className="section soft">
        <div className="wrap split">
          <div>
            <span className="eyebrow">Our story</span>
            <h2 style={{ marginTop: 12 }}>20 years of hands-on enterprise delivery</h2>
            <p style={{ color: "var(--slate)", marginTop: 16, fontSize: 15, lineHeight: 1.75 }}>
              DES was built from two decades of real-world SAP and manufacturing experience. From glass factories to biotech facilities and industrial oil plants, we have implemented, integrated and optimised enterprise software at scale across three continents.
            </p>
            <p style={{ color: "var(--slate)", marginTop: 14, fontSize: 15, lineHeight: 1.75 }}>
              Today DES combines that consulting depth with our own product — the Business Operating Platform — enabling businesses to manage operations, listings, leads and analytics from a single, AI-native console.
            </p>
            <p style={{ color: "var(--slate)", marginTop: 14, fontSize: 15, lineHeight: 1.75 }}>
              We work with manufacturers, distributors and fast-growing companies who need an expert partner — not just a vendor — to get real outcomes from their enterprise systems.
            </p>
          </div>
          <div className="card" style={{ alignSelf: "start" }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--slate)", marginBottom: 16 }}>Company facts</div>
            {facts.map(r => (
              <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid var(--line)", fontSize: 14 }}>
                <span style={{ color: "var(--slate)" }}>{r.label}</span>
                <span style={{ fontWeight: 600, color: "var(--navy)" }}>{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What we do */}
      <section className="section">
        <div className="wrap">
          <div className="head-row">
            <div>
              <span className="eyebrow">What we do</span>
              <h2 style={{ marginTop: 10 }}>Core expertise &amp; services</h2>
              <p className="lead" style={{ marginTop: 12 }}>End-to-end capabilities across SAP, manufacturing, integration and our own platform.</p>
            </div>
          </div>
          <div className="grid grid-3">
            {arms.map(a => (
              <div key={a.name} className="card">
                <div className="ic"><a.Icon /></div>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--accent-2)", display: "inline-block", marginBottom: 8 }}>{a.tag}</span>
                <h3>{a.name}</h3>
                <p>{a.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Founder card */}
      <section className="section soft">
        <div className="wrap">
          <div style={{ background: "linear-gradient(135deg,var(--navy),#13294b)", borderRadius: 20, padding: "48px 44px", display: "flex", gap: 40, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 260 }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".12em", color: "#5b9dff", display: "block", marginBottom: 12 }}>The Founder</span>
              <h2 style={{ color: "#fff", fontSize: "clamp(22px,3vw,32px)", marginBottom: 14 }}>Sunay S. — SAP Solution Architect &amp; Digital Manufacturing Expert</h2>
              <p style={{ color: "#9fb0cc", fontSize: 15, lineHeight: 1.7, maxWidth: 560 }}>
                20+ years turning factory floors into connected, data-driven systems. The hands-on experience behind every DES service — from S/4HANA greenfield rollouts to MES integration and AI data lakes.
              </p>
            </div>
            <Link href="/founder" className="btn btn-primary" style={{ flexShrink: 0 }}>
              Meet the Founder <ArrowRight />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section">
        <div className="wrap">
          <div className="cta">
            <h2>{"Let's discuss your project"}</h2>
            <p>Available for remote &amp; on-site engagements across Europe. Tell us about your systems and we will map the fastest path to results.</p>
            <div className="row">
              <Link href="/contact" className="btn btn-primary">Get in touch <ArrowRight /></Link>
              <Link href="/solutions" className="btn btn-ghost">Our solutions</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Verified badge */}
      <section className="section soft">
        <div className="wrap" style={{ maxWidth: 520 }}>
          <VerifiedBadge />
        </div>
      </section>
    </div>
  )
}

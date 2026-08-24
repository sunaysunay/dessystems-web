import type { Metadata } from "next"
import { Link } from "@/src/i18n/routing"
import { ArrowRight } from "lucide-react"
import { dxCss } from "@/components/dx-styles"

export const metadata: Metadata = {
  title: "Careers — DES Systems | Build the Enterprise Stack With Us",
  description: "Join DES Systems. SAP consultants, integration engineers, platform developers and commerce specialists — remote-first roles across Europe within the DES Group.",
}

const values = [
  { n: "01", title: "Ownership, not tickets", desc: "You own an outcome — a migration, an integration, a platform module — from design to go-live and beyond." },
  { n: "02", title: "Practitioners first", desc: "Our senior consultants still build. You learn SAP, MES and integration craft from people with 23+ years hands-on." },
  { n: "03", title: "Real proving grounds", desc: "The DES Group's own automotive and e-commerce companies are live environments where your work ships fast." },
  { n: "04", title: "Remote-first, Europe-wide", desc: "Work from anywhere in Europe, with on-site client visits when the work truly benefits from it." },
]

const benefits = [
  { title: "Competitive compensation", desc: "Market-rate salary with project and performance bonuses." },
  { title: "Flexible & remote", desc: "Remote-first setup, flexible hours, home-office budget." },
  { title: "Certification budget", desc: "Paid SAP and cloud certifications, plus dedicated learning days." },
  { title: "Modern equipment", desc: "Your choice of hardware and the tooling you need to do great work." },
  { title: "Travel done right", desc: "Client travel planned in advance, compensated properly." },
  { title: "Group perks", desc: "Staff discounts across DES Campers, DESMOBIL and DESSHOP." },
]

const roles = [
  { title: "Senior SAP Logistics Consultant (MM/WM/EWM)", location: "Remote · Europe", type: "Full-time", level: "Senior", tag: "SAP & ERP", subject: "Application — Senior SAP Logistics Consultant" },
  { title: "SAP S/4HANA PP/QM Consultant", location: "Remote · Europe", type: "Full-time", level: "Medior–Senior", tag: "SAP & ERP", subject: "Application — S4HANA PP QM Consultant" },
  { title: "Integration Engineer (REST / EDI / IDoc)", location: "Remote · Europe", type: "Full-time", level: "Medior", tag: "Integration", subject: "Application — Integration Engineer" },
  { title: "MES Integration Specialist", location: "Remote · Europe · on-site visits", type: "Full-time", level: "Medior–Senior", tag: "Manufacturing", subject: "Application — MES Integration Specialist" },
  { title: "Full-Stack Developer — Business Operating Platform", location: "Remote · Europe", type: "Full-time", level: "Medior", tag: "Platform", subject: "Application — Full-Stack Developer" },
  { title: "E-Commerce & Performance Marketing Specialist", location: "Remote / Roosendaal (NL)", type: "Full-time", level: "Medior", tag: "Commerce", subject: "Application — E-Commerce Specialist" },
  { title: "Open application", location: "Remote · Europe", type: "Tell us what you're great at", level: "", tag: "All teams", subject: "Open Application" },
]

const steps = [
  { step: "01", title: "Intro call", desc: "30 minutes with the hiring lead — mutual fit, expectations, questions." },
  { step: "02", title: "Technical deep-dive", desc: "A working session on a realistic scenario from our practice. No trick puzzles." },
  { step: "03", title: "Team conversation", desc: "Meet the people you'd work with daily and see how we actually run projects." },
  { step: "04", title: "Offer", desc: "A clear, complete offer — compensation, growth path and start date." },
]

export default function CareersPage() {
  return (
    <div className="dx" style={{ paddingTop: 72 }}>
      <style dangerouslySetInnerHTML={{ __html: dxCss + pageCss }} />

      {/* Hero */}
      <section className="pg-hero">
        <div className="wrap">
          <span className="pg-kicker">Careers</span>
          <h1 className="pg-h1">Build systems that run real businesses.</h1>
          <p className="pg-lead">At DES Systems your code, configurations and designs go straight into production — powering factories, warehouses, dealerships and webshops across Europe, including the DES Group&apos;s own operating companies.</p>
          <div className="pg-actions">
            <a href="#openings" className="btn btn-primary">View open roles <ArrowRight /></a>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="section">
        <div className="wrap">
          <div className="pg-sec-head">
            <span className="eyebrow">How we work</span>
            <h2>Small teams, senior standards</h2>
            <p className="lead">No layers of account managers. You work directly with clients and colleagues who have been doing this for decades.</p>
          </div>
          <div className="grid grid-4">
            {values.map(v => (
              <div className="card" key={v.n}>
                <div className="cr-val-num">{v.n}</div>
                <h3 style={{ margin: "14px 0 8px" }}>{v.title}</h3>
                <p>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="section soft">
        <div className="wrap">
          <div className="pg-sec-head">
            <span className="eyebrow">What you get</span>
            <h2>Benefits that respect your time</h2>
          </div>
          <div className="grid grid-3">
            {benefits.map(b => (
              <div className="cr-perk" key={b.title}>
                <div className="cr-perk-dot" />
                <div>
                  <b style={{ display: "block", fontSize: "0.97rem", marginBottom: 4 }}>{b.title}</b>
                  <span style={{ fontSize: "0.88rem", color: "var(--slate)" }}>{b.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Open roles */}
      <section className="section" id="openings">
        <div className="wrap">
          <div className="pg-sec-head">
            <span className="eyebrow">Open roles</span>
            <h2>Current openings</h2>
            <p className="lead">Don&apos;t see your role? We always want to hear from strong SAP and integration people — send an open application.</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {roles.map(r => (
              <div className="cr-job" key={r.title}>
                <div className="cr-job-info">
                  <h3 style={{ fontSize: "1.08rem", marginBottom: 6 }}>{r.title}</h3>
                  <div className="cr-job-meta">
                    <span>{r.location}</span>
                    <span>{r.type}</span>
                    {r.level && <span>{r.level}</span>}
                  </div>
                </div>
                <div className="cr-job-right">
                  <span className="cr-tag">{r.tag}</span>
                  <a
                    className="btn btn-ghost"
                    href={`mailto:careers@dessystems.io?subject=${encodeURIComponent(r.subject)}`}
                    style={{ fontSize: 13, padding: "9px 20px" }}
                  >
                    Apply
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="section soft">
        <div className="wrap">
          <div className="pg-sec-head">
            <span className="eyebrow">Hiring process</span>
            <h2>Four steps, no ghosting</h2>
            <p className="lead">We respond to every application within five working days and keep the whole process under three weeks.</p>
          </div>
          <div className="grid grid-4">
            {steps.map(s => (
              <div className="pg-step" key={s.step}>
                <span className="pg-step-label">Step {s.step}</span>
                <h3 style={{ margin: "10px 0 8px" }}>{s.title}</h3>
                <p style={{ fontSize: 14, color: "var(--slate)" }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section">
        <div className="wrap">
          <div className="cta">
            <h2>Ready to build the stack with us?</h2>
            <p>Send your CV or LinkedIn profile to <strong style={{ color: "#8fb4ff" }}>careers@dessystems.io</strong> — a human reads every application.</p>
            <div className="row">
              <a href="mailto:careers@dessystems.io" className="btn btn-primary">Apply now <ArrowRight /></a>
              <Link href="/contact" className="btn btn-ghost">Get in touch</Link>
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
.pg-step{padding:26px 22px;border-left:3px solid var(--accent);background:#fff;border-radius:0 var(--radius) var(--radius) 0;box-shadow:var(--shadow)}
.pg-step-label{font-size:11px;font-weight:700;letter-spacing:.16em;color:var(--accent);text-transform:uppercase}
.cr-val-num{width:44px;height:44px;border-radius:11px;background:linear-gradient(135deg,#1d6cf0,#0f9d8c);color:#fff;font-weight:800;font-size:14px;display:flex;align-items:center;justify-content:center}
.cr-perk{display:flex;gap:16px;align-items:flex-start;background:#fff;border:1px solid var(--line);border-radius:var(--radius);padding:20px 22px;box-shadow:var(--shadow)}
.cr-perk-dot{min-width:10px;height:10px;border-radius:2px;background:var(--accent);margin-top:6px;flex:none}
.cr-job{display:flex;flex-wrap:wrap;gap:16px;align-items:center;justify-content:space-between;border:1px solid var(--line);border-radius:var(--radius);padding:24px 28px;background:#fff;box-shadow:var(--shadow);transition:.2s}
.cr-job:hover{box-shadow:0 12px 34px rgba(11,31,58,.10);border-color:#cdd8ea}
.cr-job-info{flex:1;min-width:200px}
.cr-job-meta{display:flex;gap:16px;flex-wrap:wrap;font-size:13px;color:var(--slate);margin-top:4px}
.cr-job-right{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.cr-tag{font-size:11px;font-weight:700;color:var(--accent);background:rgba(29,108,240,.09);border-radius:999px;padding:4px 12px;letter-spacing:.04em}
.dx .btn-ghost{border:1px solid var(--line);color:var(--navy);background:transparent}
.dx .btn-ghost:hover{border-color:var(--accent);color:var(--accent)}
`

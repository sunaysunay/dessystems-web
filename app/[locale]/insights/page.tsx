import type { Metadata } from "next"
import { dxCss } from "@/components/dx-styles"
import { InsightsGrid } from "./insights-grid"

export const metadata: Metadata = {
  title: "Insights — DES Systems | Perspectives on ERP, MES & Digital Operations",
  description: "Articles, guides and field notes from DES Systems on SAP S/4HANA, MES integration, workflow automation and digital commerce — written by practitioners.",
}

export default function InsightsPage() {
  return (
    <div className="dx" style={{ paddingTop: 72 }}>
      <style dangerouslySetInnerHTML={{ __html: dxCss + pageCss }} />

      {/* Hero */}
      <section className="pg-hero">
        <div className="wrap">
          <span className="pg-kicker">Insights</span>
          <h1 className="pg-h1">Field notes from the enterprise stack.</h1>
          <p className="pg-lead">Practical perspectives on SAP, MES, automation and digital commerce — written by the people who implement them, not by a content agency.</p>
        </div>
      </section>

      {/* Articles with interactive filter */}
      <section className="section" style={{ paddingTop: 48 }}>
        <div className="wrap">
          <InsightsGrid />
        </div>
      </section>

      {/* Newsletter */}
      <section className="section soft">
        <div className="wrap">
          <div className="cta">
            <h2>Operational intelligence, monthly.</h2>
            <p>One email per month. Implementation lessons, tooling notes and zero marketing fluff.</p>
            <div className="row">
              <a href="mailto:info@dessystems.io?subject=Newsletter%20Subscription" className="btn btn-primary">
                Subscribe by email
              </a>
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
.ins-filters{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:36px}
.ins-chip{font-size:13px;font-weight:600;padding:8px 18px;border-radius:999px;border:1px solid var(--line);color:var(--slate);background:#fff;cursor:pointer;transition:.15s}
.ins-chip:hover{border-color:var(--accent);color:var(--accent)}
.ins-chip.on{background:var(--accent);border-color:var(--accent);color:#fff}
.ins-featured{display:grid;grid-template-columns:1.1fr 1fr;border-radius:18px;overflow:hidden;background:#0b1f3a;color:#fff;margin-bottom:48px;text-decoration:none;transition:.2s}
.ins-featured:hover{box-shadow:0 20px 56px rgba(11,31,58,.22);transform:translateY(-2px)}
.ins-fig{min-height:280px;background:linear-gradient(135deg,#0f3d7a,#1d6cf0 70%,#4d8bff);display:flex;align-items:center;justify-content:center;font-size:3.5rem;font-weight:800;color:rgba(255,255,255,.3);letter-spacing:.05em}
.ins-feat-body{padding:44px 40px;display:flex;flex-direction:column;justify-content:center;gap:0}
.ins-meta{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#8fb4ff;font-weight:700;margin-bottom:14px}
.ins-feat-title{font-size:1.5rem;font-weight:800;line-height:1.25;color:#fff;margin:0 0 12px}
.ins-feat-desc{color:#c3cfe2;font-size:0.95rem;line-height:1.65;margin:0}
.ins-readmore{display:inline-block;margin-top:20px;font-weight:700;color:#8fb4ff;font-size:14px}
.ins-post{border:1px solid var(--line);border-radius:var(--radius);overflow:hidden;background:#fff;display:flex;flex-direction:column;box-shadow:var(--shadow);text-decoration:none;transition:.2s;color:inherit}
.ins-post:hover{box-shadow:0 14px 40px rgba(11,31,58,.12);transform:translateY(-3px);border-color:#cdd8ea}
.ins-thumb{height:140px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1.4rem;color:#fff;letter-spacing:.06em;flex-shrink:0}
.ins-post-body{padding:24px;display:flex;flex-direction:column;flex:1;gap:0}
.ins-post-meta{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--accent);margin-bottom:10px}
.ins-post-title{font-size:1rem;font-weight:700;line-height:1.35;color:var(--navy);margin:0 0 8px}
.ins-post-desc{font-size:13.5px;color:var(--slate);line-height:1.6;flex:1;margin:0}
.ins-post-by{margin-top:16px;font-size:12px;color:var(--slate);display:block}
@media(max-width:860px){.ins-featured{grid-template-columns:1fr}.ins-fig{min-height:160px}}
`

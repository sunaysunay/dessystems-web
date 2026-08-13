import type { Metadata } from "next"
import { Link } from "@/src/i18n/routing"
import { getTranslations } from "next-intl/server"
import { ArrowRight, Sparkles, Bot, Zap, Database, FlaskConical } from "lucide-react"
import { dxCss } from "@/components/dx-styles"

export const metadata: Metadata = {
  title: "DesLab — R&D & Innovation | DES Systems",
  description: "DesLab is the experimental arm of DES Systems — where we prototype AI tools, automation, and internal platform features before they ship.",
}

const PROJECTS = [
  { id: "p1", Icon: Bot,         statusColor: "#0f9d8c", tags: ["Claude API", "OCR", "Automation"] },
  { id: "p2", Icon: Database,    statusColor: "#f59e0b", tags: ["Supabase", "Webhooks", "Sync"] },
  { id: "p3", Icon: Zap,         statusColor: "#10b981", tags: ["BTP", "Automation", "Low-code"] },
  { id: "p4", Icon: FlaskConical,statusColor: "#7c3aed", tags: ["Machine Learning", "Analytics"] },
]

export default async function DesLabPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "DesLab" })

  return (
    <div className="dx" style={{ paddingTop: 72 }}>
      <style dangerouslySetInnerHTML={{ __html: dxCss }} />

      <section className="section">
        <div className="wrap center">
          <span className="eyebrow" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Sparkles style={{ width: 14, height: 14 }} /> DES Systems / R&amp;D
          </span>
          <h2 style={{ marginTop: 14, fontSize: "clamp(34px,5vw,56px)" }}>DesLab</h2>
          <p className="lead" style={{ margin: "14px auto 0" }}>{t("hero_sub")}</p>
        </div>
      </section>

      <section className="section soft">
        <div className="wrap split">
          <div>
            <span className="eyebrow">{t("what_eyebrow")}</span>
            <h2 style={{ margin: "10px 0 16px" }}>{t("what_title")}</h2>
            <p className="lead">{t("what_desc")}</p>
          </div>
          <div className="panelcard">
            <h3>{t("built_with")}</h3>
            <div className="modules" style={{ marginTop: 16 }}>
              {["Claude API", "Next.js", "Supabase", "SAP BTP", "Python", "Tailwind CSS"].map(tag => (
                <span className="chip" key={tag}>{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="center" style={{ marginBottom: 40 }}>
            <span className="eyebrow">{t("projects_eyebrow")}</span>
            <h2 style={{ marginTop: 10 }}>{t("projects_title")}</h2>
          </div>
          <div className="grid grid-2">
            {PROJECTS.map(p => (
              <div className="card" key={p.id}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <div className="ic" style={{ marginBottom: 0 }}><p.Icon /></div>
                  <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 700, padding: "4px 10px", borderRadius: 20, color: p.statusColor, border: `1px solid ${p.statusColor}33`, background: `${p.statusColor}11` }}>
                    {t(`${p.id}_status`)}
                  </span>
                </div>
                <h3>{t(`${p.id}_title`)}</h3>
                <p>{t(`${p.id}_desc`)}</p>
                <div className="modules" style={{ marginTop: 14 }}>
                  {p.tags.map(tag => <span className="chip" key={tag}>{tag}</span>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section soft">
        <div className="wrap">
          <div className="cta">
            <h2>{t("cta_title")}</h2>
            <p>{t("cta_desc")}</p>
            <div className="row">
              <Link href="/contact" className="btn btn-primary">{t("cta_btn")} <ArrowRight /></Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

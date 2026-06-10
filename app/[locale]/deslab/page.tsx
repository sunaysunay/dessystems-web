import type { Metadata } from "next"
import { Link } from "@/src/i18n/routing"
import { getTranslations } from "next-intl/server"
import { ArrowRight, Sparkles, Cpu, FlaskConical, Bot, Zap, Database } from "lucide-react"

export const metadata: Metadata = {
  title: "DesLab — R&D & Innovation | DES Systems",
  description: "DesLab is the experimental arm of DES Systems — where we prototype AI tools, automation, and internal platform features before they ship.",
}

const PROJECTS = [
  { id: "p1", icon: Bot, statusColor: "var(--accent2)", tags: ["Claude API", "OCR", "Automation"] },
  { id: "p2", icon: Database, statusColor: "#f59e0b", tags: ["Supabase", "Webhooks", "Sync"] },
  { id: "p3", icon: Zap, statusColor: "#10b981", tags: ["BTP", "Automation", "Low-code"] },
  { id: "p4", icon: FlaskConical, statusColor: "#7c3aed", tags: ["Machine Learning", "Analytics"] },
]

export default async function DesLabPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "DesLab" })

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", paddingTop: "80px" }}>
      {/* Hero */}
      <section className="relative overflow-hidden grid-bg">
        <div className="max-w-5xl mx-auto px-[4%] py-24 text-center relative z-10">
          <div className="inline-flex items-center gap-2 text-[11px] tracking-[0.12em] uppercase font-medium mb-5 px-3 py-1.5 rounded-full"
            style={{ color: "var(--accent2)", border: "1px solid var(--border2)", background: "var(--bg3)" }}>
            <Sparkles className="w-3.5 h-3.5" />
            DES Systems / R&D
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-5" style={{ fontFamily: "'Syne',sans-serif" }}>
            DesLab
          </h1>
          <p className="text-lg md:text-xl max-w-2xl mx-auto" style={{ color: "var(--text2)" }}>
            {t("hero_sub")}
          </p>
        </div>
      </section>

      {/* What is DesLab */}
      <section className="max-w-5xl mx-auto px-[4%] py-16 grid md:grid-cols-2 gap-10 items-start">
        <div>
          <div className="text-[11px] tracking-[0.12em] uppercase font-medium mb-3" style={{ color: "var(--accent2)" }}>{t("what_eyebrow")}</div>
          <h2 className="text-2xl md:text-3xl font-bold mb-4" style={{ fontFamily: "'Syne',sans-serif" }}>
            {t("what_title")}
          </h2>
          <p className="leading-relaxed" style={{ color: "var(--text2)" }}>
            {t("what_desc")}
          </p>
        </div>
        <div className="rounded-xl p-6" style={{ background: "var(--bg3)", border: "1px solid var(--border2)" }}>
          <div className="flex items-center gap-3 mb-4">
            <Cpu className="w-5 h-5" style={{ color: "var(--accent2)" }} />
            <div className="text-[11px] uppercase tracking-wider" style={{ color: "var(--text3)" }}>{t("built_with")}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            {["Claude API", "Next.js", "Supabase", "SAP BTP", "Python", "Tailwind CSS"].map(tag => (
              <span key={tag} className="text-[12px] px-3 py-1 rounded-full"
                style={{ background: "var(--bg4)", border: "1px solid var(--border)", color: "var(--text2)" }}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Projects grid */}
      <section className="max-w-5xl mx-auto px-[4%] py-16">
        <div className="text-[11px] tracking-[0.12em] uppercase font-medium mb-3" style={{ color: "var(--accent2)" }}>{t("projects_eyebrow")}</div>
        <h2 className="text-2xl md:text-3xl font-bold mb-10" style={{ fontFamily: "'Syne',sans-serif" }}>
          {t("projects_title")}
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          {PROJECTS.map(p => (
            <div key={p.id} className="rounded-xl p-6" style={{ background: "var(--bg3)", border: "1px solid var(--border)" }}>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "var(--bg4)" }}>
                  <p.icon className="w-5 h-5" style={{ color: "var(--accent2)" }} />
                </div>
                <span className="text-[10px] uppercase tracking-wider font-medium px-2.5 py-1 rounded-full"
                  style={{ color: p.statusColor, border: `1px solid ${p.statusColor}33`, background: `${p.statusColor}11` }}>
                  {t(`${p.id}_status`)}
                </span>
              </div>
              <h3 className="text-lg font-bold mb-2" style={{ fontFamily: "'Syne',sans-serif" }}>{t(`${p.id}_title`)}</h3>
              <p className="text-[14px] leading-relaxed mb-4" style={{ color: "var(--text2)" }}>{t(`${p.id}_desc`)}</p>
              <div className="flex flex-wrap gap-2">
                {p.tags.map(tag => (
                  <span key={tag} className="text-[11px] px-2.5 py-1 rounded-md" style={{ background: "var(--bg4)", color: "var(--text3)" }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-[4%] py-16">
        <div className="rounded-xl p-10 text-center" style={{ background: "var(--bg3)", border: "1px solid var(--border2)" }}>
          <h2 className="text-2xl md:text-3xl font-bold mb-3" style={{ fontFamily: "'Syne',sans-serif" }}>
            {t("cta_title")}
          </h2>
          <p className="mb-6 max-w-xl mx-auto" style={{ color: "var(--text2)" }}>
            {t("cta_desc")}
          </p>
          <Link href="/contact"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-[14px] transition-opacity hover:opacity-90"
            style={{ background: "var(--accent)", color: "#fff" }}>
            {t("cta_btn")} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  )
}

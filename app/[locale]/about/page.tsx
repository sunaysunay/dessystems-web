import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { localeAlternates } from "@/src/i18n/seo"
import { dxCss } from "@/components/dx-styles"
import { VerifiedBadge } from "@/components/verified-badge"
import { Link } from "@/src/i18n/routing"
import { ArrowRight, Factory, Cog, Webhook, Workflow, BarChart3, Users } from "lucide-react"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "About" })
  return { title: t("meta.title"), description: t("meta.desc"), alternates: localeAlternates("/about") }
}

const armIcons = [Cog, Factory, Webhook, Workflow, BarChart3, Users]
const statNums = ["20+", "20+", "3", "15+"]

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "About" })

  const arms = armIcons.map((Icon, i) => ({
    Icon,
    name: t(`arm${i + 1}_name`),
    tag: t(`arm${i + 1}_tag`),
    desc: t(`arm${i + 1}_desc`),
  }))

  const stats = statNums.map((n, i) => ({ n, l: t(`stat${i + 1}`) }))

  const facts = [1, 2, 3, 4, 5].map(i => ({ label: t(`fact${i}_l`), value: t(`fact${i}_v`) }))

  return (
    <div className="dx" style={{ paddingTop: 72 }}>
      <style dangerouslySetInnerHTML={{ __html: dxCss }} />

      {/* Hero */}
      <section className="section" style={{ background: "var(--navy)", paddingTop: 88, paddingBottom: 88 }}>
        <div className="wrap">
          <span className="eyebrow" style={{ color: "#5b9dff" }}>{t("hero_eyebrow")}</span>
          <h2 style={{ color: "#fff", marginTop: 12, maxWidth: 700 }}>{t("hero_title1")}<br />{t("hero_title2")}</h2>
          <p className="lead" style={{ color: "#9fb0cc", marginTop: 18 }}>{t("hero_lead")}</p>
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
            <span className="eyebrow">{t("story_eyebrow")}</span>
            <h2 style={{ marginTop: 12 }}>{t("story_title")}</h2>
            <p style={{ color: "var(--slate)", marginTop: 16, fontSize: 15, lineHeight: 1.75 }}>
              {t("story_p1")}
            </p>
            <p style={{ color: "var(--slate)", marginTop: 14, fontSize: 15, lineHeight: 1.75 }}>
              {t("story_p2")}
            </p>
            <p style={{ color: "var(--slate)", marginTop: 14, fontSize: 15, lineHeight: 1.75 }}>
              {t("story_p3")}
            </p>
          </div>
          <div className="card" style={{ alignSelf: "start" }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--slate)", marginBottom: 16 }}>{t("facts_title")}</div>
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
              <span className="eyebrow">{t("what_eyebrow")}</span>
              <h2 style={{ marginTop: 10 }}>{t("what_title")}</h2>
              <p className="lead" style={{ marginTop: 12 }}>{t("what_lead")}</p>
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
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".12em", color: "#5b9dff", display: "block", marginBottom: 12 }}>{t("founder_eyebrow")}</span>
              <h2 style={{ color: "#fff", fontSize: "clamp(22px,3vw,32px)", marginBottom: 14 }}>{t("founder_title")}</h2>
              <p style={{ color: "#9fb0cc", fontSize: 15, lineHeight: 1.7, maxWidth: 560 }}>
                {t("founder_desc")}
              </p>
            </div>
            <Link href="/founder" className="btn btn-primary" style={{ flexShrink: 0 }}>
              {t("founder_cta")} <ArrowRight />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section">
        <div className="wrap">
          <div className="cta">
            <h2>{t("cta_title")}</h2>
            <p>{t("cta_desc")}</p>
            <div className="row">
              <Link href="/contact" className="btn btn-primary">{t("cta_btn1")} <ArrowRight /></Link>
              <Link href="/solutions" className="btn btn-ghost">{t("cta_btn2")}</Link>
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

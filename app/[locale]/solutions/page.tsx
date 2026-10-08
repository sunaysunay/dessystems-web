import type { Metadata } from "next"
import { Link } from "@/src/i18n/routing"
import { getTranslations } from "next-intl/server"
import { ArrowRight } from "lucide-react"
import { sxClass, sxCss } from "@/components/sx-styles"
import SolutionsIndex from "./solutions-index"

export const metadata: Metadata = {
  title: "Solutions — DES Systems",
  description: "Enterprise ERP consulting, MES integration, automation and custom platform solutions.",
}

const solutions = [
  { id: "erp",         modules: ["SAP MM", "SAP PP", "SAP QM", "SAP WM/EWM", "SAP PM", "SAP SD", "SAP TM"] },
  { id: "mes",         modules: ["SAP ME", "SAP MII", "Siemens Opcenter", "IDoc", "BAPI", "REST APIs"] },
  { id: "automation",  modules: ["SAP BTP", "Integration Suite", "Python", "Power Automate", "APIs", "Webhooks"] },
  { id: "integration", modules: ["SAP PI/PO", "Integration Suite", "EDI", "REST", "SOAP", "BTP"] },
  { id: "saas",        modules: ["Next.js", "React", "Node.js", "PostgreSQL", "Supabase", "Docker", "REST / GraphQL", "CI/CD"] },
]

// Static demo pages live outside the [locale] tree (public/), so they are linked with a plain <a>.
const demos = [
  { id: "vehicles",  url: "/solutions/demos/vehicles" },
  { id: "garage",    url: "/solutions/demos/garage" },
  { id: "spinsold",  url: "/solutions/demos/spinsold" },
  { id: "detailing", url: "/solutions/demos/detailing" },
  { id: "bodyshop",  url: "/solutions/demos/bodyshop" },
  { id: "spinsold2", url: "/solutions/demos/spinsold2" },
] as const

const platformFeatures = ["ai", "auto", "multi", "sec", "anal", "flow"]

const code = (i: number) => String(i + 1).padStart(2, "0")

export default async function SolutionsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "SolutionsPage" })

  return (
    <div className={sxClass}>
      <style dangerouslySetInnerHTML={{ __html: sxCss }} />

      {/* ── BOP Platform Hero ── */}
      <section className="sx-hero">
        <div className="sx-wrap sx-hero-grid">
          <div className="sx-hero-copy">
            <div className="sx-eyebrow">{t("plat.badge")}</div>
            <h1 className="sx-h1">{t.rich("plat.title", { em: (c) => <em>{c}</em> })}</h1>
            <p className="sx-lead">{t("plat.lead")}</p>
            <p className="sx-sub">{t("plat.sub")}</p>
            <div className="sx-btns">
              <Link href="/platform" className="sx-btn sx-btn-primary">{t("plat.cta_explore")} <ArrowRight /></Link>
              <Link href="/contact?topic=platform" className="sx-btn sx-btn-ghost">{t("plat.cta_demo")}</Link>
            </div>
          </div>
          <div className="sx-stack">
            {platformFeatures.map((id, i) => (
              <div key={id} className="sx-layer">
                <div className="sx-layer-code">{code(i)}</div>
                <div>
                  <div className="sx-layer-name">{t(`plat.f_${id}`)}</div>
                  <div className="sx-layer-desc">{t(`plat.f_${id}_d`)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Consulting Solutions ── */}
      <section>
        <div className="sx-wrap sx-section">
          <div className="sx-head">
            <div>
              <div className="sx-eyebrow">{t("eyebrow")}</div>
              <h2 className="sx-h2">{t("title1")} {t("title2")}</h2>
            </div>
            <p className="sx-head-p">{t("subtitle")}</p>
          </div>

          <div className="sx-sol-grid">
            <SolutionsIndex items={solutions.map((s, i) => ({ id: s.id, code: code(i), name: t(s.id === "saas" ? "saas.nav" : `${s.id}.title`) }))} />

            <div className="sx-articles">
              {solutions.map((s, i) => (
                <article className={s.id === "saas" ? "sx-card sx-card-feature" : "sx-card"} key={s.id} id={s.id}>
                  <div className="sx-card-top">
                    <div className="sx-card-meta">
                      <span className="sx-card-code">{code(i)}</span>
                      <span>{t(`${s.id}.subtitle`)}</span>
                    </div>
                    <h3 className="sx-h3">{t(`${s.id}.title`)}</h3>
                    <p className="sx-card-desc">{t(`${s.id}.desc`)}</p>
                  </div>
                  <div className="sx-card-body">
                    <ul className="sx-scope">
                      {Array.from({ length: 6 }, (_, bi) => (
                        <li key={bi}><span className="sx-sq" />{t(`${s.id}.b${bi + 1}`)}</li>
                      ))}
                    </ul>
                    <div className="sx-tech">
                      <div className="sx-label">{t("tech_label")}</div>
                      <div className="sx-chips">
                        {s.modules.map((m) => <span className="sx-chip" key={m}>{m}</span>)}
                      </div>
                    </div>
                  </div>
                  {s.id === "saas" && (
                    <div className="sx-demo-wrap">
                      <div className="sx-demos-grid">
                        {demos.map((d) => (
                          <div className="sx-demo" key={d.id}>
                            <div className="sx-demo-chrome">
                              <span /><span /><span />
                              <div className="sx-demo-url">dessystems.io{d.url}</div>
                            </div>
                            <div className="sx-demo-body">
                              <div className="sx-demo-copy">
                                <div className="sx-label">{t(`saas.${d.id}_label`)}</div>
                                <div className="sx-demo-title">{t(`saas.${d.id}_title`)}</div>
                                <p>{t(`saas.${d.id}_desc`)}</p>
                              </div>
                              <a href={d.url} target="_blank" rel="noopener" className="sx-btn sx-btn-primary">{t(`saas.${d.id}_cta`)} <ArrowRight /></a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="sx-card-bar">
                    <Link href={`/contact?topic=${s.id}`} className="sx-link">{t("discuss")} <ArrowRight /></Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── BOP band ── */}
      <section className="sx-band">
        <div className="sx-wrap sx-band-inner">
          <div className="sx-band-copy">
            <div className="sx-eyebrow sx-eyebrow-dark">{t("bop_eyebrow")}</div>
            <h2 className="sx-h2">Business Operating Platform</h2>
            <p>{t("bop_desc")}</p>
          </div>
          <Link href="/platform" className="sx-btn sx-btn-white">{t("bop_cta")} <ArrowRight /></Link>
        </div>
      </section>
    </div>
  )
}


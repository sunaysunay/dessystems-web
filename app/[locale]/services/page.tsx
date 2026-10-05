import type { Metadata } from "next"
import { Link } from "@/src/i18n/routing"
import { getTranslations } from "next-intl/server"
import { ArrowRight } from "lucide-react"
import { sxClass, sxCss } from "@/components/sx-styles"

export const metadata: Metadata = {
  title: "Services — DES Systems | ERP, SAP, MES & Automation",
  description: "End-to-end enterprise services from DES Systems: SAP S/4HANA consulting, MES integration, workflow automation, integration & APIs, and digital commerce engineering across Europe.",
}

const services = [
  { id: "erp",         label: "S4" },
  { id: "mes",         label: "MES" },
  { id: "automation",  label: "WF" },
  { id: "integration", label: "API" },
  { id: "bop",         label: "BOP" },
  { id: "ecommerce",   label: "EC" },
]

const stats = ["23+", "6", "12+", "100%"]

const phases = ["01", "02", "03", "04"]

export default async function ServicesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "ServicesPage" })

  return (
    <div className={sxClass}>
      <style dangerouslySetInnerHTML={{ __html: sxCss }} />

      {/* Hero */}
      <section className="sx-hero">
        <div className="sx-wrap sx-hero-grid">
          <div className="sx-hero-copy">
            <div className="sx-eyebrow">{t("kicker")}</div>
            <h1 className="sx-h1 sx-h1-wide">{t("h1_1")}<br /><span className="sx-h1-2">{t("h1_2")}</span></h1>
            <p className="sx-lead sx-lead-wide">{t("lead")}</p>
            <div className="sx-btns">
              <Link href="/contact" className="sx-btn sx-btn-primary">{t("cta_start")} <ArrowRight /></Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="sx-stats">
        <div className="sx-wrap">
          {stats.map((v, i) => (
            <div className="sx-stat" key={i}><b>{v}</b><span>{t(`stat${i + 1}`)}</span></div>
          ))}
        </div>
      </section>

      {/* Services grid */}
      <section id="services">
        <div className="sx-wrap sx-section">
          <div className="sx-head">
            <div>
              <div className="sx-eyebrow">{t("svc_eyebrow")}</div>
              <h2 className="sx-h2">{t("svc_title")}</h2>
            </div>
            <p className="sx-head-p">{t("svc_lead")}</p>
          </div>
          <div className="sx-cells">
            {services.map((s, i) => (
              <div className="sx-cell" key={s.id} id={s.id}>
                <div className="sx-cell-code">{String(i + 1).padStart(2, "0")} — {s.label}</div>
                <h3 className="sx-cell-title">{t(`${s.id}.title`)}</h3>
                <p className="sx-cell-desc">{t(`${s.id}.desc`)}</p>
                <ul className="sx-scope">
                  {[1, 2, 3].map((b) => <li key={b}><span className="sx-sq" />{t(`${s.id}.b${b}`)}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="sx-process">
        <div className="sx-wrap sx-section">
          <div className="sx-eyebrow">{t("proc_eyebrow")}</div>
          <h2 className="sx-h2">{t("proc_title")}</h2>
          <p className="sx-process-lead">{t("proc_lead")}</p>
          <div className="sx-steps">
            {phases.map((step, i) => (
              <div className="sx-step" key={step}>
                <div className="sx-step-code">{t("phase")} {step}</div>
                <div className="sx-step-title">{t(`p${i + 1}.title`)}</div>
                <p>{t(`p${i + 1}.desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="sx-cta">
        <div className="sx-wrap">
          <div className="sx-cta-copy">
            <h2>{t("cta_title")}</h2>
            <p>{t("cta_desc")}</p>
          </div>
          <Link href="/contact" className="sx-btn sx-btn-primary sx-btn-lg">{t("cta_btn")} <ArrowRight /></Link>
        </div>
      </section>
    </div>
  )
}

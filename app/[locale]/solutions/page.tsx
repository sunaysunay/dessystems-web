import type { Metadata } from "next"
import { Link } from "@/src/i18n/routing"
import { getTranslations } from "next-intl/server"
import { ArrowRight, Check, Settings, Factory, Bot, Webhook } from "lucide-react"
import { dxCss } from "@/components/dx-styles"

export const metadata: Metadata = {
  title: "Solutions — DES Systems",
  description: "Enterprise ERP consulting, MES integration, automation and custom platform solutions.",
}

const solutions = [
  { id: "erp",         Icon: Settings, modules: ["SAP MM", "SAP PP", "SAP QM", "SAP WM/EWM", "SAP PM", "SAP SD", "SAP TM"] },
  { id: "mes",         Icon: Factory,  modules: ["SAP ME", "SAP MII", "Siemens Opcenter", "IDoc", "BAPI", "REST APIs"] },
  { id: "automation",  Icon: Bot,      modules: ["SAP BTP", "Integration Suite", "Python", "Power Automate", "APIs", "Webhooks"] },
  { id: "integration", Icon: Webhook,  modules: ["SAP PI/PO", "Integration Suite", "EDI", "REST", "SOAP", "BTP"] },
]

export default async function SolutionsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "SolutionsPage" })

  return (
    <div className="dx" style={{ paddingTop: 72 }}>
      <style dangerouslySetInnerHTML={{ __html: dxCss }} />

      <section className="section">
        <div className="wrap">
          <div className="center" style={{ marginBottom: 46 }}>
            <span className="eyebrow">{t("eyebrow")}</span>
            <h2 style={{ marginTop: 10 }}>{t("title1")} {t("title2")}</h2>
            <p className="lead">{t("subtitle")}</p>
          </div>

          <div style={{ display: "grid", gap: 24 }}>
            {solutions.map((s) => (
              <div className="split" key={s.id} id={s.id}>
                <div>
                  <div className="ic"><s.Icon /></div>
                  <span className="eyebrow">{t(`${s.id}.subtitle`)}</span>
                  <h3 style={{ fontSize: 22, margin: "6px 0 12px" }}>{t(`${s.id}.title`)}</h3>
                  <p className="lead" style={{ fontSize: 15 }}>{t(`${s.id}.desc`)}</p>
                  <ul className="checks">
                    {Array.from({ length: 6 }, (_, bi) => (
                      <li key={bi}><Check />{t(`${s.id}.b${bi + 1}`)}</li>
                    ))}
                  </ul>
                  <Link href={`/contact?topic=${s.id}`} className="btn btn-primary">
                    {t("discuss")} <ArrowRight />
                  </Link>
                </div>
                <div className="panelcard">
                  <h3>{t("tech_label")}</h3>
                  <div className="modules" style={{ marginTop: 16 }}>
                    {s.modules.map((m) => <span className="chip" key={m}>{m}</span>)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section soft">
        <div className="wrap">
          <div className="cta">
            <span className="eyebrow" style={{ color: "#fff", opacity: 0.75 }}>{t("bop_eyebrow")}</span>
            <h2 style={{ marginTop: 10 }}>Business Operating Platform</h2>
            <p>{t("bop_desc")}</p>
            <div className="row">
              <Link href="/platform" className="btn btn-primary">{t("bop_cta")} <ArrowRight /></Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

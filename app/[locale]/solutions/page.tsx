import type { Metadata } from "next"
import { Link } from "@/src/i18n/routing"
import { getTranslations } from "next-intl/server"
import { ArrowRight, Check, Settings, Factory, Bot, Webhook, Sparkles, Zap, Globe, Shield, BarChart3, Workflow } from "lucide-react"
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

const platformFeatures = [
  { id: "ai",    Icon: Sparkles },
  { id: "auto",  Icon: Zap },
  { id: "multi", Icon: Globe },
  { id: "sec",   Icon: Shield },
  { id: "anal",  Icon: BarChart3 },
  { id: "flow",  Icon: Workflow },
]

export default async function SolutionsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "SolutionsPage" })

  return (
    <div className="dx" style={{ paddingTop: 72 }}>
      <style dangerouslySetInnerHTML={{ __html: dxCss + platformCss }} />

      {/* ── BOP Platform Hero ── */}
      <section className="plat-hero">
        <div className="wrap">
          <div className="plat-grid">
            <div>
              <span className="plat-badge">{t("plat.badge")}</span>
              <h1 className="plat-h1">{t.rich("plat.title", { em: (c) => <em>{c}</em> })}</h1>
              <p className="plat-lead">{t("plat.lead")}</p>
              <p className="plat-sub">{t("plat.sub")}</p>
              <div className="plat-btns">
                <Link href="/platform" className="btn btn-primary">{t("plat.cta_explore")} <ArrowRight /></Link>
                <Link href="/contact?topic=platform" className="btn btn-ghost">{t("plat.cta_demo")}</Link>
              </div>
            </div>
            <div className="plat-features">
              {platformFeatures.map((f) => (
                <div key={f.id} className="plat-feat">
                  <div className="plat-ic"><f.Icon /></div>
                  <div>
                    <b>{t(`plat.f_${f.id}`)}</b>
                    <span>{t(`plat.f_${f.id}_d`)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Consulting Solutions ── */}
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

const platformCss = `
.plat-hero{background:linear-gradient(135deg,#0b1f3a 0%,#13294b 40%,#1a3a6a 100%);color:#fff;padding:80px 0 88px;position:relative;overflow:hidden}
.plat-hero::before{content:"";position:absolute;right:-120px;top:-120px;width:500px;height:500px;border-radius:50%;background:radial-gradient(circle,rgba(29,108,240,.18),transparent 70%)}
.plat-hero::after{content:"";position:absolute;left:-80px;bottom:-80px;width:360px;height:360px;border-radius:50%;background:radial-gradient(circle,rgba(15,157,140,.12),transparent 70%)}
.plat-grid{display:grid;grid-template-columns:1fr 1fr;gap:56px;align-items:center;position:relative;z-index:1}
.plat-badge{display:inline-block;background:linear-gradient(135deg,rgba(29,108,240,.2),rgba(15,157,140,.2));border:1px solid rgba(255,255,255,.15);border-radius:999px;padding:6px 16px;font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.9);margin-bottom:20px}
.plat-h1{font-size:clamp(32px,4.2vw,52px);line-height:1.08;font-weight:800;letter-spacing:-.03em;margin:0 0 20px}
.plat-h1 em{font-style:normal;background:linear-gradient(135deg,#4d9fff,#0fd99e);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.plat-lead{font-size:18px;line-height:1.6;color:rgba(255,255,255,.82);max-width:520px;margin:0 0 14px}
.plat-sub{font-size:14px;line-height:1.6;color:rgba(255,255,255,.55);max-width:480px;margin:0 0 28px}
.plat-btns{display:flex;gap:12px;flex-wrap:wrap}
.plat-btns .btn-primary{background:linear-gradient(135deg,#1d6cf0,#0f9d8c);border:none;box-shadow:0 8px 24px rgba(29,108,240,.35)}
.plat-btns .btn-primary:hover{transform:translateY(-2px);box-shadow:0 12px 32px rgba(29,108,240,.45)}
.plat-btns .btn-ghost{color:#fff;border-color:rgba(255,255,255,.25)}
.plat-btns .btn-ghost:hover{border-color:rgba(255,255,255,.5);background:rgba(255,255,255,.06)}
.plat-features{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.plat-feat{display:flex;gap:14px;align-items:flex-start;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:18px 16px;transition:.2s}
.plat-feat:hover{background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.15);transform:translateY(-2px)}
.plat-ic{width:40px;height:40px;border-radius:10px;display:grid;place-items:center;flex:none;background:linear-gradient(135deg,rgba(29,108,240,.2),rgba(15,157,140,.15))}
.plat-ic svg{width:20px;height:20px;color:#4d9fff}
.plat-feat b{display:block;font-size:14px;font-weight:700;color:#fff;margin-bottom:3px}
.plat-feat span{font-size:12.5px;color:rgba(255,255,255,.55);line-height:1.45}
@media(max-width:920px){.plat-grid{grid-template-columns:1fr;gap:40px}.plat-hero{padding:56px 0 64px}}
@media(max-width:600px){.plat-features{grid-template-columns:1fr}.plat-h1{font-size:28px}}
`

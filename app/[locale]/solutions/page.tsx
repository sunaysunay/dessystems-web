import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Link } from "@/src/i18n/routing"
import { getTranslations } from "next-intl/server"
import { ArrowRight } from "lucide-react"
import SolutionsIndex from "./solutions-index"

export const metadata: Metadata = {
  title: "Solutions — DES Systems",
  description: "Enterprise ERP consulting, MES integration, automation and custom platform solutions.",
}

const geist = Geist({ subsets: ["latin", "latin-ext"], weight: ["400", "500", "600", "700"], display: "swap", variable: "--font-geist" })
const geistMono = Geist_Mono({ subsets: ["latin", "latin-ext"], weight: ["400", "500"], display: "swap", variable: "--font-geist-mono" })

const solutions = [
  { id: "erp",         modules: ["SAP MM", "SAP PP", "SAP QM", "SAP WM/EWM", "SAP PM", "SAP SD", "SAP TM"] },
  { id: "mes",         modules: ["SAP ME", "SAP MII", "Siemens Opcenter", "IDoc", "BAPI", "REST APIs"] },
  { id: "automation",  modules: ["SAP BTP", "Integration Suite", "Python", "Power Automate", "APIs", "Webhooks"] },
  { id: "integration", modules: ["SAP PI/PO", "Integration Suite", "EDI", "REST", "SOAP", "BTP"] },
]

const platformFeatures = ["ai", "auto", "multi", "sec", "anal", "flow"]

const code = (i: number) => String(i + 1).padStart(2, "0")

export default async function SolutionsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "SolutionsPage" })

  return (
    <div className={`sx ${geist.variable} ${geistMono.variable}`}>
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
      <section className="sx-solutions">
        <div className="sx-wrap">
          <div className="sx-head">
            <div>
              <div className="sx-eyebrow">{t("eyebrow")}</div>
              <h2 className="sx-h2">{t("title1")} {t("title2")}</h2>
            </div>
            <p className="sx-head-p">{t("subtitle")}</p>
          </div>

          <div className="sx-sol-grid">
            <SolutionsIndex items={solutions.map((s, i) => ({ id: s.id, code: code(i), name: t(`${s.id}.title`) }))} />

            <div className="sx-articles">
              {solutions.map((s, i) => (
                <article className="sx-card" key={s.id} id={s.id}>
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

const sxCss = `
.sx{
  --s-bg:#F5F6F8;--s-surface:#fff;--s-ink:#0B1220;--s-body:#3B4454;--s-muted:#5B6474;--s-faint:#8A93A3;
  --s-line:#E3E6EC;--s-line2:#C9CED8;--s-chip:#F1F3F7;--s-bar:#FAFBFC;--s-accent:#2563EB;--s-accent-h:#1D4ED8;
  --s-row:#F7F8FA;--s-deep:#0B1220;--s-deep-line:#222C3F;
  --s-sans:var(--font-geist),'Geist',system-ui,sans-serif;--s-mono:var(--font-geist-mono),'Geist Mono',ui-monospace,monospace;
  background:var(--s-bg);color:var(--s-ink);font-family:var(--s-sans);-webkit-font-smoothing:antialiased;padding-top:64px
}
html.dark .sx{
  --s-bg:#0B1220;--s-surface:#111A2B;--s-ink:#F1F4F9;--s-body:#B4BCCB;--s-muted:#97A1B3;--s-faint:#6B7485;
  --s-line:#222C3F;--s-line2:#3A4459;--s-chip:#18223A;--s-bar:#0E1626;--s-accent:#4F8BFF;--s-accent-h:#7FA6FF;
  --s-row:#0E1626;--s-deep:#060A14;--s-deep-line:#1A2335
}
.sx *{box-sizing:border-box}
.sx-wrap{max-width:1280px;margin:0 auto;padding:0 32px}
.sx-eyebrow{font-family:var(--s-mono);font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--s-accent);margin-bottom:24px}
.sx-eyebrow-dark{color:#7FA6FF;margin-bottom:20px}
.sx-btns{display:flex;gap:12px;flex-wrap:wrap}
.sx-btn{display:inline-flex;align-items:center;gap:10px;padding:14px 22px;font-size:15px;font-weight:500;line-height:1.2;transition:background .2s,border-color .2s,color .2s}
.sx-btn svg{width:16px;height:16px}
.sx-btn-primary{background:var(--s-accent);color:#fff}
.sx-btn-primary:hover{background:var(--s-accent-h);color:#fff}
.sx-btn-ghost{border:1px solid var(--s-line2);color:var(--s-ink)}
.sx-btn-ghost:hover{border-color:var(--s-ink)}
.sx-btn-white{background:#fff;color:#0B1220;flex:none}
.sx-btn-white:hover{background:#E8EDF7;color:#0B1220}

/* hero */
.sx-hero{border-bottom:1px solid var(--s-line)}
.sx-hero-grid{padding-top:88px;padding-bottom:72px;display:flex;flex-wrap:wrap;gap:64px;align-items:flex-start}
.sx-hero-copy{flex:1 1 440px;min-width:0}
.sx-h1{font-size:clamp(40px,5.2vw,68px);line-height:1.02;letter-spacing:-.035em;font-weight:600;margin:0 0 28px;text-wrap:balance}
.sx-h1 em{font-style:normal;color:var(--s-accent)}
.sx-lead{font-size:19px;line-height:1.55;color:var(--s-body);margin:0 0 16px;max-width:560px;text-wrap:pretty}
.sx-sub{font-size:15px;line-height:1.6;color:var(--s-muted);margin:0 0 40px;max-width:520px;text-wrap:pretty}
.sx-stack{flex:1 1 480px;min-width:0;background:var(--s-surface);border:1px solid var(--s-line);padding:20px;display:flex;flex-direction:column;gap:6px}
.sx-layer{display:grid;grid-template-columns:44px minmax(0,1fr);gap:14px;align-items:start;padding:16px;border:1px solid var(--s-line);background:var(--s-row);transition:background .2s,border-color .2s}
.sx-layer:hover{background:#0B1220;border-color:#0B1220}
.sx-layer-code{font-family:var(--s-mono);font-size:11px;color:var(--s-faint);padding-top:3px}
.sx-layer-name{font-size:15px;font-weight:600;margin-bottom:4px}
.sx-layer-desc{font-size:13.5px;line-height:1.5;color:var(--s-muted)}
.sx-layer:hover .sx-layer-code{color:#8FB0FF}
.sx-layer:hover .sx-layer-name{color:#fff}
.sx-layer:hover .sx-layer-desc{color:#B4BCCB}

/* solutions */
.sx-solutions .sx-wrap{padding-top:112px;padding-bottom:104px}
.sx-head{display:flex;flex-wrap:wrap;gap:32px;justify-content:space-between;align-items:flex-end;margin-bottom:56px}
.sx-h2{font-size:clamp(32px,3.6vw,48px);line-height:1.05;letter-spacing:-.03em;font-weight:600;margin:0;max-width:680px;text-wrap:balance}
.sx-head-p{font-size:16px;line-height:1.6;color:var(--s-muted);margin:0;max-width:400px}
.sx-sol-grid{display:flex;flex-wrap:wrap;gap:40px;align-items:flex-start}
.sx-index{flex:1 1 240px;position:sticky;top:96px;display:flex;flex-direction:column;border-top:1px solid var(--s-ink)}
.sx-index a{display:grid;grid-template-columns:36px minmax(0,1fr) 16px;align-items:center;padding:20px 0;border-bottom:1px solid var(--s-line);color:var(--s-muted)}
.sx-index a:hover{color:var(--s-ink)}
.sx-index .ix-code{font-family:var(--s-mono);font-size:12px;color:var(--s-faint)}
.sx-index .ix-name{font-size:18px;font-weight:500;letter-spacing:-.01em}
.sx-index .ix-dot{width:8px;height:8px;background:transparent}
.sx-index a.on{color:var(--s-ink)}
.sx-index a.on .ix-code{color:var(--s-accent)}
.sx-index a.on .ix-name{font-weight:600}
.sx-index a.on .ix-dot{background:var(--s-accent)}
.sx-articles{flex:3 1 560px;min-width:0;display:flex;flex-direction:column;gap:24px}
.sx-card{background:var(--s-surface);border:1px solid var(--s-line);scroll-margin-top:88px}
.sx-card-top{padding:40px 40px 32px;border-bottom:1px solid var(--s-line)}
.sx-card-meta{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;font-family:var(--s-mono);font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--s-faint);margin-bottom:24px}
.sx-card-code{color:var(--s-accent)}
.sx-h3{font-size:clamp(26px,2.6vw,34px);line-height:1.12;letter-spacing:-.025em;font-weight:600;margin:0 0 16px;text-wrap:balance}
.sx-card-desc{font-size:16px;line-height:1.6;color:var(--s-body);margin:0;max-width:660px;text-wrap:pretty}
.sx-card-body{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr))}
.sx-scope{list-style:none;margin:0;padding:24px 40px 32px;border-right:1px solid var(--s-line)}
.sx-scope li{display:flex;gap:12px;align-items:baseline;padding:9px 0;border-bottom:1px dashed var(--s-line);font-size:15px}
.sx-scope li:last-child{border-bottom:0}
.sx-sq{width:6px;height:6px;background:var(--s-accent);flex:none;transform:translateY(-2px)}
.sx-tech{padding:32px 40px}
.sx-label{font-family:var(--s-mono);font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--s-faint);margin-bottom:16px}
.sx-chips{display:flex;flex-wrap:wrap;gap:6px}
.sx-chip{font-family:var(--s-mono);font-size:12px;padding:6px 10px;background:var(--s-chip);border:1px solid var(--s-line);color:var(--s-ink)}
.sx-card-bar{display:flex;justify-content:flex-end;padding:20px 40px;background:var(--s-bar);border-top:1px solid var(--s-line)}
.sx-link{display:inline-flex;align-items:center;gap:8px;font-size:14px;font-weight:600;color:var(--s-accent)}
.sx-link:hover{color:var(--s-accent-h)}
.sx-link svg{width:15px;height:15px;transition:transform .2s}
.sx-link:hover svg{transform:translateX(3px)}

/* band */
.sx-band{background:var(--s-deep);color:#fff;border-top:1px solid var(--s-deep-line)}
.sx-band-inner{padding-top:104px;padding-bottom:104px;display:flex;flex-wrap:wrap;gap:48px;justify-content:space-between;align-items:flex-end}
.sx-band-copy{max-width:680px}
.sx-band .sx-h2{margin-bottom:20px}
.sx-band p{font-size:17px;line-height:1.6;color:#B4BCCB;margin:0;text-wrap:pretty}

@media(max-width:900px){
  .sx-index{display:none}
  .sx-hero-grid{padding-top:56px;padding-bottom:56px;gap:40px}
  .sx-solutions .sx-wrap{padding-top:72px;padding-bottom:72px}
  .sx-band-inner{padding-top:72px;padding-bottom:72px}
}
@media(max-width:600px){
  .sx-wrap{padding:0 16px}
  .sx-stack{padding:12px}
  .sx-card-top{padding:28px 20px 24px}
  .sx-scope{padding:16px 20px 20px;border-right:0;border-bottom:1px solid var(--s-line)}
  .sx-tech{padding:24px 20px}
  .sx-card-bar{padding:16px 20px}
  .sx-lead{font-size:17px}
}
`

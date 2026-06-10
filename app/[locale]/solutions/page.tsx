import type { Metadata } from "next"
import { Link } from "@/src/i18n/routing"
import { getTranslations } from "next-intl/server"
import { ArrowRight, CheckCircle } from "lucide-react"

export const metadata: Metadata = {
  title: "Solutions — DES Systems",
  description: "Enterprise ERP consulting, MES integration, automation and custom platform solutions.",
}

const solutions = [
  {
    id: "erp",
    icon: "⚙️",
    accent: "#2563eb",
    bulletCount: 6,
    modules: ["SAP MM","SAP PP","SAP QM","SAP WM/EWM","SAP PM","SAP SD","SAP TM"],
  },
  {
    id: "mes",
    icon: "🏭",
    accent: "#10b981",
    bulletCount: 6,
    modules: ["SAP ME","SAP MII","Siemens Opcenter","IDoc","BAPI","REST APIs"],
  },
  {
    id: "automation",
    icon: "🤖",
    accent: "#7c3aed",
    bulletCount: 6,
    modules: ["SAP BTP","Integration Suite","Python","Power Automate","APIs","Webhooks"],
  },
  {
    id: "integration",
    icon: "🔗",
    accent: "#f59e0b",
    bulletCount: 6,
    modules: ["SAP PI/PO","Integration Suite","EDI","REST","SOAP","BTP"],
  },
]

export default async function SolutionsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "SolutionsPage" })

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", paddingTop: "80px" }}>
      <div className="max-w-7xl mx-auto px-[4%] py-16">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="text-[11px] tracking-[0.12em] uppercase font-medium mb-3" style={{ color: "var(--accent2)" }}>{t("eyebrow")}</div>
          <h1 className="text-4xl font-bold mb-4" style={{ fontFamily: "'Syne',sans-serif" }}>
            {t("title1")}<br />{t("title2")}
          </h1>
          <p className="text-[15px] leading-relaxed" style={{ color: "var(--text2)" }}>
            {t("subtitle")}
          </p>
        </div>

        {/* Solutions */}
        <div className="space-y-8">
          {solutions.map((s) => (
            <div key={s.id} id={s.id}
              className="rounded-2xl overflow-hidden grid lg:grid-cols-[1fr_400px] gap-0"
              style={{ background: "var(--bg2)", border: "1px solid var(--border2)" }}>
              <div className="p-8 lg:p-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-3xl">{s.icon}</div>
                  <div>
                    <h2 className="text-2xl font-bold" style={{ fontFamily: "'Syne',sans-serif" }}>{t(`${s.id}.title`)}</h2>
                    <div className="text-[12px] mt-0.5" style={{ color: "var(--text3)" }}>{t(`${s.id}.subtitle`)}</div>
                  </div>
                </div>
                <p className="text-[14px] leading-relaxed mb-6" style={{ color: "var(--text2)" }}>{t(`${s.id}.desc`)}</p>
                <ul className="grid grid-cols-2 gap-2 mb-6">
                  {Array.from({ length: s.bulletCount }, (_, bi) => (
                    <li key={bi} className="flex items-center gap-2 text-[13px]" style={{ color: "var(--text2)" }}>
                      <CheckCircle className="w-4 h-4 shrink-0" style={{ color: "var(--green)" }} /> {t(`${s.id}.b${bi + 1}`)}
                    </li>
                  ))}
                </ul>
                <Link href={`/contact?topic=${s.id}`}
                  className="inline-flex items-center gap-2 text-[13px] font-semibold px-5 py-2.5 rounded-lg text-white"
                  style={{ background: s.accent }}>
                  {t("discuss")} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="p-8 flex flex-col justify-center" style={{ background: "var(--bg3)", borderLeft: "1px solid var(--border)" }}>
                <div className="text-[11px] uppercase tracking-wider font-semibold mb-4" style={{ color: "var(--text3)" }}>{t("tech_label")}</div>
                <div className="flex flex-wrap gap-2">
                  {s.modules.map(m => (
                    <span key={m} className="text-[12px] font-medium px-3 py-1 rounded"
                      style={{ background: `${s.accent}15`, border: `1px solid ${s.accent}30`, color: s.accent }}>
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Also: BOP platform */}
        <div className="mt-8 rounded-2xl p-10 text-center"
          style={{ background: "linear-gradient(135deg,#080c14,#0d1e3a)", border: "1px solid var(--border2)" }}>
          <div className="text-[11px] tracking-[0.12em] uppercase font-medium mb-3" style={{ color: "var(--accent2)" }}>{t("bop_eyebrow")}</div>
          <h2 className="text-2xl font-bold mb-3 text-white" style={{ fontFamily: "'Syne',sans-serif" }}>Business Operating Platform</h2>
          <p className="text-[14px] mb-6 max-w-xl mx-auto" style={{ color: "rgba(255,255,255,0.6)" }}>
            {t("bop_desc")}
          </p>
          <Link href="/platform"
            className="inline-flex items-center gap-2 text-[14px] font-semibold px-6 py-3 rounded-lg text-white"
            style={{ background: "var(--accent)" }}>
            {t("bop_cta")} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}

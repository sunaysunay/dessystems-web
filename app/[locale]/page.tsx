import HeroPanels from "@/components/hero-panels"
import { Link } from "@/src/i18n/routing"
import { ArrowRight, CheckCircle } from "lucide-react"
import { useTranslations } from "next-intl"

// ── Inline mini-dashboard ─────────────────────────────────────────────────────
function DashMockup() {
  return (
    <div className="rounded-xl overflow-hidden shadow-2xl" style={{ background: "var(--bg3)", border: "1px solid var(--border2)" }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ background: "var(--bg4)", borderBottom: "1px solid var(--border)" }}>
        <div>
          <div className="text-[13px] font-bold" style={{ fontFamily: "'Syne',sans-serif" }}>DES <span style={{ color: "var(--accent2)" }}>PLATFORM</span></div>
          <div className="text-[11px] mt-0.5" style={{ color: "var(--text3)" }}>Dashboard · This Month</div>
        </div>
        <div className="flex gap-1.5">
          {["#ff5f57","#3b82f6","#10b981"].map(c => <span key={c} className="w-2 h-2 rounded-full" style={{ background: c, opacity: 0.7 }} />)}
        </div>
      </div>
      <div className="grid grid-cols-4" style={{ gap: "1px", background: "var(--border)" }}>
        {[["Total Leads","1,250","↑ 18.5%"],["Active Clients","320","↑ 12.2%"],["Open Projects","98","↑ 15.7%"],["Revenue YTD","€2.4M","↑ 21.9%"]].map(([l,v,d]) => (
          <div key={l} className="px-3 py-3" style={{ background: "var(--bg3)" }}>
            <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: "var(--text3)" }}>{l}</div>
            <div className="text-[18px] font-bold" style={{ fontFamily: "'Syne',sans-serif" }}>{v}</div>
            <div className="text-[10px] mt-0.5" style={{ color: "var(--green)" }}>{d}</div>
          </div>
        ))}
      </div>
      <div className="px-4 py-3">
        <div className="text-[10px] mb-2" style={{ color: "var(--text3)" }}>Leads over time</div>
        <div className="flex items-end gap-1 h-12">
          {[35,45,40,60,55,75,100].map((h,i) => (
            <div key={i} className="flex-1 rounded-t-sm" style={{ height: `${h}%`, background: "var(--accent)", opacity: i === 6 ? 1 : 0.25 + i*0.07 }} />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 px-4 pb-4">
        {[["⚙","Automation"],["📊","Analytics"],["🔗","Integrations"]].map(([ico,name]) => (
          <div key={name} className="rounded-lg px-3 py-2.5 text-[11px]" style={{ background: "var(--bg4)", border: "1px solid var(--border)" }}>
            <div className="text-base mb-1" style={{ color: "var(--accent2)" }}>{ico}</div>
            <div style={{ color: "var(--text2)" }}>{name}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

const SAP_MODS = ["SAP MM","SAP PP","SAP QM","SAP WM/EWM","SAP PM","SAP SD","SAP TM"]
const TECH_CAPS = [
  { id:"tc1", ico:"🏭" }, { id:"tc2", ico:"🔌" }, { id:"tc3", ico:"🔄" },
  { id:"tc4", ico:"📄" }, { id:"tc5", ico:"🌐" }, { id:"tc6", ico:"🛠️" },
]
const INDUSTRIES = [
  { id:"in1", ico:"🚗" }, { id:"in2", ico:"🏭" }, { id:"in3", ico:"📦" },
  { id:"in4", ico:"🛒" }, { id:"in5", ico:"⚙️" }, { id:"in6", ico:"➕" },
]
const INSIGHTS = [
  { id:"ia1", tag:"ERP",         ico:"📊", date:"May 10, 2024", color:"var(--accent)" },
  { id:"ia2", tag:"Automation",  ico:"🤖", date:"May 6, 2024",  color:"#10b981" },
  { id:"ia3", tag:"Integration", ico:"🔗", date:"May 2, 2024",  color:"#7c3aed" },
]
const PLATFORM_FEATURES = [
  { id:"pf1", ico:"👥" }, { id:"pf2", ico:"🌐" }, { id:"pf3", ico:"⚡" },
  { id:"pf4", ico:"📈" }, { id:"pf5", ico:"🏢" }, { id:"pf6", ico:"🔒" },
]
const EXPERTISE = [
  { id:"ex1", ico:"🏭" }, { id:"ex2", ico:"⚙️" }, { id:"ex3", ico:"🤖" }, { id:"ex4", ico:"🔗" },
]
const FL_STATS = [
  { id:"fs1", val:"10+" }, { id:"fs2", val:"50+" }, { id:"fs3", val:"Global" }, { id:"fs4", val:"Flex" },
]

export default function HomePage() {
  const t = useTranslations("Home")

  return (
    <>
      {/* ── Hero ── */}
      <HeroPanels />

      {/* ── Platform section ── */}
      <section className="py-20 px-[4%]" style={{ background: "var(--bg2)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="text-[11px] tracking-[0.12em] uppercase font-medium mb-3" style={{ color: "var(--accent2)" }}>{t("platform_eyebrow")}</div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 leading-tight" style={{ fontFamily: "'Syne',sans-serif" }}>
              Business Operating Platform
            </h2>
            <p className="text-[15px] leading-relaxed mb-8" style={{ color: "var(--text2)" }}>
              {t("platform_desc")}
            </p>
            <div className="grid grid-cols-2 gap-3 mb-8">
              {PLATFORM_FEATURES.map(f => (
                <div key={f.id} className="rounded-lg p-4 transition-colors"
                  style={{ background: "var(--bg3)", border: "1px solid var(--border)" }}>
                  <div className="text-lg mb-2" style={{ color: "var(--accent2)" }}>{f.ico}</div>
                  <div className="text-[13px] font-medium mb-1">{t(`${f.id}_name`)}</div>
                  <div className="text-[12px] leading-relaxed" style={{ color: "var(--text3)" }}>{t(`${f.id}_desc`)}</div>
                </div>
              ))}
            </div>
            <Link href="/platform"
              className="inline-flex items-center gap-2 text-[14px] font-medium px-5 py-2.5 rounded-lg transition-all"
              style={{ border: "1px solid var(--border2)", color: "var(--text)" }}>
              {t("platform_cta")} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div><DashMockup /></div>
        </div>
      </section>

      {/* ── Core expertise ── */}
      <section className="py-20 px-[4%]" style={{ background: "var(--bg3)" }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-12">
            <div className="text-[11px] tracking-[0.12em] uppercase font-medium mb-3" style={{ color: "var(--accent2)" }}>{t("expertise_eyebrow")}</div>
            <h2 className="text-3xl font-bold" style={{ fontFamily: "'Syne',sans-serif" }}>{t("expertise_title")}</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 rounded-xl overflow-hidden" style={{ gap: "1px", background: "var(--border)", border: "1px solid var(--border)" }}>
            {EXPERTISE.map(c => (
              <div key={c.id} className="p-7 transition-colors" style={{ background: "var(--bg3)" }}>
                <div className="text-2xl mb-4" style={{ color: "var(--accent2)" }}>{c.ico}</div>
                <div className="text-[16px] font-semibold mb-2" style={{ fontFamily: "'Syne',sans-serif" }}>{t(`${c.id}_name`)}</div>
                <div className="text-[13px] leading-relaxed" style={{ color: "var(--text3)" }}>{t(`${c.id}_desc`)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ERP Consulting ── */}
      <section className="py-20 px-[4%]" style={{ background: "var(--bg2)" }}>
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-start">
          <div>
            <div className="text-[11px] tracking-[0.12em] uppercase font-medium mb-3" style={{ color: "var(--accent2)" }}>{t("erp_eyebrow")}</div>
            <h2 className="text-3xl font-bold mb-4 leading-tight" style={{ fontFamily: "'Syne',sans-serif" }}>
              {t("erp_title")}
            </h2>
            <p className="text-[15px] leading-relaxed mb-6" style={{ color: "var(--text2)" }}>
              {t("erp_desc")}
            </p>
            <ul className="grid grid-cols-2 gap-3 mb-8">
              {[1,2,3,4,5,6].map(i => (
                <li key={i} className="flex items-center gap-2 text-[13px]" style={{ color: "var(--text2)" }}>
                  <CheckCircle className="w-4 h-4 shrink-0" style={{ color: "var(--green)" }} /> {t(`erp_b${i}`)}
                </li>
              ))}
            </ul>
            <Link href="/services#erp"
              className="inline-flex items-center gap-2 text-[14px] font-medium px-5 py-2.5 rounded-lg text-white transition-colors"
              style={{ background: "var(--accent)" }}>
              {t("erp_cta")} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="rounded-xl p-7" style={{ background: "var(--bg3)", border: "1px solid var(--border2)" }}>
            <h3 className="text-xl font-bold mb-2" style={{ fontFamily: "'Syne',sans-serif" }}>{t("sap_box_title")}</h3>
            <p className="text-[13px] mb-5 leading-relaxed" style={{ color: "var(--text2)" }}>
              {t("sap_box_desc")}
            </p>
            <div className="flex flex-wrap gap-2 mb-5">
              {SAP_MODS.map(m => (
                <span key={m} className="text-[12px] font-medium px-3 py-1 rounded"
                  style={{ background: "rgba(37,99,235,0.12)", border: "1px solid rgba(37,99,235,0.25)", color: "var(--accent2)" }}>
                  {m}
                </span>
              ))}
            </div>
            <p className="text-[12px] pt-4 leading-relaxed" style={{ color: "var(--text3)", borderTop: "1px solid var(--border)" }}>
              {t("sap_box_foot")}
            </p>
          </div>
        </div>
      </section>

      {/* ── Technical capabilities ── */}
      <section className="py-20 px-[4%]" style={{ background: "var(--bg)" }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-12">
            <div className="text-[11px] tracking-[0.12em] uppercase font-medium mb-3" style={{ color: "var(--accent2)" }}>{t("tech_eyebrow")}</div>
            <h2 className="text-3xl font-bold" style={{ fontFamily: "'Syne',sans-serif" }}>{t("tech_title")}</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TECH_CAPS.map(c => (
              <div key={c.id} className="rounded-xl p-6 text-center transition-all"
                style={{ background: "var(--bg3)", border: "1px solid var(--border)" }}>
                <div className="text-2xl mb-3" style={{ color: "var(--accent2)" }}>{c.ico}</div>
                <div className="text-[14px] font-medium mb-2">{t(`${c.id}_name`)}</div>
                <div className="text-[12px] leading-relaxed" style={{ color: "var(--text3)" }}>{t(`${c.id}_desc`)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Freelance ── */}
      <section className="py-20 px-[4%] relative overflow-hidden" style={{ background: "linear-gradient(135deg,#0a1628 0%,#0d1e3a 50%,#0a1628 100%)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 70% 50%, rgba(37,99,235,0.08) 0%, transparent 60%)" }} />
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center relative">
          <div>
            <div className="text-[11px] tracking-[0.12em] uppercase font-medium mb-3" style={{ color: "var(--accent2)" }}>{t("fl_eyebrow")}</div>
            <h2 className="text-3xl font-bold mb-4 leading-tight" style={{ fontFamily: "'Syne',sans-serif" }}>
              {t("fl_title")}
            </h2>
            <p className="text-[15px] leading-relaxed mb-6" style={{ color: "var(--text2)" }}>
              {t("fl_desc")}
            </p>
            <ul className="flex flex-col gap-3 mb-8">
              {[1,2,3].map(i => (
                <li key={i} className="flex items-center gap-3 text-[14px]" style={{ color: "var(--text2)" }}>
                  <CheckCircle className="w-4 h-4 shrink-0" style={{ color: "var(--green)" }} /> {t(`fl_b${i}`)}
                </li>
              ))}
            </ul>
            <Link href="/contact"
              className="inline-flex items-center gap-2 text-[14px] font-medium px-5 py-2.5 rounded-lg text-white"
              style={{ background: "var(--accent)" }}>
              {t("fl_cta")} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-6">
            {FL_STATS.map(s => (
              <div key={s.id}>
                <div className="text-[32px] font-bold" style={{ fontFamily: "'Syne',sans-serif" }}>{s.val}</div>
                <div className="text-[11px] uppercase tracking-wider mt-1" style={{ color: "var(--text3)" }}>{t(`${s.id}_label`)}</div>
                <div className="text-[12px] mt-0.5" style={{ color: "var(--text2)" }}>{t(`${s.id}_sub`)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Industries ── */}
      <section className="py-20 px-[4%]" style={{ background: "var(--bg2)" }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-12">
            <div className="text-[11px] tracking-[0.12em] uppercase font-medium mb-3" style={{ color: "var(--accent2)" }}>{t("ind_eyebrow")}</div>
            <h2 className="text-3xl font-bold" style={{ fontFamily: "'Syne',sans-serif" }}>{t("ind_title")}</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {INDUSTRIES.map(i => (
              <div key={i.id} className="rounded-xl p-6 transition-all"
                style={{ background: "var(--bg3)", border: "1px solid var(--border)" }}>
                <div className="text-2xl mb-3" style={{ color: "var(--accent2)" }}>{i.ico}</div>
                <div className="text-[13px] font-medium mb-2">{t(`${i.id}_name`)}</div>
                <div className="text-[12px] leading-relaxed" style={{ color: "var(--text3)" }}>{t(`${i.id}_desc`)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Insights ── */}
      <section className="py-20 px-[4%]" style={{ background: "var(--bg)" }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-10">
            <div>
              <div className="text-[11px] tracking-[0.12em] uppercase font-medium mb-2" style={{ color: "var(--accent2)" }}>{t("ins_eyebrow")}</div>
              <h2 className="text-3xl font-bold" style={{ fontFamily: "'Syne',sans-serif" }}>{t("ins_title")}</h2>
            </div>
            <Link href="/insights" className="text-[13px] flex items-center gap-1.5" style={{ color: "var(--accent2)" }}>
              {t("ins_viewall")} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {INSIGHTS.map(n => (
              <div key={n.id} className="rounded-xl overflow-hidden transition-all cursor-pointer group"
                style={{ background: "var(--bg3)", border: "1px solid var(--border)" }}>
                <div className="relative h-36 flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg,#0d1e3a,#162035)" }}>
                  <span className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-wider text-white px-2 py-0.5 rounded"
                    style={{ background: n.color }}>{n.tag}</span>
                  <span className="text-4xl">{n.ico}</span>
                </div>
                <div className="p-5">
                  <div className="text-[11px] mb-2" style={{ color: "var(--text3)" }}>{n.date}</div>
                  <div className="text-[14px] font-medium mb-2 leading-snug group-hover:text-blue-400 transition-colors">{t(`${n.id}_title`)}</div>
                  <div className="text-[12px] leading-relaxed" style={{ color: "var(--text3)" }}>{t(`${n.id}_desc`)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-16 px-[4%]" style={{ background: "var(--bg2)", borderTop: "1px solid var(--border)" }}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "'Syne',sans-serif" }}>{t("cta_title")}</h2>
            <p className="text-[14px]" style={{ color: "var(--text2)" }}>{t("cta_sub")}</p>
          </div>
          <div className="flex gap-3 shrink-0">
            <Link href="/contact"
              className="flex items-center gap-2 text-[14px] font-medium px-6 py-3 rounded-lg text-white"
              style={{ background: "var(--accent)" }}>
              {t("cta_btn1")} <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/solutions"
              className="flex items-center gap-2 text-[14px] font-medium px-6 py-3 rounded-lg transition-colors"
              style={{ border: "1px solid var(--border2)", color: "var(--text)" }}>
              {t("cta_btn2")}
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}

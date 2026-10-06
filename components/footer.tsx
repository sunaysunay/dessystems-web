import { Link } from "@/src/i18n/routing"
import { ThemeToggle } from "@/components/theme-toggle"
import { useTranslations } from "next-intl"

export default function Footer() {
  const t = useTranslations("Footer")

  const cols = [
    {
      title: t("col_solutions"),
      links: [
        { label: t("l_bop"), href: "/platform" },
        { label: t("l_enterprise"), href: "/solutions#enterprise" },
        { label: t("l_erp"), href: "/solutions#erp" },
        { label: t("l_automation"), href: "/solutions#automation" },
        { label: t("l_integration"), href: "/solutions#integration" },
      ],
    },
    {
      title: t("col_services"),
      links: [
        { label: t("l_erp_consulting"), href: "/services#erp" },
        { label: t("l_sap"), href: "/services#sap" },
        { label: t("l_mes"), href: "/services#mes" },
        { label: t("l_apis"), href: "/services#api" },
        { label: t("l_custom"), href: "/services#custom" },
      ],
    },
    {
      title: t("col_company"),
      links: [
        { label: t("l_about"), href: "/about" },
        { label: t("l_careers"), href: "/careers" },
        { label: t("l_freelance"), href: "/freelance" },
        { label: t("l_insights"), href: "/insights" },
        { label: t("l_contact"), href: "/contact" },
      ],
    },
    {
      title: t("col_legal"),
      links: [
        { label: t("l_privacy"), href: "/privacy" },
        { label: t("l_terms"), href: "/terms" },
        { label: t("l_cookies"), href: "/cookies" },
      ],
    },
  ]

  return (
    <footer style={{ background: "var(--bg2)", borderTop: "1px solid var(--border)" }}>
      <div className="max-w-7xl mx-auto px-[4%] pt-14 pb-8">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-10 mb-12">
          {/* Brand */}
          <div className="col-span-2">
            <div className="flex items-baseline mb-0.5" style={{ fontFamily: "var(--font-archivo), Archivo, sans-serif", fontStyle: "italic", fontWeight: 900, fontStretch: "112%", letterSpacing: "-0.03em", fontSize: "22px", lineHeight: 1 }}>
              <span style={{ color: "#2563EB" }}>DES</span>
              <span className="relative inline-block" style={{ color: "var(--text1, #0B1A2E)" }}>S<span className="absolute" style={{ left: "8%", right: "8%", top: "46%", height: "4px", background: "var(--bg2, #F4F2EE)", transform: "skewX(-18deg)" }} /></span>
              <span style={{ color: "var(--text1, #0B1A2E)" }}>YSTEMS</span>
            </div>
            <div className="text-[10px] tracking-[0.12em] uppercase mb-4" style={{ fontFamily: "var(--font-archivo), Archivo, sans-serif", fontWeight: 500, fontStyle: "normal", color: "var(--text3, #9AA6B6)" }}>Business Operating Platform</div>
            <p className="text-[13px] leading-relaxed mb-5 max-w-xs" style={{ color: "var(--text3)" }}>
              {t("tagline")}
            </p>
            <div className="flex gap-2.5">
              {[["in","LinkedIn","https://www.linkedin.com/company/dessystems"]].map(([l,title,href]) => (
                <a key={l} href={href} title={title}
                  {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="w-8 h-8 rounded-md flex items-center justify-center text-[13px] transition-colors"
                  style={{ border: "1px solid var(--border2)", color: "var(--text3)" }}>
                  {l}
                </a>
              ))}
            </div>
          </div>

          {cols.map(col => (
            <div key={col.title}>
              <h4 className="text-[11px] font-semibold uppercase tracking-widest mb-4" style={{ color: "var(--text3)" }}>{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map(l => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-[13px] transition-colors" style={{ color: "var(--text3)" }}>
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Contact col */}
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-widest mb-4" style={{ color: "var(--text3)" }}>{t("col_contact")}</h4>
            <div className="space-y-2 mb-4">
              {[
                ["✉","info@dessystems.io"],
                ["📍","Europe / Worldwide"],
              ].map(([ico,val]) => (
                <p key={val} className="text-[13px] flex items-center gap-2" style={{ color: "var(--text3)" }}>
                  <span>{ico}</span> {val}
                </p>
              ))}
            </div>
            <Link href="/contact"
              className="block w-full text-center text-[13px] font-medium py-2.5 rounded-lg text-white transition-colors"
              style={{ background: "var(--accent)" }}>
              {t("get_in_touch")}
            </Link>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-3 pt-6"
          style={{ borderTop: "1px solid var(--border)" }}>
          <span className="text-[12px]" style={{ color: "var(--text3)" }}>© 2026 DES Systems. {t("rights")}</span>
          <div className="flex gap-5">
            <Link href="/privacy" className="text-[12px] transition-colors" style={{ color: "var(--text3)" }}>{t("l_privacy")}</Link>
            <Link href="/terms" className="text-[12px] transition-colors" style={{ color: "var(--text3)" }}>{t("l_terms")}</Link>
            <Link href="/cookies" className="text-[12px] transition-colors" style={{ color: "var(--text3)" }}>{t("l_cookies")}</Link>
            {/* /portal lives outside the [locale] tree — plain <a>, not the i18n Link */}
            <a href="/portal/login" className="text-[12px] transition-colors" style={{ color: "var(--text3)" }}>{t("l_portal")}</a>
          </div>
          <ThemeToggle />
          <div className="text-[12px] flex items-center gap-1.5" style={{ color: "var(--text3)" }}>
            {t.rich("made_with", { heart: () => <span style={{ color: "#e45" }}>♥</span> })}
          </div>
        </div>

        <div className="mt-4 pt-4 text-center text-[11px]" style={{ borderTop: "1px solid var(--border)", color: "var(--text3)" }}>
          {t("powered_by")} <span style={{ color: "var(--accent2)" }}>DES Business Operating Platform</span>
        </div>
      </div>
    </footer>
  )
}

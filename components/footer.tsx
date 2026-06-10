import { Link } from "@/src/i18n/routing"

const cols = [
  {
    title: "Solutions",
    links: [
      { label: "Business Operating Platform", href: "/platform" },
      { label: "Enterprise Systems", href: "/solutions#enterprise" },
      { label: "ERP", href: "/solutions#erp" },
      { label: "Automation", href: "/solutions#automation" },
      { label: "Integration", href: "/solutions#integration" },
    ],
  },
  {
    title: "Services",
    links: [
      { label: "ERP Consulting",       href: "/services#erp" },
      { label: "SAP Logistics",        href: "/services#sap" },
      { label: "MES Integrations",     href: "/services#mes" },
      { label: "APIs & EDI",           href: "/services#api" },
      { label: "Custom Platforms",     href: "/services#custom" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Us",              href: "/about" },
      { label: "Careers",               href: "/careers" },
      { label: "Freelance",             href: "/freelance" },
      { label: "News & Insights",       href: "/insights" },
      { label: "Contact",               href: "/contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy",    href: "/privacy" },
      { label: "Terms of Service",  href: "/terms" },
      { label: "Cookie Policy",     href: "/cookies" },
    ],
  },
]

export default function Footer() {
  return (
    <footer style={{ background: "var(--bg2)", borderTop: "1px solid var(--border)" }}>
      <div className="max-w-7xl mx-auto px-[4%] pt-14 pb-8">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-10 mb-12">
          {/* Brand */}
          <div className="col-span-2">
            <div className="font-bold text-[18px] tracking-wide mb-0.5" style={{ fontFamily: "'Syne',sans-serif" }}>
              DES <span style={{ color: "var(--accent2)" }}>SYSTEMS</span>
            </div>
            <div className="text-[10px] tracking-[0.1em] uppercase mb-4" style={{ color: "var(--text3)" }}>Enterprise Solutions</div>
            <p className="text-[13px] leading-relaxed mb-5 max-w-xs" style={{ color: "var(--text3)" }}>
              DES Systems delivers enterprise solutions, ERP consulting, MES integrations and automation to drive real business impact.
            </p>
            <div className="flex gap-2.5">
              {[["in","LinkedIn"],["𝕏","X"],["gh","GitHub"],["yt","YouTube"]].map(([l,title]) => (
                <a key={l} href="#" title={title}
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
            <h4 className="text-[11px] font-semibold uppercase tracking-widest mb-4" style={{ color: "var(--text3)" }}>Contact Us</h4>
            <div className="space-y-2 mb-4">
              {[
                ["✉","info@dessystems.io"],
                ["📞","+31 6 82545600"],
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
              Get in Touch
            </Link>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-3 pt-6"
          style={{ borderTop: "1px solid var(--border)" }}>
          <span className="text-[12px]" style={{ color: "var(--text3)" }}>© 2026 DES Systems. All rights reserved.</span>
          <div className="flex gap-5">
            {["Privacy Policy","Terms of Service","Cookie Policy"].map(l => (
              <a key={l} href="#" className="text-[12px] transition-colors" style={{ color: "var(--text3)" }}>{l}</a>
            ))}
          </div>
          <div className="text-[12px] flex items-center gap-1.5" style={{ color: "var(--text3)" }}>
            Made with <span style={{ color: "#e45" }}>♥</span> in Europe
          </div>
        </div>

        <div className="mt-4 pt-4 text-center text-[11px]" style={{ borderTop: "1px solid var(--border)", color: "var(--text3)" }}>
          Powered by <span style={{ color: "var(--accent2)" }}>DES Business Operating Platform</span>
        </div>
      </div>
    </footer>
  )
}

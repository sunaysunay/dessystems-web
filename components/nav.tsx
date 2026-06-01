"use client"
import Link from "next/link"
import { useState, useEffect } from "react"
import { Menu, X, ChevronDown } from "lucide-react"
import { useTranslations, useLocale } from "next-intl"
import { useRouter, usePathname } from "next/navigation"

const LOCALES = [
  { code: "en", label: "EN" },
  { code: "nl", label: "NL" },
  { code: "de", label: "DE" },
  { code: "fr", label: "FR" },
  { code: "tr", label: "TR" },
]

function LangSwitcher() {
  const locale   = useLocale()
  const router   = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  function switchTo(code: string) {
    setOpen(false)
    const segs = pathname.split("/")
    segs[1] = code
    router.push(segs.join("/") || "/")
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 text-[12px] font-semibold px-2 py-1 rounded-md transition-colors"
        style={{ color: "var(--text2)" }}>
        {locale.toUpperCase()} <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 rounded-lg overflow-hidden shadow-xl min-w-[70px] z-50"
          style={{ background: "var(--bg3)", border: "1px solid var(--border2)" }}>
          {LOCALES.map(l => (
            <button key={l.code} onClick={() => switchTo(l.code)}
              className="block w-full text-left px-4 py-2 text-[12px] font-semibold transition-colors"
              style={{ color: l.code === locale ? "var(--text)" : "var(--text3)", background: l.code === locale ? "rgba(37,99,235,0.15)" : "transparent" }}>
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Nav() {
  const t = useTranslations("Nav")
  const [open, setOpen]       = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40)
    window.addEventListener("scroll", fn)
    return () => window.removeEventListener("scroll", fn)
  }, [])

  const links = [
    { href: "/solutions",  label: t("solutions") },
    { href: "/services",   label: t("services") },
    { href: "/industries", label: t("industries") },
    { href: "/about",      label: t("about") },
    { href: "/insights",   label: t("insights") },
    { href: "/careers",    label: t("careers") },
  ]

  return (
    <header className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        background: scrolled ? "rgba(8,12,20,0.97)" : "rgba(8,12,20,0.85)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border)",
      }}>
      <div className="flex items-center justify-between px-[4%] h-16">
        {/* Logo */}
        <Link href="/" className="flex flex-col leading-none">
          <div className="flex items-baseline gap-2">
            <div className="font-bold text-[17px] tracking-wide" style={{ fontFamily: "'Syne', sans-serif" }}>
              DES <span style={{ color: "var(--accent2)" }}>SYSTEMS</span>
            </div>
            <div className="text-[11px] font-semibold" style={{ color: "var(--accent2)", letterSpacing: "0.04em", opacity: 0.85 }}>
              AI | ERP | MES | CRM | DevOps
            </div>
          </div>
          <div className="text-[10px] tracking-[0.1em] uppercase mt-[-2px]" style={{ color: "var(--text3)" }}>
            Enterprise Solutions
          </div>
        </Link>

        {/* Desktop */}
        <nav className="hidden lg:flex items-center gap-7">
          {links.map(l => (
            <Link key={l.href} href={l.href}
              className="text-[13px] transition-colors hover:opacity-100"
              style={{ color: "var(--text2)" }}>
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          <LangSwitcher />
          <Link href="/contact"
            className="text-[13px] font-medium px-5 py-2 rounded-md transition-colors text-white"
            style={{ background: "var(--accent)" }}>
            {t("cta")}
          </Link>
        </div>

        <button className="lg:hidden p-1.5 text-white" onClick={() => setOpen(v => !v)}>
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden px-[4%] pb-4" style={{ background: "var(--bg2)", borderTop: "1px solid var(--border)" }}>
          {links.map(l => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)}
              className="block py-2.5 text-sm border-b"
              style={{ color: "var(--text2)", borderColor: "var(--border)" }}>
              {l.label}
            </Link>
          ))}
          <div className="flex items-center justify-between mt-3">
            <LangSwitcher />
            <Link href="/contact" onClick={() => setOpen(false)}
              className="text-sm font-medium px-4 py-2 rounded-md text-white"
              style={{ background: "var(--accent)" }}>
              {t("cta")}
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}

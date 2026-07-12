"use client"
import { ClickTracker } from "@/components/click-tracker"
import { Link } from "@/src/i18n/routing"
import { useState, useEffect } from "react"
import { Menu, X, ChevronDown } from "lucide-react"
import { useTranslations, useLocale } from "next-intl"
import { useRouter, usePathname } from "@/src/i18n/routing"

import { useRef } from "react"
import { Globe } from "lucide-react"

const LOCALES = [
  { code: "en", name: "English",    flag: null },
  { code: "nl", name: "Nederlands", flag: "nl" },
  { code: "de", name: "Deutsch",    flag: "de" },
  { code: "fr", name: "Français",   flag: "fr" },
  { code: "tr", name: "Türkçe",     flag: "tr" },
  { code: "ro", name: "Română",     flag: "ro" },
  { code: "bg", name: "Български",  flag: "bg" },
  { code: "el", name: "Ελληνικά",   flag: "gr" },
  { code: "es", name: "Español",    flag: "es" },
  { code: "it", name: "Italiano",   flag: "it" },
]

function FlagImg({ cc }: { cc: string }) {
  return (
    <img
      src={"https://flagcdn.com/w20/" + cc + ".png"}
      srcSet={"https://flagcdn.com/w40/" + cc + ".png 2x"}
      width={20}
      height={14}
      alt={cc}
      className="rounded-[2px] object-cover"
      style={{ display: "block", flexShrink: 0 }}
    />
  )
}

function LangSwitcher({ mobile = false }: { mobile?: boolean }) {
  const locale   = useLocale()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  function switchLocale(code: string) {
    document.cookie = "NEXT_LOCALE=" + code + "; path=/; max-age=" + (60 * 60 * 24 * 365)
    setOpen(false)
    window.location.href = "/" + code + pathname
  }

  function resetToGeo() {
    document.cookie = "NEXT_LOCALE=; path=/; max-age=0"
    setOpen(false)
    window.location.href = "/"
  }

  const current = LOCALES.find(l => l.code === locale) || LOCALES[0]

  if (mobile) {
    return (
      <div className="py-4 border-t" style={{ borderColor: "rgba(255,255,255,0.10)", marginTop: "8px" }}>
        <p className="mb-3 text-[10px] font-semibold tracking-[0.14em] uppercase" style={{ color: "rgba(255,255,255,0.52)" }}>
          Language
        </p>
        <div className="flex flex-wrap gap-2">
          {LOCALES.map(({ code, name, flag }) => {
            const active = locale === code
            return (
              <button
                key={code}
                type="button"
                onClick={() => switchLocale(code)}
                title={name}
                className={"flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-[12px] transition-colors"}
                style={{
                  borderColor: active ? "var(--accent)" : "rgba(255,255,255,0.16)",
                  backgroundColor: active ? "rgba(37,99,235,0.15)" : "transparent",
                  color: active ? "var(--accent)" : "rgba(255,255,255,0.8)",
                  fontWeight: active ? 600 : 500
                }}
              >
                {flag ? <FlagImg cc={flag} /> : <Globe size={16} strokeWidth={1.6} />}
                <span className="text-[11px] uppercase tracking-[0.06em]">{code}</span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.14em] uppercase transition-colors"
        style={{ color: "rgba(255,255,255,0.80)" }}
      >
        {current.flag ? <FlagImg cc={current.flag} /> : <Globe size={16} strokeWidth={1.6} />}
        <ChevronDown
          size={12}
          strokeWidth={2}
          className={"transition-transform " + (open ? "rotate-180" : "")}
        />
      </button>

      {open && (
        <div className="absolute top-full right-0 z-[300] mt-2">
          <div className="min-w-[180px] overflow-hidden rounded-xl border bg-white shadow-xl" style={{ borderColor: "#e5e7eb" }}>
            {LOCALES.map(({ code, name, flag }) => {
              const active = locale === code
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => switchLocale(code)}
                  className="flex w-full items-center gap-3 px-4 py-[10px] text-left transition-colors"
                  style={{
                    backgroundColor: active ? "#FFF1E5" : "transparent",
                    color: active ? "#E07B2A" : "#374151"
                  }}
                  onMouseEnter={(e) => {
                    if (!active) e.currentTarget.style.backgroundColor = "#f9fafb"
                  }}
                  onMouseLeave={(e) => {
                    if (!active) e.currentTarget.style.backgroundColor = "transparent"
                  }}
                >
                  <span className="w-5 flex-none flex items-center justify-center">
                    {flag ? <FlagImg cc={flag} /> : <Globe size={16} strokeWidth={1.6} />}
                  </span>
                  <span className={"text-[13px] " + (active ? "font-semibold" : "font-normal")}>
                    {name}
                  </span>
                </button>
              )
            })}
            <div className="border-t" style={{ borderColor: "#e5e7eb", marginTop: "4px" }}>
              <button
                type="button"
                onClick={resetToGeo}
                className="flex w-full items-center gap-3 px-4 py-[10px] text-left transition-colors"
                style={{ color: "#6b7280" }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f9fafb"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
              >
                <span className="w-5 flex-none flex items-center justify-center">
                  <Globe size={15} strokeWidth={1.6} style={{ color: "#9ca3af" }} />
                </span>
                <span className="text-[12px] italic">Auto-detect</span>
              </button>
            </div>
          </div>
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
    <>
    <ClickTracker />
    <header className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        background: "linear-gradient(100deg, #0e1524 0%, #16223c 55%, #0f1932 100%)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.10)",
        boxShadow: scrolled ? "0 10px 30px rgba(0,0,0,0.35)" : "none",
      }}>
      <div className="flex items-center justify-between px-[4%] h-16">
        {/* Logo */}
        <Link href="/" className="flex flex-col leading-none">
          <div className="flex items-baseline gap-2">
            <div className="font-bold text-[17px] tracking-wide" style={{ fontFamily: "'Syne', sans-serif", color: "#fff" }}>
              DES <span style={{ color: "var(--accent2)" }}>TECH</span>
            </div>
          </div>
          <div className="text-[10px] tracking-[0.1em] uppercase mt-[-2px]" style={{ color: "rgba(255,255,255,0.52)" }}>
            Enterprise Solutions
          </div>
        </Link>

        {/* Desktop */}
        <nav className="hidden lg:flex items-center gap-7">
          {links.map(l => (
            <Link key={l.href} href={l.href}
              className="text-[13px] transition-colors hover:opacity-100"
              style={{ color: "rgba(255,255,255,0.80)" }}>
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          <Link href="/deslab"
            className="text-[13px] font-medium px-5 py-2 rounded-md transition-colors whitespace-nowrap"
            style={{ border: "1px solid rgba(255,255,255,0.16)", color: "rgba(255,255,255,0.80)" }}>
            Laboratory
          </Link>
          <a href="https://deshold.com" target="_blank" rel="noopener noreferrer"
            className="text-[13px] font-medium px-5 py-2 rounded-md transition-colors whitespace-nowrap"
            style={{ border: "1px solid rgba(255,255,255,0.16)", color: "rgba(255,255,255,0.80)" }}>
            DES Group
          </a>
          <LangSwitcher />
          <Link href="/contact"
            className="text-[13px] font-medium px-5 py-2 rounded-md transition-colors text-white"
            style={{ background: "var(--accent)" }}>
            {t("cta")}
          </Link>
        </div>

        <button className="lg:hidden p-1.5" style={{ color: "#ffffff" }} onClick={() => setOpen(v => !v)}>
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden px-[4%] pb-4" style={{ background: "#0e1626", borderTop: "1px solid rgba(255,255,255,0.10)" }}>
          {links.map(l => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)}
              className="block py-2.5 text-sm border-b"
              style={{ color: "rgba(255,255,255,0.80)", borderColor: "rgba(255,255,255,0.10)" }}>
              {l.label}
            </Link>
          ))}
          <div className="flex items-center justify-between mt-3 gap-2">
            <Link href="/deslab" onClick={() => setOpen(false)}
              className="text-sm font-medium px-4 py-2 rounded-md"
              style={{ border: "1px solid rgba(255,255,255,0.16)", color: "rgba(255,255,255,0.80)" }}>
              Laboratory
            </Link>
            <a href="https://deshold.com" target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}
              className="text-[13px] font-medium px-5 py-2 rounded-md transition-colors w-fit"
              style={{ border: "1px solid rgba(255,255,255,0.16)", color: "rgba(255,255,255,0.80)" }}>
              DES Group
            </a>
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
    </>
  )
}

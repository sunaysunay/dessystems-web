"use client"
import { ClickTracker } from "@/components/click-tracker"
import { Link } from "@/src/i18n/routing"
import { useState, useEffect } from "react"
import { Menu, X, ChevronDown } from "lucide-react"
import { useTranslations, useLocale } from "next-intl"
import { useRouter, usePathname } from "@/src/i18n/routing"

import { useRef } from "react"
import { Globe } from "lucide-react"

function Flag({ cc }: { cc: string }) {
  const flags: Record<string, { colors: string[]; layout: "vert" | "horiz" | "custom" }> = {
    nl: { colors: ["#AE1C28","#FFF","#21468B"], layout: "horiz" },
    de: { colors: ["#000","#D00","#FFCE00"], layout: "horiz" },
    fr: { colors: ["#002395","#FFF","#ED2939"], layout: "vert" },
    tr: { colors: ["#E30A17"], layout: "custom" },
    ro: { colors: ["#002B7F","#FCD116","#CE1126"], layout: "vert" },
    bg: { colors: ["#FFF","#00966E","#D62612"], layout: "horiz" },
    gr: { colors: ["#004C98","#FFF"], layout: "custom" },
    es: { colors: ["#AA151B","#F1BF00"], layout: "custom" },
    it: { colors: ["#008C45","#F4F5F0","#CD212A"], layout: "vert" },
  }
  const f = flags[cc]
  if (!f) return null
  const w = 20, h = 14
  if (f.layout === "horiz") {
    const s = h / 3
    return <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{display:"block",flexShrink:0,borderRadius:2}}><rect width={w} height={s} fill={f.colors[0]}/><rect y={s} width={w} height={s} fill={f.colors[1]}/><rect y={s*2} width={w} height={s} fill={f.colors[2]}/></svg>
  }
  if (f.layout === "vert") {
    const s = w / 3
    return <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{display:"block",flexShrink:0,borderRadius:2}}><rect width={s} height={h} fill={f.colors[0]}/><rect x={s} width={s} height={h} fill={f.colors[1]}/><rect x={s*2} width={s} height={h} fill={f.colors[2]}/></svg>
  }
  if (cc === "tr") {
    return <svg width={w} height={h} viewBox="0 0 20 14" style={{display:"block",flexShrink:0,borderRadius:2}}><rect width="20" height="14" fill="#E30A17"/><circle cx="8" cy="7" r="3.5" fill="#FFF"/><circle cx="9.2" cy="7" r="2.8" fill="#E30A17"/><polygon points="11.5,7 12.8,5.2 11.2,6.4 13,6.4 11.2,7.6" fill="#FFF" transform="rotate(18,12,7)"/></svg>
  }
  if (cc === "gr") {
    return <svg width={w} height={h} viewBox="0 0 20 14" style={{display:"block",flexShrink:0,borderRadius:2}}><rect width="20" height="14" fill="#004C98"/>{[0,1,2,3].map(i=><rect key={i} y={i*3.11+1.56} width="20" height="1.56" fill="#FFF"/>)}<rect width="7.78" height="7.78" fill="#004C98"/><rect x="3.11" width="1.56" height="7.78" fill="#FFF"/><rect y="3.11" width="7.78" height="1.56" fill="#FFF"/></svg>
  }
  if (cc === "es") {
    return <svg width={w} height={h} viewBox="0 0 20 14" style={{display:"block",flexShrink:0,borderRadius:2}}><rect width="20" height="14" fill="#F1BF00"/><rect width="20" height="3.5" fill="#AA151B"/><rect y="10.5" width="20" height="3.5" fill="#AA151B"/></svg>
  }
  return null
}

const LOCALES = [
  { code: "en", name: "English",    flag: null  as string | null },
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

function LangSwitcher({ mobile = false }: { mobile?: boolean }) {
  const locale   = useLocale()
  const pathname = usePathname()
  const router   = useRouter()
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
    router.replace(pathname, { locale: code })
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
                {flag ? <Flag cc={flag} /> : <Globe size={16} strokeWidth={1.6} />}
                <span className="text-[11px] uppercase tracking-[0.06em]">{code}</span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div ref={ref} className="relative hidden lg:block">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-[13px] font-medium transition-colors"
        style={{ color: "rgba(255,255,255,0.8)" }}
        onMouseEnter={(e) => e.currentTarget.style.color = "#fff"}
        onMouseLeave={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.8)"}
      >
        {current.flag ? <Flag cc={current.flag} /> : <Globe size={16} strokeWidth={1.8} />}
        {current.code.toUpperCase()}
        <ChevronDown
          size={14}
          strokeWidth={2}
          className={"transition-transform " + (open ? "rotate-180" : "")}
        />
      </button>

      {open && (
        <div className="absolute top-full right-0 z-[300] mt-2">
          <div className="min-w-[180px] overflow-hidden rounded-xl border shadow-xl" style={{ background: "rgba(14,22,38,0.95)", backdropFilter: "blur(12px)", borderColor: "rgba(255,255,255,0.15)" }}>
            {LOCALES.map(({ code, name, flag }) => {
              const active = locale === code
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => switchLocale(code)}
                  className="flex w-full items-center gap-3 px-4 py-[10px] text-left transition-colors"
                  style={{
                    backgroundColor: active ? "rgba(224,123,42,0.15)" : "transparent",
                    color: active ? "var(--accent)" : "rgba(255,255,255,0.8)"
                  }}
                  onMouseEnter={(e) => {
                    if (!active) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)"
                  }}
                  onMouseLeave={(e) => {
                    if (!active) e.currentTarget.style.backgroundColor = "transparent"
                  }}
                >
                  <span className="w-5 flex-none flex items-center justify-center">
                    {flag ? <Flag cc={flag} /> : <Globe size={16} strokeWidth={1.6} />}
                  </span>
                  <span className={"text-[13px] " + (active ? "font-semibold" : "font-normal")}>
                    {name}
                  </span>
                </button>
              )
            })}
            <div className="border-t" style={{ borderColor: "rgba(255,255,255,0.10)", marginTop: "4px" }}>
              <button
                type="button"
                onClick={resetToGeo}
                className="flex w-full items-center gap-3 px-4 py-[10px] text-left transition-colors"
                style={{ color: "rgba(255,255,255,0.52)" }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
              >
                <span className="w-5 flex-none flex items-center justify-center">
                  <Globe size={15} strokeWidth={1.6} style={{ color: "rgba(255,255,255,0.4)" }} />
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

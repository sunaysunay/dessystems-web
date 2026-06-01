"use client"
import { motion } from "framer-motion"
import { useState } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { useTranslations } from "next-intl"

export default function HeroPanels() {
  const t = useTranslations("Hero")
  const [active, setActive] = useState(3)

  const panels = [
    {
      title: t("erp_title"),
      subtitle: t("erp_sub"),
      img: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=1200&q=80",
      href: "/solutions#erp",
      accent: "#2563eb",
      num: "01",
    },
    {
      title: t("mes_title"),
      subtitle: t("mes_sub"),
      img: "https://images.unsplash.com/photo-1565793979963-e6a42c9a37c8?w=1200&q=80",
      href: "/solutions#mes",
      accent: "#10b981",
      num: "02",
    },
    {
      title: t("automation_title"),
      subtitle: t("automation_sub"),
      img: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=80",
      href: "/solutions#automation",
      accent: "#7c3aed",
      num: "03",
    },
    {
      title: t("platform_title"),
      subtitle: t("platform_sub"),
      img: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80",
      href: "/platform",
      accent: "#3b82f6",
      num: "04",
    },

  ]

  return (
    <section className="flex overflow-hidden" style={{height:"62vh",minHeight:"480px"}}>
      {panels.map((p, i) => (
        <motion.div
          key={p.title}
          onMouseEnter={() => setActive(i)}
          animate={{ flex: active === i ? 3 : 1 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="relative cursor-pointer overflow-hidden"
        >
          <motion.div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${p.img})` }}
            animate={{ scale: active === i ? 1.04 : 1.1 }}
            transition={{ duration: 0.7 }}
          />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(8,12,20,0.92) 0%, rgba(8,12,20,0.5) 50%, rgba(8,12,20,0.2) 100%)" }} />

          {/* Accent line */}
          <motion.div className="absolute bottom-0 left-0 h-0.5 w-full"
            style={{ background: p.accent }}
            animate={{ opacity: active === i ? 1 : 0 }}
            transition={{ duration: 0.3 }} />

          {/* Number */}
          <div className="absolute top-8 right-5 text-[11px] font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>{p.num}</div>

          {/* Content */}
          <div className="absolute bottom-10 left-8 right-8 z-10 text-white">
            <motion.h2
              className="font-bold leading-tight mb-2 whitespace-nowrap overflow-hidden text-ellipsis"
              style={{ fontFamily: "'Syne', sans-serif", fontSize: "clamp(20px,2.5vw,38px)" }}
              animate={{ opacity: active === i ? 1 : 0.6 }}>
              {p.title}
            </motion.h2>

            <motion.div
              animate={{ opacity: active === i ? 1 : 0, height: active === i ? "auto" : 0, y: active === i ? 0 : 8 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden">
              <p className="text-[13px] leading-relaxed mb-5 max-w-xs" style={{ color: "rgba(255,255,255,0.7)" }}>
                {p.subtitle}
              </p>
              <Link href={p.href}
                className="inline-flex items-center gap-2 text-[12px] font-medium px-4 py-2 rounded-full transition-all"
                style={{ border: "1px solid rgba(255,255,255,0.4)", color: "white" }}>
                {t("discover")} <ArrowRight className="w-3 h-3" />
              </Link>
            </motion.div>
          </div>
        </motion.div>
      ))}
    </section>
  )
}

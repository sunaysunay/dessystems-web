"use client"
import { useTheme } from "next-themes"
import { Monitor, Sun, Moon } from "lucide-react"
import { useEffect, useState } from "react"

const OPTIONS = [
  { key: "system", Icon: Monitor },
  { key: "light",  Icon: Sun },
  { key: "dark",   Icon: Moon },
] as const

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  return (
    <div role="group" aria-label="Theme switcher"
      style={{ display: "inline-flex", alignItems: "center", gap: 2, padding: 3, borderRadius: 9, border: "1px solid var(--border2)", background: "var(--bg3)" }}>
      {OPTIONS.map(({ key, Icon }) => {
        const active = theme === key
        return (
          <button key={key} type="button" onClick={() => setTheme(key)} aria-pressed={active} aria-label={`${key} theme`}
            style={{ display: "grid", placeItems: "center", width: 26, height: 26, borderRadius: 6, cursor: "pointer", border: "none",
              background: active ? "var(--accent)" : "transparent", color: active ? "#fff" : "var(--text3)", transition: "all .15s ease" }}>
            <Icon size={13} />
          </button>
        )
      })}
    </div>
  )
}

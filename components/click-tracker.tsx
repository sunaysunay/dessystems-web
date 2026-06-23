"use client"
import { useEffect, useRef } from "react"

const TENANT_ID = 500  // desmobil.com

function generateUUID(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID()
    }
  } catch {}
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function getSessionId(): string {
  if (typeof window === "undefined") return ""
  try {
    let id = sessionStorage.getItem("des_session_id")
    if (!id) {
      const match = document.cookie.split(";").find((c) => c.trim().startsWith("_sid="))
      id = match ? match.trim().slice(5) : generateUUID()
      sessionStorage.setItem("des_session_id", id)
    }
    document.cookie = "_sid=" + id + ";path=/;max-age=86400;samesite=lax"
    return id
  } catch { return "" }
}

function parseDevice(ua: string): string {
  const u = ua.toLowerCase()
  if (u.includes("ipad") || (u.includes("android") && !u.includes("mobile"))) return "tablet"
  if (u.includes("mobile") || u.includes("iphone")) return "mobile"
  return "desktop"
}

export function ClickTracker() {
  const sessionRef = useRef<string>("")

  useEffect(() => {
    sessionRef.current = getSessionId()

    // Log page_view on mount and navigation
    function logPageView() {
      const payload = JSON.stringify({
        event_type: "page_view",
        page: window.location.pathname,
        session_id: sessionRef.current,
        tenant_id: TENANT_ID,
        device_type: parseDevice(navigator.userAgent),
        browser_language: navigator.language,
        screen_resolution: `${screen.width}x${screen.height}`,
        referrer: document.referrer || null,
      })
      navigator.sendBeacon("/api/log", new Blob([payload], { type: "application/json" }))
    }
    logPageView()

    // Click tracking
    const DEBOUNCE_MS = 300
    const lastFiredMap = new WeakMap<HTMLElement, number>()
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement
      const tracked = target.closest("[data-track]") as HTMLElement | null
      if (!tracked) return
      const now = Date.now()
      if ((now - (lastFiredMap.get(tracked) ?? 0)) < DEBOUNCE_MS) return
      lastFiredMap.set(tracked, now)
      const payload = JSON.stringify({
        event_type: "click",
        page: window.location.pathname,
        session_id: sessionRef.current,
        tenant_id: TENANT_ID,
        metadata: {
          track_id: tracked.getAttribute("data-track") ?? "unknown",
          track_label: tracked.getAttribute("data-track-label") || tracked.textContent?.trim().slice(0, 80),
          track_type: tracked.getAttribute("data-track-type") || "element",
        },
      })
      navigator.sendBeacon("/api/log", new Blob([payload], { type: "application/json" }))
    }
    document.addEventListener("click", handleClick, { passive: true })
    return () => document.removeEventListener("click", handleClick)
  }, [])

  return null
}

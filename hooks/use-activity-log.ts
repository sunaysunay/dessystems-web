"use client"
import { useCallback } from "react"
import { usePathname } from "next/navigation"

function getSessionId(): string {
  if (typeof window === "undefined") return ""
  let id = sessionStorage.getItem("des_session_id")
  if (!id) {
    const match = document.cookie.split(";").find(c => c.trim().startsWith("_sid="))
    id = match ? match.trim().slice(5) : crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)
    sessionStorage.setItem("des_session_id", id)
  }
  document.cookie = "_sid=" + id + ";path=/;max-age=86400;samesite=lax"
  return id
}

function getBrowserInfo() {
  if (typeof window === "undefined") return {}
  const w = window.screen.width
  const hasTouch = navigator.maxTouchPoints > 0
  return {
    screen_resolution: `${window.screen.width}x${window.screen.height}`,
    device_type: w <= 768 && hasTouch ? "mobile" : w <= 1024 && hasTouch ? "tablet" : "desktop",
    browser_language: navigator.language || null,
  }
}

interface LogEventOptions {
  eventType: string
  page?: string
  listingId?: string
  listingTitle?: string
  listingSlug?: string
  metadata?: Record<string, unknown>
}

export function useActivityLog() {
  const pathname = usePathname()

  const logEvent = useCallback((options: LogEventOptions) => {
    const payload = {
      event_type: options.eventType,
      page: options.page || pathname || "",
      listing_id: options.listingId || null,
      listing_title: options.listingTitle || null,
      listing_slug: options.listingSlug || null,
      session_id: getSessionId(),
      metadata: { source: "client", ...(options.metadata || {}) },
      ...getBrowserInfo(),
    }
    const blob = new Blob([JSON.stringify(payload)], { type: "application/json" })
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/log", blob)
    } else {
      fetch("/api/log", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), keepalive: true }).catch(() => {})
    }
  }, [pathname])

  return { logEvent }
}

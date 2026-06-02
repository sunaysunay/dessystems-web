"use client"
/**
 * ClickTracker — global listener for data-track="*" attributes.
 * Posts click events to /api/log with event_type: "click" + session_id.
 *
 * Usage:  <button data-track="nav_listings">Listings</button>
 * Types:  data-track-type="nav" | "cta" | "button" | "link"
 */
import { useEffect } from "react"

const DEBOUNCE_MS = 300
let lastFired = 0

function getSessionId(): string | null {
  try { return sessionStorage.getItem("des_session_id") } catch { return null }
}

function inferType(el: HTMLElement): string {
  if (el.closest("nav")) return "nav"
  if (el.tagName === "A" || el.closest("a")) return "link"
  if (el.tagName === "BUTTON" || el.closest("button")) return "button"
  return "element"
}

export function ClickTracker() {
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement
      const tracked = target.closest("[data-track]") as HTMLElement | null
      if (!tracked) return

      const now = Date.now()
      if (now - lastFired < DEBOUNCE_MS) return
      lastFired = now

      const trackId    = tracked.getAttribute("data-track") ?? "unknown"
      const trackLabel = tracked.getAttribute("data-track-label") || tracked.textContent?.trim().slice(0, 80) || trackId
      const trackType  = tracked.getAttribute("data-track-type") || inferType(tracked)
      const href       = (tracked as HTMLAnchorElement).href || tracked.querySelector("a")?.href || ""
      const sessionId  = getSessionId()

      const payload = JSON.stringify({
        event_type: "click",
        page:       window.location.pathname,
        session_id: sessionId,
        metadata: {
          track_id:    trackId,
          track_label: trackLabel,
          track_type:  trackType,
          href:        href ? new URL(href, window.location.origin).pathname : "",
          x:           Math.round(e.clientX),
          y:           Math.round(e.clientY),
        },
      })
      navigator.sendBeacon("/api/log", new Blob([payload], { type: 'application/json' }))
    }

    document.addEventListener("click", handleClick, { passive: true })
    return () => document.removeEventListener("click", handleClick)
  }, [])

  return null
}

"use client"
/**
 * ClickTracker — attaches a global listener to all elements with data-track="*"
 * Posts click events to /api/log with event_type: "click"
 *
 * Usage on any element:
 *   <button data-track="nav_listings">Listings</button>
 *   <a data-track="cta_contact">Contact Us</a>
 *
 * Attributes read:
 *   data-track       — required: identifies the element (e.g. "nav_listings")
 *   data-track-label — optional: human label override
 *   data-track-type  — optional: "nav" | "button" | "link" | "cta" (default: inferred)
 */
import { useEffect } from "react"

const DEBOUNCE_MS = 300
let lastFired = 0

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
      // Find nearest ancestor (or self) with data-track
      const tracked = target.closest("[data-track]") as HTMLElement | null
      if (!tracked) return

      // Debounce rapid double-clicks
      const now = Date.now()
      if (now - lastFired < DEBOUNCE_MS) return
      lastFired = now

      const trackId    = tracked.getAttribute("data-track") ?? "unknown"
      const trackLabel = tracked.getAttribute("data-track-label") || tracked.textContent?.trim().slice(0, 60) || trackId
      const trackType  = tracked.getAttribute("data-track-type") || inferType(tracked)
      const href       = (tracked as HTMLAnchorElement).href || tracked.querySelector("a")?.href || ""

      // Fire-and-forget POST to /api/log
      navigator.sendBeacon("/api/log", JSON.stringify({
        event_type: "click",
        page: window.location.pathname,
        metadata: {
          track_id:    trackId,
          track_label: trackLabel,
          track_type:  trackType,
          href:        href ? new URL(href, window.location.origin).pathname : "",
          x: Math.round(e.clientX),
          y: Math.round(e.clientY),
        },
      }))
    }

    document.addEventListener("click", handleClick, { passive: true })
    return () => document.removeEventListener("click", handleClick)
  }, [])

  return null  // renders nothing
}

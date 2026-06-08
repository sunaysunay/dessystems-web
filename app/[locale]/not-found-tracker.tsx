"use client"
import { useEffect } from "react"

export function NotFoundTracker() {
  useEffect(() => {
    const pathname = window.location.pathname
    const sessionId = sessionStorage.getItem("des_session_id") || undefined
    fetch("/api/log", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        event_type: "not_found",
        page: pathname,
        session_id: sessionId,
        metadata: { source: "not-found-page" },
      }),
    }).catch(() => {})
  }, [])
  return null
}

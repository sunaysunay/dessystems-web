"use client"
import { useEffect, useState } from "react"

export function NotFoundActions() {
  return (
    <button
      type="button"
      className="nf-btn nf-btn-ghost"
      onClick={() => window.history.back()}
    >
      ← GO BACK
    </button>
  )
}

export function NotFoundTrace() {
  const [path, setPath] = useState("/unknown")
  const [time, setTime] = useState("—")

  useEffect(() => {
    setPath(window.location.pathname || "/unknown")
    const now = new Date()
    setTime(now.toISOString().replace("T", " ").split(".")[0] + "Z")
  }, [])

  return (
    <div className="nf-trace">
      <span className="nf-trace-line"><span className="nf-key">STATUS  </span> <span className="nf-val">404</span></span>
      <span className="nf-trace-line"><span className="nf-key">CODE    </span> <span className="nf-val">NOT_FOUND</span></span>
      <span className="nf-trace-line"><span className="nf-key">PATH    </span> <span className="nf-val">{path}</span></span>
      <span className="nf-trace-line"><span className="nf-key">TIME    </span> <span className="nf-val">{time}</span></span>
    </div>
  )
}

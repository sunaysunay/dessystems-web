"use client"
import type { CSSProperties } from "react"

const wrap: CSSProperties = {
  background: "linear-gradient(135deg, #f97316, #ea580c)",
  borderRadius: 16,
  padding: 4,
}

const card: CSSProperties = {
  background: "#fff",
  borderRadius: 13,
  overflow: "hidden",
}

const header: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "16px 24px 0",
}

const shieldStyle: CSSProperties = {
  width: 28,
  height: 28,
  background: "linear-gradient(135deg, #f97316, #ea580c)",
  borderRadius: 6,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
}

const body: CSSProperties = {
  padding: "16px 24px 20px",
}

const row: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "14px 0",
  borderBottom: "1px solid #f1f1f1",
  fontSize: 14,
}

const labelStyle: CSSProperties = {
  color: "#64748b",
  fontSize: 14,
}

const valStyle: CSSProperties = {
  fontWeight: 700,
  color: "#0f172a",
  fontSize: 14,
  textAlign: "right",
}

const activeBadge: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  background: "#f0fdf4",
  color: "#16a34a",
  fontWeight: 600,
  fontSize: 13,
  padding: "4px 12px",
  borderRadius: 20,
  border: "1px solid #bbf7d0",
}

const footer: CSSProperties = {
  background: "#f8fafc",
  borderTop: "1px solid #f1f1f1",
  padding: "14px 24px",
  fontSize: 13,
  color: "#64748b",
}

export function VerifiedBadge() {
  return (
    <div style={wrap}>
      <div style={card}>
        <div style={header}>
          <div style={shieldStyle}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L4 6v6c0 5.25 3.4 10.15 8 11.25C16.6 22.15 20 17.25 20 12V6l-8-4z" fill="#fff" />
              <path d="M10 15.5l-3.5-3.5 1.41-1.41L10 12.67l5.59-5.59L17 8.5l-7 7z" fill="#f97316" />
            </svg>
          </div>
          <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "#f97316" }}>
            Verified Company
          </span>
        </div>

        <div style={body}>
          <h3 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", margin: "0 0 4px" }}>
            DESMobil | DES Systems
          </h3>
          <p style={{ fontSize: 14, color: "#64748b", margin: "0 0 20px" }}>
            Officially registered in the Netherlands
          </p>

          <div style={row}>
            <span style={labelStyle}>Chamber of Commerce (KVK)</span>
            <span style={valStyle}>96837225</span>
          </div>
          <div style={row}>
            <span style={labelStyle}>VAT</span>
            <span style={valStyle}>NL005231355B29</span>
          </div>
          <div style={row}>
            <span style={labelStyle}>Registered office</span>
            <span style={{ ...valStyle, maxWidth: 220 }}>Veenen 22, 4703RB, Roosendaal, NL</span>
          </div>
          <div style={{ ...row, borderBottom: "none" }}>
            <span style={labelStyle}>Status</span>
            <span style={activeBadge}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="#16a34a" />
              </svg>
              Active
            </span>
          </div>
        </div>

        <div style={footer}>
          Verify in the official register →{" "}
          <a
            href="https://www.kvk.nl/zoeken/?source=qs&q=96837225"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#f97316", fontWeight: 600, textDecoration: "none" }}
          >
            KVK Business Register
          </a>
        </div>
      </div>
    </div>
  )
}

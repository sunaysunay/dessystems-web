"use client"
import { useState } from "react"
import type { CSSProperties } from "react"
import { CheckCircle, ArrowRight, Settings, Factory, Bot, Briefcase, BarChart3 } from "lucide-react"
import { useTranslations } from "next-intl"
import { dxCss } from "@/components/dx-styles"

type Topic = "erp" | "mes" | "automation" | "freelance" | "platform"

const TOPICS: { id: Topic; Icon: typeof Settings }[] = [
  { id: "platform",   Icon: BarChart3 },
  { id: "erp",        Icon: Settings },
  { id: "mes",        Icon: Factory },
  { id: "automation", Icon: Bot },
  { id: "freelance",  Icon: Briefcase },
]

const inputStyle: CSSProperties = { width: "100%", fontSize: 14, padding: "10px 12px", borderRadius: 8, background: "#fff", border: "1px solid var(--line)", color: "var(--ink)", outline: "none" }
const labelStyle: CSSProperties = { display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6, color: "var(--slate)" }

export default function ContactPage() {
  const t = useTranslations("Contact")
  const [topic, setTopic]     = useState<Topic>("platform")
  const [form, setForm]       = useState({ firstName: "", lastName: "", email: "", phone: "", company: "", message: "" })
  const [sending, setSending] = useState(false)
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState("")

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSending(true); setError("")
    try {
      const r = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, topic }),
      })
      if (!r.ok) throw new Error("Failed")
      setSent(true)
    } catch { setError(t("error")) }
    setSending(false)
  }

  return (
    <div className="dx" style={{ paddingTop: 72 }}>
      <style dangerouslySetInnerHTML={{ __html: dxCss }} />

      <section className="section">
        <div className="wrap" style={{ maxWidth: 900 }}>
          <div className="center" style={{ marginBottom: 40 }}>
            <span className="eyebrow">{t("eyebrow")}</span>
            <h2 style={{ marginTop: 10 }}>{t("title")}</h2>
            <p className="lead" style={{ margin: "12px auto 0" }}>{t("subtitle_full")}</p>
          </div>

          {sent ? (
            <div className="card center" style={{ padding: "64px 26px" }}>
              <CheckCircle style={{ width: 52, height: 52, color: "var(--accent-2)", margin: "0 auto 8px" }} />
              <h3 style={{ fontSize: 22 }}>{t("sent_title")}</h3>
              <p className="lead" style={{ margin: "10px auto 0", fontSize: 15 }}>{t("sent_desc")}</p>
              <button onClick={() => { setSent(false); setForm({ firstName: "", lastName: "", email: "", phone: "", company: "", message: "" }) }}
                className="btn btn-ghost" style={{ marginTop: 18 }}>{t("send_another")}</button>
            </div>
          ) : (
            <form onSubmit={submit} className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: 24, borderBottom: "1px solid var(--line)" }}>
                <div style={labelStyle}>{t("help_label")}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10 }}>
                  {TOPICS.map(tp => (
                    <button key={tp.id} type="button" onClick={() => setTopic(tp.id)}
                      style={{ padding: 14, textAlign: "left", cursor: "pointer", borderRadius: 10,
                        border: topic === tp.id ? "1.5px solid var(--accent)" : "1px solid var(--line)",
                        background: topic === tp.id ? "rgba(29,108,240,.06)" : "#fff" }}>
                      <tp.Icon style={{ width: 20, height: 20, color: "var(--accent)", marginBottom: 6 }} />
                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--navy)" }}>{t(`topic_${tp.id}`)}</div>
                      <div style={{ fontSize: 10, color: "var(--slate)", marginTop: 2 }}>{t(`topic_${tp.id}_sub`)}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ padding: 24, display: "grid", gap: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div><label style={labelStyle}>{t("first_name")} *</label><input required style={inputStyle} value={form.firstName} onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))} placeholder="Jan" /></div>
                  <div><label style={labelStyle}>{t("last_name")} *</label><input required style={inputStyle} value={form.lastName} onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))} placeholder="de Vries" /></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div><label style={labelStyle}>{t("email")} *</label><input required type="email" style={inputStyle} value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="jan@company.com" /></div>
                  <div><label style={labelStyle}>{t("phone")}</label><input style={inputStyle} value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+31 6 ..." /></div>
                </div>
                <div><label style={labelStyle}>{t("company_label")}</label><input style={inputStyle} value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} placeholder={t("company_ph")} /></div>
                <div><label style={labelStyle}>{t("message")} *</label><textarea required rows={4} style={{ ...inputStyle, resize: "none" }} value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} placeholder={t("message_ph")} /></div>

                {error && <p style={{ fontSize: 13, color: "#dc2626" }}>{error}</p>}

                <button type="submit" disabled={sending} className="btn btn-primary" style={{ width: "100%", justifyContent: "center", opacity: sending ? 0.5 : 1 }}>
                  {sending ? t("sending") : <>{t("send")} <ArrowRight /></>}
                </button>
                <p style={{ fontSize: 10, textAlign: "center", color: "var(--slate)" }}>{t("privacy")}</p>
              </div>
            </form>
          )}

          <div className="grid grid-3" style={{ marginTop: 24 }}>
            {[
              { ico: "✉", label: t("info_email"), val: "info@dessystems.io" },
              { ico: "☎", label: t("info_phone"), val: "+31 6 82545600" },
              { ico: "⏱", label: t("info_resp"),  val: t("info_resp_val") },
            ].map(i => (
              <div key={i.label} className="card center" style={{ padding: 18 }}>
                <div style={{ fontSize: 20, marginBottom: 6 }}>{i.ico}</div>
                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--slate)", marginBottom: 4 }}>{i.label}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--navy)" }}>{i.val}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

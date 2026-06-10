"use client"
import { useState } from "react"
import { CheckCircle, ArrowRight } from "lucide-react"
import { useTranslations } from "next-intl"

type Topic = "erp" | "mes" | "automation" | "freelance" | "platform"

const TOPICS: { id: Topic; icon: string }[] = [
  { id: "erp",        icon: "⚙️" },
  { id: "mes",        icon: "🏭" },
  { id: "automation", icon: "🤖" },
  { id: "freelance",  icon: "💼" },
  { id: "platform",   icon: "📊" },
]

const INPUT = "w-full text-[13px] px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
const INPUT_STYLE = { background: "var(--bg3)", border: "1px solid var(--border2)", color: "var(--text)" }

export default function ContactPage() {
  const t = useTranslations("Contact")
  const [topic, setTopic]   = useState<Topic>("erp")
  const [form,  setForm]    = useState({ firstName:"", lastName:"", email:"", phone:"", company:"", message:"" })
  const [sending, setSending] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState("")

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
    <div style={{ minHeight: "100vh", background: "var(--bg)", paddingTop: "80px" }}>
      <div className="max-w-4xl mx-auto px-[4%] py-16">
        <div className="text-[11px] tracking-[0.12em] uppercase font-medium mb-3" style={{ color: "var(--accent2)" }}>{t("eyebrow")}</div>
        <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "'Syne',sans-serif" }}>{t("title")}</h1>
        <p className="text-[14px] mb-10 max-w-xl" style={{ color: "var(--text2)" }}>
          {t("subtitle_full")}
        </p>

        {sent ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <CheckCircle className="w-14 h-14" style={{ color: "var(--green)" }} />
            <h2 className="text-2xl font-bold" style={{ fontFamily: "'Syne',sans-serif" }}>{t("sent_title")}</h2>
            <p className="text-[14px] max-w-sm" style={{ color: "var(--text2)" }}>
              {t("sent_desc")}
            </p>
            <button onClick={() => { setSent(false); setForm({ firstName:"", lastName:"", email:"", phone:"", company:"", message:"" }) }}
              className="text-[13px] mt-2" style={{ color: "var(--accent2)" }}>
              {t("send_another")}
            </button>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg2)", border: "1px solid var(--border2)" }}>
            <form onSubmit={submit}>
              {/* Topic selector */}
              <div className="p-6 border-b" style={{ borderColor: "var(--border)" }}>
                <div className="text-[12px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text3)" }}>{t("help_label")}</div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {TOPICS.map(tp => (
                    <button key={tp.id} type="button" onClick={() => setTopic(tp.id)}
                      className="p-3 rounded-lg text-left transition-all"
                      style={{
                        background: topic === tp.id ? "rgba(37,99,235,0.15)" : "var(--bg3)",
                        border: topic === tp.id ? "1.5px solid var(--accent2)" : "1px solid var(--border)",
                      }}>
                      <div className="text-lg mb-1">{tp.icon}</div>
                      <div className="text-[12px] font-semibold" style={{ color: "var(--text)" }}>{t(`topic_${tp.id}`)}</div>
                      <div className="text-[10px] mt-0.5" style={{ color: "var(--text3)" }}>{t(`topic_${tp.id}_sub`)}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Form fields */}
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text3)" }}>{t("first_name")} *</label>
                    <input required className={INPUT} style={INPUT_STYLE} value={form.firstName} onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))} placeholder="Jan" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text3)" }}>{t("last_name")} *</label>
                    <input required className={INPUT} style={INPUT_STYLE} value={form.lastName} onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))} placeholder="de Vries" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text3)" }}>{t("email")} *</label>
                    <input required type="email" className={INPUT} style={INPUT_STYLE} value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="jan@company.com" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text3)" }}>{t("phone")}</label>
                    <input className={INPUT} style={INPUT_STYLE} value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+31 6 ···" />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text3)" }}>{t("company_label")}</label>
                  <input className={INPUT} style={INPUT_STYLE} value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} placeholder={t("company_ph")} />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text3)" }}>{t("message")} *</label>
                  <textarea required rows={4} className={INPUT + " resize-none"} style={INPUT_STYLE}
                    value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                    placeholder={t("message_ph")} />
                </div>

                {error && <p className="text-[13px]" style={{ color: "#f87171" }}>{error}</p>}

                <button type="submit" disabled={sending}
                  className="w-full flex items-center justify-center gap-2 text-[14px] font-semibold py-3 rounded-lg text-white transition-all disabled:opacity-50"
                  style={{ background: "var(--accent)" }}>
                  {sending ? t("sending") : <><span>{t("send")}</span> <ArrowRight className="w-4 h-4" /></>}
                </button>
                <p className="text-[10px] text-center" style={{ color: "var(--text3)" }}>
                  {t("privacy")}
                </p>
              </div>
            </form>
          </div>
        )}

        {/* Contact info strip */}
        <div className="mt-8 grid grid-cols-3 gap-4">
          {[
            { ico: "✉", label: t("info_email"), val: "info@dessystems.io" },
            { ico: "📞", label: t("info_phone"), val: "+31 6 82545600" },
            { ico: "⏱", label: t("info_resp"), val: t("info_resp_val") },
          ].map(i => (
            <div key={i.label} className="p-4 rounded-xl text-center" style={{ background: "var(--bg2)", border: "1px solid var(--border)" }}>
              <div className="text-xl mb-2">{i.ico}</div>
              <div className="text-[11px] uppercase tracking-wider mb-1" style={{ color: "var(--text3)" }}>{i.label}</div>
              <div className="text-[13px] font-medium" style={{ color: "var(--text)" }}>{i.val}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

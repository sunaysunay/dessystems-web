"use client"
import { useState } from "react"
import { CheckCircle, ArrowRight } from "lucide-react"
import { useTranslations } from "next-intl"

type Topic = "erp" | "mes" | "automation" | "freelance" | "platform"

const TOPICS: { id: Topic; icon: string; label: string; sub: string }[] = [
  { id: "erp",        icon: "⚙️", label: "ERP Consulting",     sub: "SAP / S/4HANA projects" },
  { id: "mes",        icon: "🏭", label: "MES Integration",    sub: "Shop floor connectivity" },
  { id: "automation", icon: "🤖", label: "Automation",         sub: "Workflow & process" },
  { id: "freelance",  icon: "💼", label: "Freelance Project",   sub: "Short or long-term" },
  { id: "platform",   icon: "📊", label: "DES Platform",        sub: "BOP product inquiry" },
]

const INPUT = "w-full text-[13px] px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
const INPUT_STYLE = { background: "var(--bg3)", border: "1px solid var(--border2)", color: "var(--text)" }

export default function ContactPage() {
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
    } catch { setError("Something went wrong. Please try again.") }
    setSending(false)
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", paddingTop: "80px" }}>
      <div className="max-w-4xl mx-auto px-[4%] py-16">
        <div className="text-[11px] tracking-[0.12em] uppercase font-medium mb-3" style={{ color: "var(--accent2)" }}>Contact</div>
        <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "'Syne',sans-serif" }}>Let's discuss your project</h1>
        <p className="text-[14px] mb-10 max-w-xl" style={{ color: "var(--text2)" }}>
          Choose the topic that matches your inquiry. Available for remote &amp; on-site engagements worldwide.
        </p>

        {sent ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <CheckCircle className="w-14 h-14" style={{ color: "var(--green)" }} />
            <h2 className="text-2xl font-bold" style={{ fontFamily: "'Syne',sans-serif" }}>Message sent!</h2>
            <p className="text-[14px] max-w-sm" style={{ color: "var(--text2)" }}>
              We have received your inquiry and will respond within one business day.
            </p>
            <button onClick={() => { setSent(false); setForm({ firstName:"", lastName:"", email:"", phone:"", company:"", message:"" }) }}
              className="text-[13px] mt-2" style={{ color: "var(--accent2)" }}>
              Send another message
            </button>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg2)", border: "1px solid var(--border2)" }}>
            <form onSubmit={submit}>
              {/* Topic selector */}
              <div className="p-6 border-b" style={{ borderColor: "var(--border)" }}>
                <div className="text-[12px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text3)" }}>What can we help you with?</div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {TOPICS.map(t => (
                    <button key={t.id} type="button" onClick={() => setTopic(t.id)}
                      className="p-3 rounded-lg text-left transition-all"
                      style={{
                        background: topic === t.id ? "rgba(37,99,235,0.15)" : "var(--bg3)",
                        border: topic === t.id ? "1.5px solid var(--accent2)" : "1px solid var(--border)",
                      }}>
                      <div className="text-lg mb-1">{t.icon}</div>
                      <div className="text-[12px] font-semibold" style={{ color: "var(--text)" }}>{t.label}</div>
                      <div className="text-[10px] mt-0.5" style={{ color: "var(--text3)" }}>{t.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Form fields */}
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text3)" }}>First Name *</label>
                    <input required className={INPUT} style={INPUT_STYLE} value={form.firstName} onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))} placeholder="Jan" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text3)" }}>Last Name *</label>
                    <input required className={INPUT} style={INPUT_STYLE} value={form.lastName} onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))} placeholder="de Vries" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text3)" }}>Email *</label>
                    <input required type="email" className={INPUT} style={INPUT_STYLE} value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="jan@company.com" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text3)" }}>Phone (optional)</label>
                    <input className={INPUT} style={INPUT_STYLE} value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+31 6 ···" />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text3)" }}>Company (optional)</label>
                  <input className={INPUT} style={INPUT_STYLE} value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} placeholder="Your company name" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text3)" }}>Message *</label>
                  <textarea required rows={4} className={INPUT + " resize-none"} style={INPUT_STYLE}
                    value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                    placeholder="Describe your project or inquiry..." />
                </div>

                {error && <p className="text-[13px]" style={{ color: "#f87171" }}>{error}</p>}

                <button type="submit" disabled={sending}
                  className="w-full flex items-center justify-center gap-2 text-[14px] font-semibold py-3 rounded-lg text-white transition-all disabled:opacity-50"
                  style={{ background: "var(--accent)" }}>
                  {sending ? "Sending…" : <><span>Send Message</span> <ArrowRight className="w-4 h-4" /></>}
                </button>
                <p className="text-[10px] text-center" style={{ color: "var(--text3)" }}>
                  Your data is only used to respond to your inquiry.
                </p>
              </div>
            </form>
          </div>
        )}

        {/* Contact info strip */}
        <div className="mt-8 grid grid-cols-3 gap-4">
          {[
            { ico: "✉", label: "Email",     val: "info@dessystems.io" },
            { ico: "📞", label: "Phone",     val: "+31 6 82545600" },
            { ico: "⏱", label: "Response",  val: "Within 1 business day" },
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

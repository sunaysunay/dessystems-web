import { NextRequest, NextResponse } from "next/server"
import nodemailer from "nodemailer"
import { createClient } from "@supabase/supabase-js"
import { locales, routing, type Locale } from "@/src/i18n/routing"

type EmailStrings = {
  replySubject: string
  greeting: string
  bodyIntro: string
  directContact: string
  referenceId: string
  footerTagline: string
  footerPoweredBy: string
  topics: Record<string, string>
}

async function getEmailStrings(locale: Locale): Promise<EmailStrings> {
  const en = (await import("@/messages/en.json")).default.Email as EmailStrings
  if (locale === routing.defaultLocale) return en
  try {
    const loc = (await import(`@/messages/${locale}.json`)).default.Email as Partial<EmailStrings> | undefined
    return { ...en, ...loc, topics: { ...en.topics, ...(loc?.topics ?? {}) } }
  } catch {
    return en
  }
}

function fill(template: string, vars: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "")
}

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Maps contact topic → mail_identity code
const TOPIC_TO_IDENTITY: Record<string, string> = {
  erp:        "DESSI_ERP",        // sales@dessystems.io
  mes:        "DESSI_ERP",        // sales@dessystems.io
  automation: "DESSI_ERP",        // sales@dessystems.io
  freelance:  "DESSI_FREELANCE",  // sunay@dessystems.io
  platform:   "DESSI_INFO",       // info@dessystems.io
}

async function getIdentity(code: string) {
  const { data } = await sb
    .from("mail_identity")
    .select("email, name, bcc_email, reply_to")
    .eq("code", code)
    .eq("tenant_id", 500)
    .single()
  return data
}

async function getNextLeadId(): Promise<string> {
  const { data, error } = await sb.rpc("next_counter_id", {
    p_tenant_id: 500,
    p_object: "lead",
  })
  if (error || !data) {
    console.error("[dessi counter]", error?.message ?? "no counter returned")
    return ""
  }
  return data as string
}

export async function POST(req: NextRequest) {
  try {
    const { firstName, lastName, email, phone, company, message, topic, locale: rawLocale } = await req.json()
    const locale: Locale = (locales as readonly string[]).includes(rawLocale) ? rawLocale : routing.defaultLocale
    if (!email || !message || !firstName) {
      return NextResponse.json({ error: "Required fields missing" }, { status: 400 })
    }

    const identityCode = TOPIC_TO_IDENTITY[topic] ?? "DESSI_INFO"
    const identity = await getIdentity(identityCode)
    const fromEmail = identity?.email ?? "info@dessystems.io"
    const fromName  = identity?.name  ?? "DES Systems"
    const bccEmail  = identity?.bcc_email ?? null
    const replyTo   = identity?.reply_to ?? fromEmail
    const name      = `${firstName} ${lastName}`.trim()
    const LABELS: Record<string,string> = { erp:"ERP Consulting", mes:"MES Integration", automation:"Automation", freelance:"Freelance / Project", platform:"DES Platform" }
    const topicLabel: string = LABELS[topic as string] ?? (topic as string)

    // Fetch next lead ID from SY013 counter (atomic increment)
    const internalId = await getNextLeadId()

    // Save lead to Supabase tenant 500
    const { error: leadError } = await sb.from("lead").insert({
      tenant_id: 500,
      ref_code: internalId || null,
      name, email,
      phone: phone || null,
      message: `[${topicLabel}]${company ? ` | Company: ${company}` : ""}\n\n${message}`,
      status: "new",
      locale,
    })
    if (leadError) console.warn("[dessi lead]", leadError.message)

    // SMTP via Zoho — send FROM the correct @dessystems.io alias
    const transporter = nodemailer.createTransport({
      host:   process.env.SMTP_HOST,
      port:   Number(process.env.SMTP_PORT ?? 587),
      secure: false,
      auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })

    // 1. Admin notification → correct inbox
    const adminSubject = `[#${internalId}] [dessystems.io] ${topicLabel} — ${name}`
    let adminStatus: 'sent' | 'failed' = 'sent'
    let adminMessageId: string | undefined
    try {
      const adminInfo = await transporter.sendMail({
        from:    `"${fromName}" <${fromEmail}>`,
        to:      fromEmail,
        bcc:     bccEmail ?? undefined,
        replyTo: email,
        subject: adminSubject,
        html: `<div style="font-family:Arial,sans-serif;max-width:580px;padding:24px">
          <div style="background:#080c14;padding:16px 24px;border-radius:8px 8px 0 0;position:relative">
            <div style="color:#fff;font-size:16px;font-weight:700">📩 New Inquiry — ${topicLabel}</div>
            <div style="color:rgba(255,255,255,0.4);font-size:11px;margin-top:2px">dessystems.io · Tenant 500 · Ref #${internalId} · via ${fromEmail}</div>
            <div style="position:absolute;top:8px;right:12px;font-size:9px;color:rgba(255,255,255,0.35);font-family:monospace">EM-WB01</div>
          </div>
          <div style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;padding:20px 24px">
            <table style="width:100%;font-size:13px;border-collapse:collapse">
              <tr><td style="color:#64748b;padding:6px 0;width:120px">Name</td><td style="font-weight:600;color:#0f172a">${name}</td></tr>
              <tr><td style="color:#64748b;padding:6px 0">Email</td><td><a href="mailto:${email}" style="color:#2563eb">${email}</a></td></tr>
              ${phone ? `<tr><td style="color:#64748b;padding:6px 0">Phone</td><td>${phone}</td></tr>` : ""}
              ${company ? `<tr><td style="color:#64748b;padding:6px 0">Company</td><td>${company}</td></tr>` : ""}
              <tr><td style="color:#64748b;padding:6px 0">Topic</td><td style="color:#2563eb;font-weight:600">${topicLabel}</td></tr>
            </table>
            <div style="margin-top:16px;padding:14px;background:#f8fafc;border-radius:8px;font-size:13px;color:#334155;line-height:1.6;white-space:pre-wrap">${message}</div>
            <div style="margin-top:12px;font-size:11px;color:#94a3b8">Received via dessystems.io · ${new Date().toLocaleString("en-GB")}</div>
          </div>
          <div style="background:#080c14;padding:10px 16px;border-radius:0 0 8px 8px;overflow:hidden">
            <span style="float:left;font-size:9px;color:rgba(255,255,255,0.35);font-family:monospace">EM-WB01</span>
            <span style="float:right;font-size:10px;color:rgba(255,255,255,0.5)">T500 · DES Business Operating Platform</span>
          </div>
        </div>`,
      })
      adminMessageId = adminInfo.messageId
    } catch (mailErr) {
      adminStatus = 'failed'
      console.error("[dessystems/contact] admin mail failed", mailErr)
    }

    // Log admin notification to bop_comm_history
    try {
      await sb.from("bop_comm_history").insert({
        tenant_id: 500, module: "contact_form", record_id: internalId || null,
        to_email: fromEmail, to_name: fromName, subject: adminSubject,
        status: adminStatus, provider_message_id: adminMessageId ?? null,
        sent_at: adminStatus === "sent" ? new Date().toISOString() : null,
      })
    } catch (logErr) {
      console.error("[dessystems/contact] comm_history log (admin) failed", logErr)
    }

    // 2. Auto-responder to visitor (from noreply) — localized to the visitor's site language
    const noreply = await getIdentity("DESSI_NOREPLY")
    const em = await getEmailStrings(locale)
    const localizedTopic = em.topics[topic as string] ?? topicLabel
    const replySubject = fill(em.replySubject, { id: internalId })
    let replyStatus: 'sent' | 'failed' = 'sent'
    let replyMessageId: string | undefined
    try {
      const replyInfo = await transporter.sendMail({
        from:    `"DES Systems" <${noreply?.email ?? "noreply@dessystems.io"}>`,
        to:      email,
        replyTo: replyTo,
        subject: replySubject,
        html: `<div style="font-family:Arial,sans-serif;max-width:560px;padding:24px">
          <div style="background:linear-gradient(90deg,#080c14,#1e3a8a);padding:24px 32px;border-radius:8px 8px 0 0;position:relative">
            <div style="color:#fff;font-size:18px;font-weight:700">DES <span style="color:#3b82f6">SYSTEMS</span></div>
            <div style="color:rgba(255,255,255,0.4);font-size:10px;letter-spacing:0.1em;text-transform:uppercase;margin-top:2px">Enterprise Solutions · dessystems.io</div>
            <div style="position:absolute;top:12px;right:16px;font-size:9px;color:rgba(255,255,255,0.35);font-family:monospace">EM-WB02</div>
          </div>
          <div style="border:1px solid #e2e8f0;border-top:none;padding:24px 32px">
            <p style="font-size:14px;color:#0f172a;font-weight:600;margin-bottom:8px">${fill(em.greeting, { name: firstName })}</p>
            <p style="font-size:13px;color:#475569;line-height:1.7;margin-bottom:12px">
              ${fill(em.bodyIntro, { topic: `<strong>${localizedTopic}</strong>` })}
            </p>
            <p style="font-size:13px;color:#475569;line-height:1.7;margin-bottom:12px">
              ${em.directContact} <a href="mailto:${replyTo}" style="color:#2563eb">${replyTo}</a>
            </p>
            <div style="margin-bottom:20px;padding:10px 14px;background:#f8fafc;border-radius:8px;font-size:12px;color:#64748b">
              ${em.referenceId} <strong style="color:#0f172a">#${internalId}</strong>
            </div>
            <div style="border-top:1px solid #e2e8f0;padding-top:16px;font-size:11px;color:#94a3b8">
              DES Systems · dessystems.io · ${em.footerTagline}<br>
              ${em.footerPoweredBy}
            </div>
          </div>
          <div style="background:linear-gradient(90deg,#080c14,#1e3a8a);padding:10px 16px;border-radius:0 0 8px 8px;overflow:hidden">
            <span style="float:left;font-size:9px;color:rgba(255,255,255,0.35);font-family:monospace">EM-WB02</span>
            <span style="float:right;font-size:10px;color:rgba(255,255,255,0.5)">T500 · DES Business Operating Platform</span>
          </div>
        </div>`,
      })
      replyMessageId = replyInfo.messageId
    } catch (mailErr) {
      replyStatus = 'failed'
      console.error("[dessystems/contact] auto-reply mail failed", mailErr)
    }

    // Log auto-reply to bop_comm_history
    try {
      await sb.from("bop_comm_history").insert({
        tenant_id: 500, module: "contact_form", record_id: internalId || null,
        to_email: email, to_name: name, subject: replySubject,
        status: replyStatus, provider_message_id: replyMessageId ?? null,
        sent_at: replyStatus === "sent" ? new Date().toISOString() : null,
      })
    } catch (logErr) {
      console.error("[dessystems/contact] comm_history log (auto-reply) failed", logErr)
    }

    return NextResponse.json({ ok: true, leadId: internalId })
  } catch (err: unknown) {
    console.error("[dessystems/contact]", err)
    return NextResponse.json({ error: "Send failed" }, { status: 500 })
  }
}

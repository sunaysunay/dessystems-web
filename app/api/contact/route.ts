import { NextRequest, NextResponse } from "next/server"
import nodemailer from "nodemailer"
import { createClient } from "@supabase/supabase-js"

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

export async function POST(req: NextRequest) {
  try {
    const { firstName, lastName, email, phone, company, message, topic } = await req.json()
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
    const topicLabel = { erp:"ERP Consulting", mes:"MES Integration", automation:"Automation", freelance:"Freelance / Project", platform:"DES Platform" }[topic] ?? topic

    // Save lead to Supabase tenant 500
    await sb.from("lead").insert({
      tenant_id: 500,
      name, email,
      phone: phone || null,
      message: `[${topicLabel}]${company ? ` | Company: ${company}` : ""}\n\n${message}`,
      status: "new",
      locale: "en",
    }).then(({ error }) => { if (error) console.warn("[dessi lead]", error.message) })

    // SMTP via Zoho — send FROM the correct @dessystems.io alias
    const transporter = nodemailer.createTransport({
      host:   process.env.SMTP_HOST,
      port:   Number(process.env.SMTP_PORT ?? 587),
      secure: false,
      auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })

    // 1. Admin notification → correct inbox
    await transporter.sendMail({
      from:    `"${fromName}" <${fromEmail}>`,
      to:      fromEmail,
      bcc:     bccEmail ?? undefined,
      replyTo: email,
      subject: `[dessystems.io] ${topicLabel} — ${name}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:580px;padding:24px">
        <div style="background:#080c14;padding:16px 24px;border-radius:8px 8px 0 0">
          <div style="color:#fff;font-size:16px;font-weight:700">📩 New Inquiry — ${topicLabel}</div>
          <div style="color:rgba(255,255,255,0.4);font-size:11px;margin-top:2px">dessystems.io · Tenant 500 · via ${fromEmail}</div>
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
          <div style="margin-top:12px;font-size:11px;color:#94a3b8">Received via dessystems.io · ${new Date().toLocaleString("en-NL")}</div>
        </div>
      </div>`,
    })

    // 2. Auto-responder to visitor (from noreply)
    const noreply = await getIdentity("DESSI_NOREPLY")
    await transporter.sendMail({
      from:    `"DES Systems" <${noreply?.email ?? "noreply@dessystems.io"}>`,
      to:      email,
      replyTo: replyTo,
      subject: `Thank you for your inquiry — DES Systems`,
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;padding:24px">
        <div style="background:linear-gradient(90deg,#080c14,#1e3a8a);padding:24px 32px;border-radius:8px 8px 0 0">
          <div style="color:#fff;font-size:18px;font-weight:700">DES <span style="color:#3b82f6">SYSTEMS</span></div>
          <div style="color:rgba(255,255,255,0.4);font-size:10px;letter-spacing:0.1em;text-transform:uppercase;margin-top:2px">Enterprise Solutions · dessystems.io</div>
        </div>
        <div style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;padding:24px 32px">
          <p style="font-size:14px;color:#0f172a;font-weight:600;margin-bottom:8px">Dear ${firstName},</p>
          <p style="font-size:13px;color:#475569;line-height:1.7;margin-bottom:12px">
            Thank you for reaching out about <strong>${topicLabel}</strong>. We have received your inquiry and will respond within one business day.
          </p>
          <p style="font-size:13px;color:#475569;line-height:1.7;margin-bottom:20px">
            For direct contact: <a href="mailto:${replyTo}" style="color:#2563eb">${replyTo}</a>
          </p>
          <div style="border-top:1px solid #e2e8f0;padding-top:16px;font-size:11px;color:#94a3b8">
            DES Systems · dessystems.io · Enterprise Solutions &amp; Digital Transformation<br>
            Powered by DES Business Operating Platform
          </div>
        </div>
      </div>`,
    })

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    console.error("[dessystems/contact]", err)
    return NextResponse.json({ error: "Send failed" }, { status: 500 })
  }
}

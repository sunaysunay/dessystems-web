import { NextRequest, NextResponse } from "next/server"
import nodemailer from "nodemailer"
import { createClient } from "@supabase/supabase-js"

const TOPICS: Record<string, { label: string; adminEmail: string }> = {
  erp:        { label: "ERP Consulting",              adminEmail: "info@dessystems.io" },
  mes:        { label: "MES Integration",             adminEmail: "info@dessystems.io" },
  automation: { label: "Automation",                  adminEmail: "info@dessystems.io" },
  freelance:  { label: "Freelance / Project",         adminEmail: "info@dessystems.io" },
  platform:   { label: "DES Platform",                adminEmail: "info@dessystems.io" },
}

export async function POST(req: NextRequest) {
  try {
    const { firstName, lastName, email, phone, company, message, topic } = await req.json()
    if (!email || !message || !firstName) {
      return NextResponse.json({ error: "Required fields missing" }, { status: 400 })
    }

    const route  = TOPICS[topic] ?? TOPICS.erp
    const name   = `${firstName} ${lastName}`.trim()

    // 1. Save lead to Supabase under Tenant 500
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    await sb.from("lead").insert({
      tenant_id: 500,
      name,
      email,
      phone: phone || null,
      message: `[${route.label}]${company ? ` | Company: ${company}` : ""}\n\n${message}`,
      status: "new",
      locale: "en",
    }).then(({ error }) => {
      if (error) console.warn("[dessystems lead]", error.message)
    })

    const transporter = nodemailer.createTransport({
      host:   process.env.SMTP_HOST,
      port:   Number(process.env.SMTP_PORT ?? 587),
      secure: false,
      auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })

    // 2. Admin notification
    await transporter.sendMail({
      from:    `"DES Systems" <${process.env.SMTP_USER}>`,
      to:      route.adminEmail,
      replyTo: email,
      subject: `[dessystems.io] New inquiry — ${route.label} — ${name}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:580px;padding:24px">
        <div style="background:#080c14;padding:18px 24px;border-radius:8px 8px 0 0">
          <div style="color:#fff;font-size:16px;font-weight:700">📩 New Inquiry — ${route.label}</div>
          <div style="color:rgba(255,255,255,0.5);font-size:11px;margin-top:2px">dessystems.io · Tenant 500</div>
        </div>
        <div style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;padding:20px 24px">
          <table style="width:100%;font-size:13px;border-collapse:collapse">
            <tr><td style="color:#64748b;padding:6px 0;width:120px">Name</td><td style="font-weight:600;color:#0f172a">${name}</td></tr>
            <tr><td style="color:#64748b;padding:6px 0">Email</td><td><a href="mailto:${email}" style="color:#2563eb">${email}</a></td></tr>
            ${phone ? `<tr><td style="color:#64748b;padding:6px 0">Phone</td><td>${phone}</td></tr>` : ""}
            ${company ? `<tr><td style="color:#64748b;padding:6px 0">Company</td><td>${company}</td></tr>` : ""}
            <tr><td style="color:#64748b;padding:6px 0">Topic</td><td style="color:#2563eb;font-weight:600">${route.label}</td></tr>
          </table>
          <div style="margin-top:16px;padding:14px;background:#f8fafc;border-radius:8px;font-size:13px;color:#334155;line-height:1.6;white-space:pre-wrap">${message}</div>
          <div style="margin-top:12px;font-size:11px;color:#94a3b8">Received via dessystems.io</div>
        </div>
      </div>`,
    })

    // 3. Auto-responder to visitor
    await transporter.sendMail({
      from:    `"DES Systems" <${process.env.SMTP_USER}>`,
      to:      email,
      subject: `Thank you for your inquiry — DES Systems`,
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;padding:24px">
        <div style="background:linear-gradient(90deg,#080c14,#1e3a8a);padding:24px 32px;border-radius:8px 8px 0 0">
          <div style="color:#fff;font-size:18px;font-weight:700">DES <span style="color:#3b82f6">SYSTEMS</span></div>
          <div style="color:rgba(255,255,255,0.5);font-size:10px;letter-spacing:0.1em;text-transform:uppercase;margin-top:2px">Enterprise Solutions</div>
        </div>
        <div style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;padding:24px 32px">
          <p style="font-size:14px;color:#0f172a;font-weight:600;margin-bottom:8px">Dear ${firstName},</p>
          <p style="font-size:13px;color:#475569;line-height:1.7;margin-bottom:12px">
            Thank you for reaching out about <strong>${route.label}</strong>. We have received your inquiry and will respond within one business day.
          </p>
          <p style="font-size:13px;color:#475569;line-height:1.7;margin-bottom:20px">
            If your matter is urgent, you can reach us directly at <a href="mailto:info@dessystems.io" style="color:#2563eb">info@dessystems.io</a>.
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

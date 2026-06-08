// dessystems.io catch-all redirect route
// Handles: dessystems.io/4XyZ9 → target URL + notifications
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import nodemailer from "nodemailer"

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const FLASK_MONITOR = "http://localhost:5055/api/hit"
const ADMIN_EMAIL   = process.env.SMTP_USER ?? "info@descampers.com"

function getDeviceType(ua: string): string {
  if (/Mobile|Android|iPhone/i.test(ua)) return "mobile"
  if (/iPad|Tablet/i.test(ua)) return "tablet"
  return "desktop"
}

async function notifyAsync(link: Record<string, unknown>, req: NextRequest) {
  const ua      = req.headers.get("user-agent") ?? ""
  const country = req.headers.get("cf-ipcountry") ?? ""
  const referrer= req.headers.get("referer") ?? ""
  const device  = getDeviceType(ua)
  const title   = (link.title as string) || (link.short_code as string)

  // 1. Increment click count + log to redirect_clicks
  await Promise.all([
    sb.from("short_links").update({
      click_count: ((link.click_count as number) || 0) + 1,
      last_clicked_at: new Date().toISOString(),
    }).eq("id", link.id as string),

    sb.from("redirect_clicks").insert({
      short_link_id: link.id,
      country: country || null,
      device_type: device,
      referrer: referrer || null,
      user_agent: ua.slice(0, 200),
    }),

    // 2. Admin notification in DB (shows as bell popup)
    sb.from("admin_notifications").insert({
      tenant_id: link.tenant_id ?? 200,
      type: "redirect_click",
      title: `🔗 Link clicked: ${title}`,
      body: `${link.short_code} → ${(link.target_url as string).slice(0, 80)}`,
      meta: {
        short_code: link.short_code,
        domain: link.domain,
        target_url: link.target_url,
        country, device, referrer,
        related_entity_type: link.related_entity_type,
        related_entity_id: link.related_entity_id,
      },
    }),
  ])

  // 3. Notify Flask monitor (fire & forget)
  fetch(FLASK_MONITOR, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      short_code: link.short_code,
      domain: link.domain,
      title,
      country, device,
      target_url: link.target_url,
      ts: new Date().toISOString(),
    }),
    signal: AbortSignal.timeout(2000),
  }).catch(() => {})

  // 4. Email notification (throttled: skip if clicked < 30 min ago)
  try {
    const lastClick = link.last_clicked_at as string | null
    const minutesSinceLast = lastClick
      ? (Date.now() - new Date(lastClick).getTime()) / 60000
      : Infinity
    if (minutesSinceLast > 30) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: false,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      })
      await transporter.sendMail({
        from: `"DES Short Links" <${ADMIN_EMAIL}>`,
        to: ADMIN_EMAIL,
        subject: `🔗 Link clicked: ${title} — DES`,
        html: `<div style="font-family:Arial,sans-serif;max-width:500px;padding:20px">
          <div style="background:#0f172a;padding:16px 20px;border-radius:8px;color:#fff;margin-bottom:16px">
            <strong>🔗 Short Link Clicked</strong>
          </div>
          <table style="width:100%;font-size:13px;border-collapse:collapse">
            <tr><td style="color:#64748b;padding:6px 0;width:140px">Short URL</td><td><strong>${link.domain}/${link.short_code}</strong></td></tr>
            <tr><td style="color:#64748b;padding:6px 0">Target</td><td style="word-break:break-all">${link.target_url}</td></tr>
            <tr><td style="color:#64748b;padding:6px 0">Title</td><td>${title}</td></tr>
            <tr><td style="color:#64748b;padding:6px 0">Country</td><td>${country || "—"}</td></tr>
            <tr><td style="color:#64748b;padding:6px 0">Device</td><td>${device}</td></tr>
            <tr><td style="color:#64748b;padding:6px 0">Referrer</td><td>${referrer || "Direct"}</td></tr>
            ${link.related_entity_id ? `<tr><td style="color:#64748b;padding:6px 0">Entity</td><td>${link.related_entity_type} #${link.related_entity_id}</td></tr>` : ""}
          </table>
          <div style="margin-top:16px;font-size:11px;color:#94a3b8">
            DES Business Operating Platform · Short Links · ${new Date().toLocaleString("en-NL")}
          </div>
        </div>`,
      })
    }
  } catch (e) {
    console.warn("[redirect] email failed:", e)
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params
  const short_code = slug?.[0]

  // Render the themed 404 instead of silently bouncing unknown / unmapped
  // URLs back to the homepage. "__nf__" is a single path segment that can
  // never be a valid locale, so requesting it triggers the [locale] layout's
  // notFound(), which renders the themed not-found page. We fetch that
  // rendered HTML internally and serve it (with a 404 status) at the
  // original URL — NextResponse.rewrite() isn't supported in route handlers.
  const renderNotFound = async () => {
    try {
      const res = await fetch(new URL('/__nf__', req.url), {
        headers: { cookie: req.headers.get('cookie') ?? '' },
      })
      const html = await res.text()
      return new NextResponse(html, {
        status: 404,
        headers: { 'content-type': 'text/html; charset=utf-8' },
      })
    } catch {
      return new NextResponse('Not Found', { status: 404 })
    }
  }

  if (!short_code) return renderNotFound()

  const { data: link } = await sb
    .from("short_links")
    .select("*")
    .eq("short_code", short_code)
    .eq("is_active", true)
    .maybeSingle()

  if (!link) {
    return renderNotFound()
  }

  // Check expiry
  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return renderNotFound()
  }

  // Immediate redirect
  const target = new URL(link.target_url)
  // Append UTM if set on link
  if (link.utm_source) target.searchParams.set("utm_source", link.utm_source)
  if (link.utm_medium) target.searchParams.set("utm_medium", link.utm_medium)
  if (link.utm_campaign) target.searchParams.set("utm_campaign", link.utm_campaign)

  // Background notifications (don't await — redirect immediately)
  notifyAsync(link, req)

  return NextResponse.redirect(target.toString(), { status: 302 })
}

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
  const renderNotFound = () => {
    // Branded 404 returned inline. We deliberately do NOT self-fetch an
    // internal URL here: every unmapped path is served by THIS catch-all
    // route, so any internal fetch (/__nf__, /en/__nf__, ...) re-enters this
    // handler and recurses infinitely (connection pile-up + timeouts).
    const html = "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>404 — Not Found | DES Systems</title><link href=\"https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Mono:wght@300;400;500&family=DM+Sans:wght@300;400;500&display=swap\" rel=\"stylesheet\"><style>\n*,*::before,*::after{box-sizing:border-box}\nbody{margin:0}\n.nf-wrap{--nf-bg:#0a0a0b;--nf-surface:#111114;--nf-border:#1e1e24;--nf-accent:#c8f03a;--nf-accent2:#3affd8;--nf-muted:#4a4a56;--nf-text:#e8e8ec;--nf-text-dim:#7a7a8a;position:fixed;inset:0;min-height:100vh;height:100vh;background:var(--nf-bg);color:var(--nf-text);font-family:'DM Sans',sans-serif;overflow-y:auto;overflow-x:hidden}\n.nf-wrap::before{content:'';position:fixed;inset:0;background-image:linear-gradient(var(--nf-border) 1px,transparent 1px),linear-gradient(90deg,var(--nf-border) 1px,transparent 1px);background-size:60px 60px;opacity:.5;pointer-events:none;z-index:0}\n.nf-wrap::after{content:'';position:fixed;top:50%;left:50%;transform:translate(-50%,-60%);width:700px;height:700px;background:radial-gradient(ellipse,rgba(200,240,58,.06) 0%,transparent 70%);pointer-events:none;z-index:0}\n.nf-inner{position:relative;z-index:1;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:6rem 2rem 8rem}\n.nf-topbar{position:fixed;top:0;left:0;right:0;display:flex;align-items:center;justify-content:space-between;padding:1.25rem 2.5rem;border-bottom:1px solid var(--nf-border);background:rgba(10,10,11,.8);backdrop-filter:blur(12px);z-index:10}\n.nf-logo{font-family:'Bebas Neue',sans-serif;font-size:1.5rem;letter-spacing:.12em;color:var(--nf-text)}\n.nf-logo span{color:var(--nf-accent)}\n.nf-status{display:flex;align-items:center;gap:.5rem;font-family:'DM Mono',monospace;font-size:.7rem;color:var(--nf-text-dim);letter-spacing:.08em}\n.nf-dot{width:6px;height:6px;border-radius:50%;background:#ff4545;animation:nf-pulse 2s ease-in-out infinite}\n@keyframes nf-pulse{0%,100%{opacity:1}50%{opacity:.3}}\n.nf-main{display:flex;flex-direction:column;align-items:flex-start;max-width:720px;width:100%;animation:nf-fadeUp .8s cubic-bezier(.16,1,.3,1) both}\n@keyframes nf-fadeUp{from{opacity:0;transform:translateY(32px)}to{opacity:1;transform:translateY(0)}}\n.nf-tag{font-family:'DM Mono',monospace;font-size:.7rem;letter-spacing:.14em;color:var(--nf-accent);background:rgba(200,240,58,.08);border:1px solid rgba(200,240,58,.2);padding:.25rem .75rem;border-radius:2px;margin-bottom:2rem}\n.nf-giant{font-family:'Bebas Neue',sans-serif;font-size:clamp(9rem,22vw,18rem);line-height:.85;letter-spacing:-.02em;color:transparent;-webkit-text-stroke:1px var(--nf-border);position:relative;user-select:none}\n.nf-giant::after{content:'404';position:absolute;inset:0;background:linear-gradient(135deg,var(--nf-text) 0%,var(--nf-muted) 100%);-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-stroke:0;clip-path:polygon(0 0,60% 0,40% 100%,0 100%)}\n.nf-headline{font-family:'DM Sans',sans-serif;font-size:clamp(1.4rem,3vw,2.2rem);font-weight:300;color:var(--nf-text);margin-top:1.5rem;letter-spacing:-.01em}\n.nf-headline strong{font-weight:500}\n.nf-divider{width:100%;height:1px;background:linear-gradient(90deg,var(--nf-accent) 0%,transparent 60%);margin:2rem 0}\n.nf-desc{font-size:.95rem;color:var(--nf-text-dim);line-height:1.7;max-width:480px}\n.nf-contact{display:flex;align-items:center;gap:.6rem;margin-top:1.5rem;padding:.85rem 1.1rem;border:1px solid rgba(200,240,58,.25);background:rgba(200,240,58,.06);border-radius:4px;font-family:'DM Mono',monospace;font-size:.8rem;color:var(--nf-text-dim);letter-spacing:.02em;flex-wrap:wrap}\n.nf-contact a{color:var(--nf-accent);text-decoration:none;font-weight:500;border-bottom:1px solid rgba(200,240,58,.35)}\n.nf-contact a:hover{color:#d9ff4a;border-color:#d9ff4a}\n.nf-actions{display:flex;gap:1rem;margin-top:2.5rem;flex-wrap:wrap}\n.nf-btn{display:inline-flex;align-items:center;gap:.5rem;font-family:'DM Mono',monospace;font-size:.75rem;letter-spacing:.1em;text-decoration:none;padding:.75rem 1.5rem;border-radius:2px;transition:all .2s ease;cursor:pointer;border:none}\n.nf-btn-primary{background:var(--nf-accent);color:#0a0a0b;font-weight:500}\n.nf-btn-primary:hover{background:#d9ff4a;transform:translateY(-1px);box-shadow:0 8px 24px rgba(200,240,58,.25)}\n.nf-btn-ghost{background:transparent;color:var(--nf-text-dim);border:1px solid var(--nf-border)}\n.nf-btn-ghost:hover{border-color:var(--nf-muted);color:var(--nf-text);transform:translateY(-1px)}\n.nf-trace{position:fixed;bottom:2rem;right:2.5rem;font-family:'DM Mono',monospace;font-size:.65rem;color:var(--nf-muted);letter-spacing:.08em;line-height:1.9;text-align:right}\n.nf-trace-line{display:block}.nf-trace-line .nf-key{color:var(--nf-text-dim)}.nf-trace-line .nf-val{color:var(--nf-accent2)}\n.nf-corner{position:fixed;bottom:0;left:0;width:220px;height:220px;border-top:1px solid var(--nf-border);border-right:1px solid var(--nf-border);pointer-events:none;opacity:.4}\n.nf-corner::after{content:'';position:absolute;bottom:40px;left:40px;width:6px;height:6px;border-radius:50%;background:var(--nf-accent);box-shadow:0 0 12px var(--nf-accent)}\n@media(max-width:640px){.nf-trace{display:none}.nf-corner{display:none}.nf-topbar{padding:1rem 1.25rem}}\n</style></head><body><div class=\"nf-wrap\">\n<nav class=\"nf-topbar\"><div class=\"nf-logo\">DES<span>.</span>SYSTEMS</div><div class=\"nf-status\"><span class=\"nf-dot\"></span>ERROR_STATE / HTTP 404</div></nav>\n<div class=\"nf-inner\"><div class=\"nf-main\">\n<span class=\"nf-tag\">HTTP / 404 NOT_FOUND</span>\n<div class=\"nf-giant\">404</div>\n<h1 class=\"nf-headline\">The page you&rsquo;re looking for<br><strong>doesn&rsquo;t exist.</strong></h1>\n<div class=\"nf-divider\"></div>\n<p class=\"nf-desc\">The requested resource could not be located on this server. It may have been moved, deleted, or the URL might be incorrect. Navigate back or return to the homepage to continue.</p>\n<div class=\"nf-contact\"><span>Need help finding something?</span><a href=\"mailto:info@dessystems.io\">info@dessystems.io</a></div>\n<div class=\"nf-actions\"><a href=\"/\" class=\"nf-btn nf-btn-primary\">&#8624; RETURN HOME</a><button onclick=\"history.back()\" class=\"nf-btn nf-btn-ghost\">&#8592; GO BACK</button></div>\n</div></div>\n<div class=\"nf-trace\"><span class=\"nf-trace-line\"><span class=\"nf-key\">STATUS&nbsp;&nbsp;</span> <span class=\"nf-val\">404</span></span><span class=\"nf-trace-line\"><span class=\"nf-key\">CODE&nbsp;&nbsp;&nbsp;&nbsp;</span> <span class=\"nf-val\">NOT_FOUND</span></span><span class=\"nf-trace-line\"><span class=\"nf-key\">PATH&nbsp;&nbsp;&nbsp;&nbsp;</span> <span class=\"nf-val\" id=\"nfpath\">/unknown</span></span><span class=\"nf-trace-line\"><span class=\"nf-key\">TIME&nbsp;&nbsp;&nbsp;&nbsp;</span> <span class=\"nf-val\" id=\"nftime\">-</span></span></div>\n<div class=\"nf-corner\"></div>\n</div><script>document.getElementById('nfpath').textContent=location.pathname||'/unknown';document.getElementById('nftime').textContent=new Date().toISOString().replace('T',' ').split('.')[0]+'Z';</script></body></html>"
    return new NextResponse(html, {
      status: 404,
      headers: { "content-type": "text/html; charset=utf-8" },
    })
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

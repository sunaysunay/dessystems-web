import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const TENANT_ID = 500  // dessystems.io

let geoip: any = null
try { geoip = require("geoip-lite") } catch {}
function geoLookup(ip: string | null) {
  if (!ip || !geoip) return { country: null, city: null, region: null, timezone: null, lat: null, lon: null }
  try {
    const g = geoip.lookup(ip.replace(/^::ffff:/i, ""))
    if (!g) return { country: null, city: null, region: null, timezone: null, lat: null, lon: null }
    return {
      country: g.country || null,
      city: g.city || null,
      region: g.region || null,
      timezone: g.timezone || null,
      lat: g.ll?.[0] ?? null,
      lon: g.ll?.[1] ?? null,
    }
  } catch { return { country: null, city: null, region: null, timezone: null, lat: null, lon: null } }
}

function parseDevice(ua: string | null): string {
  if (!ua) return "desktop"
  const u = ua.toLowerCase()
  if (u.includes("ipad") || (u.includes("android") && !u.includes("mobile"))) return "tablet"
  if (u.includes("mobile") || u.includes("iphone")) return "mobile"
  return "desktop"
}

function parseOs(ua: string | null): string {
  if (!ua) return "unknown"
  const u = ua.toLowerCase()
  if (u.includes("windows")) return "Windows"
  if (u.includes("macintosh") || u.includes("mac os")) return "macOS"
  if (u.includes("android")) return "Android"
  if (u.includes("iphone") || u.includes("ipad")) return "iOS"
  if (u.includes("linux")) return "Linux"
  return "unknown"
}

function parseBrowser(ua: string | null): string | null {
  if (!ua) return null
  const u = ua.toLowerCase()
  if (u.includes("edg/") || u.includes("edga/") || u.includes("edgios/")) return "Edge"
  if (u.includes("opr/") || u.includes("opera")) return "Opera"
  if (u.includes("vivaldi")) return "Vivaldi"
  if (u.includes("brave")) return "Brave"
  if (u.includes("samsungbrowser")) return "Samsung Browser"
  if (u.includes("ucbrowser")) return "UC Browser"
  if (u.includes("firefox") || u.includes("fxios")) return "Firefox"
  if (u.includes("crios")) return "Chrome"
  if (u.includes("chrome") && !u.includes("chromium")) return "Chrome"
  if (u.includes("chromium")) return "Chromium"
  if (u.includes("safari") && !u.includes("chrome")) return "Safari"
  return null
}

function extractUtm(page: string | null, referrerUrl: string | null): { utm_source: string | null; utm_medium: string | null; utm_campaign: string | null } {
  const result = { utm_source: null as string | null, utm_medium: null as string | null, utm_campaign: null as string | null }
  const urls = [page, referrerUrl].filter(Boolean) as string[]
  for (const raw of urls) {
    try {
      const url = new URL(raw, "http://x")
      const s = url.searchParams.get("utm_source")
      const m = url.searchParams.get("utm_medium")
      const c = url.searchParams.get("utm_campaign")
      if (s) result.utm_source = s
      if (m) result.utm_medium = m
      if (c) result.utm_campaign = c
      if (result.utm_source) break
    } catch {}
  }
  return result
}

function extractLocale(page: string | null): string | null {
  if (!page) return null
  const m = page.match(/^\/([a-z]{2})(?:\/|$)/)
  return m ? m[1] : null
}

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || ""
    let body: any
    try {
      body = contentType.includes("application/json")
        ? await request.json()
        : JSON.parse(await request.text())
    } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }) }

    const { event_type, page, session_id, metadata, device_type, browser_language, screen_resolution, referrer, listing_id, listing_title, listing_slug } = body
    if (!event_type) return NextResponse.json({ error: "event_type required" }, { status: 400 })

    const ip =
      request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") || null

    const ua = request.headers.get("user-agent")
    const geo = geoLookup(ip)
    const cfCountry = request.headers.get("cf-ipcountry") || geo.country
    const cfCity = request.headers.get("cf-ipcity") || geo.city
    const cfRegion = request.headers.get("cf-region") || geo.region
    const cfTimezone = request.headers.get("cf-timezone") || geo.timezone
    const resolvedDevice = device_type || parseDevice(ua)
    const resolvedOs = parseOs(ua)
    const resolvedBrowser = parseBrowser(ua)
    const resolvedReferrer = referrer || request.headers.get("referer") || null
    const resolvedLocale = extractLocale(page)
    const utm = extractUtm(page, resolvedReferrer)

    const supabase = getAdmin()

    const { error } = await supabase.from("dm_activity_log").insert({
      tenant_id: TENANT_ID,
      event_type,
      page: page || null,
      session_id: session_id || null,
      ip_address: ip,
      user_agent: ua,
      country: cfCountry,
      region: cfRegion,
      city: cfCity,
      latitude: geo.lat,
      longitude: geo.lon,
      timezone: cfTimezone,
      locale: resolvedLocale,
      device_type: resolvedDevice,
      os_platform: resolvedOs,
      browser_language: browser_language || request.headers.get("accept-language")?.split(",")[0] || null,
      screen_resolution: screen_resolution || null,
      referrer: resolvedReferrer,
      listing_id: listing_id || null,
      listing_title: listing_title || null,
      listing_slug: listing_slug || null,
      metadata: metadata || {},
    })

    if (error) {
      console.error("[dessystems/api/log]", error)
      return NextResponse.json({ error: "Failed to log" }, { status: 500 })
    }

    if (session_id) {
      const now = new Date().toISOString()
      void (async () => {
        try {
          const { error: insertErr } = await supabase.from("dm_activity_sessions").insert({
            tenant_id: TENANT_ID,
            session_id,
            started_at: now,
            ended_at: now,
            entry_page: page || null,
            exit_page: page || null,
            page_count: 1,
            is_bounce: true,
            event_types: event_type ? [event_type] : [],
            country: cfCountry || null,
            country_code: cfCountry || null,
            region: cfRegion || null,
            city: cfCity || null,
            device_type: resolvedDevice,
            os_platform: resolvedOs,
            browser: resolvedBrowser,
            user_agent: ua || null,
            referrer: resolvedReferrer,
            utm_source: utm.utm_source,
            utm_medium: utm.utm_medium,
            utm_campaign: utm.utm_campaign,
          })

          if (insertErr?.code === "23505") {
            const { data: existing } = await supabase
              .from("dm_activity_sessions")
              .select("*")
              .eq("session_id", session_id)
              .single()

            const newCount = (existing?.page_count || 1) + 1
            const existingTypes: string[] = existing?.event_types || []
            const newTypes = event_type && !existingTypes.includes(event_type)
              ? [...existingTypes, event_type]
              : existingTypes

            const startedAt = existing?.started_at ? new Date(existing.started_at).getTime() : null
            const durationSec = startedAt ? Math.round((Date.now() - startedAt) / 1000) : null

            const updateData: any = {
              ended_at: now,
              exit_page: page || existing?.exit_page || null,
              page_count: newCount,
              is_bounce: newCount <= 1,
              event_types: newTypes,
              duration_sec: durationSec,
            }
            if (!existing?.country && cfCountry) updateData.country = cfCountry
            if (!existing?.country_code && cfCountry) updateData.country_code = cfCountry
            if (!existing?.region && cfRegion) updateData.region = cfRegion
            if (!existing?.city && cfCity) updateData.city = cfCity
            if (!existing?.browser && resolvedBrowser) updateData.browser = resolvedBrowser
            if (!existing?.referrer && resolvedReferrer) updateData.referrer = resolvedReferrer
            if (!existing?.user_agent && ua) updateData.user_agent = ua
            if (!existing?.utm_source && utm.utm_source) updateData.utm_source = utm.utm_source
            if (!existing?.utm_medium && utm.utm_medium) updateData.utm_medium = utm.utm_medium
            if (!existing?.utm_campaign && utm.utm_campaign) updateData.utm_campaign = utm.utm_campaign

            await supabase.from("dm_activity_sessions").update(updateData).eq("session_id", session_id)
          } else if (insertErr) {
            console.error("[dessystems] dm_activity_sessions insert:", insertErr.message)
          }
        } catch (dbErr) {
          console.error("[dessystems] dm_activity_sessions error:", dbErr)
        }
      })()
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[dessystems/api/log]", err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

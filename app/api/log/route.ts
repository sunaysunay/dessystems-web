import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const TENANT_ID = 500  // desmobil.com

let geoip: any = null
try { geoip = require("geoip-lite") } catch {}
function geoLookup(ip: string | null) {
  if (!ip || !geoip) return { country: null, city: null, region: null, timezone: null }
  try {
    const g = geoip.lookup(ip.replace(/^::ffff:/i, ""))
    return g ? { country: g.country || null, city: g.city || null, region: g.region || null, timezone: g.timezone || null } : { country: null, city: null, region: null, timezone: null }
  } catch { return { country: null, city: null, region: null, timezone: null } }
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
    const { country, city, region, timezone } = geoLookup(ip)
    const cfCountry = request.headers.get("cf-ipcountry") || country
    const resolvedDevice = device_type || parseDevice(ua)
    const resolvedOs = parseOs(ua)
    const resolvedReferrer = referrer || request.headers.get("referer") || null

    const supabase = getAdmin()

    // Insert raw event
    const { error } = await supabase.from("activity_log").insert({
      tenant_id: TENANT_ID,
      event_type,
      page: page || null,
      session_id: session_id || null,
      ip_address: ip,
      user_agent: ua,
      country: cfCountry,
      city,
      timezone,
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

    // Fire-and-forget session upsert into activity_log2
    if (session_id) {
      const now = new Date().toISOString()
      void (async () => {
        try {
          const { error: insertErr } = await supabase.from("activity_log2").insert({
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
            region: region || null,
            city: city || null,
            device_type: resolvedDevice,
            os_platform: resolvedOs,
            user_agent: ua || null,
            referrer: resolvedReferrer,
          })

          if (insertErr?.code === "23505") {
            // Session exists — update it
            const { data: existing } = await supabase
              .from("activity_log2")
              .select("*")
              .eq("session_id", session_id)
              .single()

            const newCount = (existing?.page_count || 1) + 1
            const existingTypes: string[] = existing?.event_types || []
            const newTypes = event_type && !existingTypes.includes(event_type)
              ? [...existingTypes, event_type]
              : existingTypes

            const updateData: any = {
              ended_at: now,
              exit_page: page || existing?.exit_page || null,
              page_count: newCount,
              is_bounce: newCount <= 1,
              event_types: newTypes,
            }
            if (!existing?.country && cfCountry) updateData.country = cfCountry
            if (!existing?.country_code && cfCountry) updateData.country_code = cfCountry
            if (!existing?.region && region) updateData.region = region
            if (!existing?.city && city) updateData.city = city
            if (!existing?.referrer && resolvedReferrer) updateData.referrer = resolvedReferrer
            if (!existing?.user_agent && ua) updateData.user_agent = ua

            await supabase.from("activity_log2").update(updateData).eq("session_id", session_id)
          } else if (insertErr) {
            console.error("[dessystems] activity_log2 insert:", insertErr.message)
          }
        } catch (dbErr) {
          console.error("[dessystems] activity_log2 error:", dbErr)
        }
      })()
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[dessystems/api/log]", err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

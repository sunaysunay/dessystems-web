import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || ''
    let body: any
    if (contentType.includes('application/json')) {
      body = await req.json()
    } else {
      body = JSON.parse(await req.text())
    }
    if (!body?.event_type) return NextResponse.json({ ok: true })

    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    await sb.from('activity_log').insert({
      tenant_id:   500,
      event_type:  body.event_type,
      page:        body.page || null,
      session_id:  body.session_id || null,
      device_type: 'desktop',
      metadata:    body.metadata || {},
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true })
  }
}

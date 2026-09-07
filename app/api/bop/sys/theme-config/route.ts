export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase-server'

const VALID = ['hyper-clean', 'swiss-minimal', 'warm-editorial'] as const

export async function GET() {
  const sb = getServerClient()
  const { data } = await sb
    .from('bop_settings')
    .select('value')
    .eq('key', 'site_ui_theme')
    .maybeSingle()
  return NextResponse.json({ theme: data?.value ?? 'hyper-clean' })
}

export async function PUT(req: Request) {
  const { theme } = await req.json()
  if (!VALID.includes(theme)) {
    return NextResponse.json({ error: 'invalid theme' }, { status: 400 })
  }
  const sb = getServerClient()
  await sb.from('bop_settings').upsert(
    { key: 'site_ui_theme', value: theme, updated_at: new Date().toISOString() },
    { onConflict: 'key' }
  )
  return NextResponse.json({ theme })
}

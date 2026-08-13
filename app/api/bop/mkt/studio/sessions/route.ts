// app/api/bop/mkt/studio/sessions/route.ts — MK007 session list + create
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { callerUid } from '@/lib/api-guard';

export const dynamic = 'force-dynamic';

// GET /api/bop/mkt/studio/sessions — list sessions for current user
export async function GET() {
  const uid = await callerUid();
  if (!uid) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const sb = getServerClient();
  const { data, error } = await sb
    .from('bop_studio_sessions')
    .select('*, bop_studio_images(count)')
    .eq('created_by', uid)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sessions: data });
}

// POST /api/bop/mkt/studio/sessions — create new session
export async function POST(req: NextRequest) {
  const uid = await callerUid();
  if (!uid) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const sb = getServerClient();

  const { data: session, error } = await sb
    .from('bop_studio_sessions')
    .insert({
      created_by: uid,
      listing_id: body.listing_id ?? null,
      preset_code: body.preset_code ?? 'SHOWROOM_WHITE',
      settings: body.settings ?? {},
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ session }, { status: 201 });
}

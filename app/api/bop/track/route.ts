import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_email, user_id, tenant_id, screen_id, screen_title, module, route, action, session_id } = body;
    if (!user_email || !screen_id) return NextResponse.json({ ok: false }, { status: 400 });

    const ip_address = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? req.headers.get('x-real-ip')
      ?? null;
    const user_agent = req.headers.get('user-agent') ?? null;

    const sb = getServerClient();

    // Log screen access
    await sb.from('bop_user_activity').insert({
      user_email, user_id, tenant_id,
      screen_id, screen_title,
      module: module ?? screen_id.slice(0, 2),
      route,
      action: action ?? 'OPEN',
      session_id, ip_address, user_agent,
    });

    // Update session last_active + screen_count
    if (session_id) {
      await sb.from('bop_sessions')
        .upsert({
          id: session_id,
          user_email, tenant_id, ip_address, user_agent,
          last_active_at: new Date().toISOString(),
        }, { onConflict: 'id', ignoreDuplicates: false })
        .select();

      await sb.rpc('increment_session_screens', { sid: session_id }).maybeSingle();
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

// Log UI events (button clicks, searches, exports)
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_email, tenant_id, session_id, screen_id, route, event_type, control, value, metadata } = body;
    if (!user_email || !event_type) return NextResponse.json({ ok: false }, { status: 400 });

    const sb = getServerClient();
    await sb.from('bop_user_events').insert({
      user_email, tenant_id, session_id, screen_id, route, event_type, control, value, metadata,
    });

    if (session_id) {
      await sb.rpc('increment_session_events', { sid: session_id }).maybeSingle();
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

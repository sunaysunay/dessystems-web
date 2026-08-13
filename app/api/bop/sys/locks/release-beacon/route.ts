import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

// sendBeacon-compatible lock release (beacons can only POST, not DELETE).
// Best-effort on tab close — TTL expiry remains the crash safety net.
export async function POST(req: NextRequest) {
  let b: any = {};
  try { b = JSON.parse(await req.text()); } catch { /* empty */ }
  if (!b.type || !b.id || !b.session) return NextResponse.json({ ok: false });
  const supabase = getServerClient();
  await supabase.rpc('bop_release_lock', { p_type: b.type, p_id: String(b.id), p_session: b.session });
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get('email');
  if (!email) return NextResponse.json({ data: [] });
  const sb = getServerClient();
  // Get distinct recent screens (last 20 events, deduplicated by screen_id keeping latest)
  const { data } = await sb
    .from('bop_user_activity')
    .select('screen_id, screen_title, route, accessed_at, tenant_id')
    .eq('user_email', email)
    .order('accessed_at', { ascending: false })
    .limit(50);

  // Deduplicate: keep first (most recent) occurrence of each screen_id
  const seen = new Set<string>();
  const recent = (data ?? []).filter(r => {
    if (seen.has(r.screen_id)) return false;
    seen.add(r.screen_id);
    return true;
  }).slice(0, 10);

  return NextResponse.json({ data: recent });
}

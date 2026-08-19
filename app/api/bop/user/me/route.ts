import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const sb = getServerClient();

  // Accept uid from query param (client already validated session via Supabase JS SDK)
  const uid = req.nextUrl.searchParams.get('uid');
  if (!uid) return NextResponse.json({ error: 'uid required' }, { status: 400 });

  // Basic UUID validation
  if (!/^[0-9a-f-]{36}$/.test(uid)) {
    return NextResponse.json({ error: 'Invalid uid' }, { status: 400 });
  }

  const { data: profile } = await sb
    .from('bop_user_profiles')
    .select('language, timezone, display_name, role, email')
    .eq('user_id', uid)
    .maybeSingle();

  // Fallback: get email from auth.users if profile email is null
  let email = profile?.email ?? null;
  if (!email) {
    const { data: authUser } = await sb.auth.admin.getUserById(uid);
    email = authUser?.user?.email ?? null;
  }

  return NextResponse.json({
    user_id: uid,
    email,
    language: profile?.language ?? 'nl',
    timezone: profile?.timezone ?? 'Europe/Amsterdam',
    role: profile?.role ?? 'viewer',
    display_name: profile?.display_name ?? email ?? uid,
  });
}

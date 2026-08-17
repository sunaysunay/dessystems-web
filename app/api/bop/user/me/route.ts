import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { getVerifiedUser } from '@/lib/supabase-session';

export async function GET() {
  const sb = getServerClient();

  // This route used to take `uid` from a query parameter, with only a
  // UUID-shape check and a comment that the client had "already validated"
  // the session. It was therefore unauthenticated: anyone could read any
  // user's email, role and profile by supplying a uuid — and the role it
  // returned is exactly what lib/auth.ts then wrote into the bop_role cookie.
  //
  // The caller is now whoever the verified Supabase session says they are,
  // and any uid parameter is ignored.
  const caller = await getVerifiedUser();
  if (!caller) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }
  const uid = caller.id;

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

// Caller identity for API routes.
//
// These helpers previously read the `bop_uid` and `bop_role` cookies, which
// lib/auth.ts writes from client-side JavaScript — not httpOnly, not signed,
// not bound to a session. Setting `bop_role=super_admin` in devtools was
// therefore enough to pass every isSuperAdmin() check in the console, which
// gates user invitation, password-reset links and role assignment.
//
// The signatures are unchanged so existing call sites keep working, but the
// answers now come from the verified Supabase session plus the database.
// The cookies are no longer trusted for authorization anywhere.
import { cache } from 'react';
import { getVerifiedUser } from '@/lib/supabase-session';
import { getServerClient } from '@/lib/supabase-server';

// getVerifiedUser() hits the auth server, and a single request often asks for
// identity more than once (callerUid + isSuperAdmin). cache() collapses those
// into one round-trip per request.
const resolveCaller = cache(async (): Promise<{ uid: string; roles: string[] }> => {
  const user = await getVerifiedUser();
  if (!user) return { uid: '', roles: [] };

  const supabase = getServerClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: assigned } = await supabase
    .from('bop_user_roles')
    .select('bop_roles(name)')
    .eq('user_id', user.id)
    .lte('valid_from', today)
    .gte('valid_to', today);

  const roles = (assigned ?? [])
    .map((r: any) => r.bop_roles?.name)
    .filter(Boolean) as string[];

  if (roles.length > 0) return { uid: user.id, roles };

  // Legacy fallback: profiles carry a single role name for users predating
  // bop_user_roles.
  const { data: profile } = await supabase
    .from('bop_user_profiles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  return { uid: user.id, roles: profile?.role ? [profile.role] : [] };
});

/** Primary role name of the verified caller, or '' when unauthenticated. */
export async function callerRole(): Promise<string> {
  const { roles } = await resolveCaller();
  return roles[0] ?? '';
}

/** User id of the verified caller, or '' when unauthenticated. */
export async function callerUid(): Promise<string> {
  const { uid } = await resolveCaller();
  return uid;
}

export async function isSuperAdmin(): Promise<boolean> {
  const { roles } = await resolveCaller();
  return roles.includes('super_admin');
}

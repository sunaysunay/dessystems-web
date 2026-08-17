// BOP — permission enforcement for API routes.
//
// Resolution order (deny by default at every step):
//   1. The caller is resolved from the verified Supabase session, NOT from a
//      cookie the client can write. No verified user → 401.
//   2. Roles come from the DB, never from the bop_role cookie — bop_user_roles
//      (within its valid_from/valid_to window), falling back to the single
//      bop_user_profiles.role column for users predating bop_user_roles.
//   3. super_admin bypasses, but only when the DB says so.
//   4. The permission id must exist in bop_permissions; unknown ids deny.
//   5. bop_role_permissions must link one of the caller's roles to that id.
//
// NOTE: bop_user_permissions is a per-screen (screen_id / can_read / can_write)
// override table, not a per-permission one, so it takes no part here.
import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { getVerifiedUser } from '@/lib/supabase-session';

export type PermissionResult =
  | { ok: true; uid: string }
  | { ok: false; response: NextResponse };

function deny(status: number, error: string): PermissionResult {
  return { ok: false, response: NextResponse.json({ error }, { status }) };
}

/** Role ids + names granted to a user, straight from the DB. */
async function callerRoles(uid: string): Promise<{ ids: string[]; names: string[] }> {
  const supabase = getServerClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: assigned } = await supabase
    .from('bop_user_roles')
    .select('role_id, bop_roles(id, name)')
    .eq('user_id', uid)
    .lte('valid_from', today)
    .gte('valid_to', today);

  if (assigned && assigned.length > 0) {
    return {
      ids: assigned.map((r: any) => r.role_id),
      names: assigned.map((r: any) => r.bop_roles?.name).filter(Boolean),
    };
  }

  // Legacy fallback: profiles carry a single role name with no bop_user_roles row.
  const { data: profile } = await supabase
    .from('bop_user_profiles')
    .select('role')
    .eq('user_id', uid)
    .maybeSingle();

  if (!profile?.role) return { ids: [], names: [] };

  const { data: role } = await supabase
    .from('bop_roles')
    .select('id, name')
    .eq('name', profile.role)
    .maybeSingle();

  return role ? { ids: [role.id], names: [role.name] } : { ids: [], names: [profile.role] };
}

/**
 * Guard an API route on a single bop_permissions id.
 *
 *   const guard = await requirePermission('shop.supplier.read');
 *   if (!guard.ok) return guard.response;
 */
export async function requirePermission(permissionId: string): Promise<PermissionResult> {
  const caller = await getVerifiedUser();

  if (!caller) return deny(401, 'unauthenticated');

  const uid = caller.id;

  const { ids, names } = await callerRoles(uid);

  if (ids.length === 0 && names.length === 0) {
    return deny(403, `forbidden — no role grants '${permissionId}'`);
  }

  if (names.includes('super_admin')) return { ok: true, uid };

  const supabase = getServerClient();

  // Unknown permission ids must never fall through as allowed.
  const { data: permission } = await supabase
    .from('bop_permissions')
    .select('id')
    .eq('id', permissionId)
    .maybeSingle();

  if (!permission) return deny(403, `forbidden — unknown permission '${permissionId}'`);

  if (ids.length === 0) {
    return deny(403, `forbidden — no role grants '${permissionId}'`);
  }

  const { data: grant } = await supabase
    .from('bop_role_permissions')
    .select('permission_id')
    .eq('permission_id', permissionId)
    .in('role_id', ids)
    .limit(1)
    .maybeSingle();

  if (!grant) return deny(403, `forbidden — no role grants '${permissionId}'`);

  return { ok: true, uid };
}

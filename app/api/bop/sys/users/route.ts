import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { isSuperAdmin, callerUid } from '@/lib/api-guard';

export async function GET() {
  const supabase = getServerClient();
  const [{ data: authData, error }, { data: userRoles }, { data: allRoles }] = await Promise.all([
    supabase.auth.admin.listUsers(),
    supabase.from('bop_user_roles').select('user_id, role_id, granted_at, granted_by, valid_from, valid_to'),
    supabase.from('bop_roles').select('id, name'),
  ]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const roleIndex: Record<string, string> = {};
  for (const r of allRoles ?? []) roleIndex[r.id] = r.name;

  const roleMap: Record<string, { role_id: string; role_name: string; granted_at: string|null; granted_by: string|null; valid_to: string|null }[]> = {};
  for (const ur of (userRoles ?? [])) {
    if (!roleMap[ur.user_id]) roleMap[ur.user_id] = [];
    roleMap[ur.user_id].push({
      role_id: ur.role_id,
      role_name: roleIndex[ur.role_id] ?? '',
      granted_at: ur.granted_at ?? null,
      granted_by: ur.granted_by ?? null,
      valid_to: ur.valid_to ?? null,
    });
  }

  const isAdmin = await isSuperAdmin();
  const uid = await callerUid();
  const _users = isAdmin ? (authData.users ?? []) : (authData.users ?? []).filter((u: any) => u.id === uid);
  return NextResponse.json({ users: _users, roleMap });
}

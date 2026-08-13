import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { isSuperAdmin, callerUid } from '@/lib/api-guard';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await isSuperAdmin()) && id !== await callerUid()) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const supabase = getServerClient();
  const uid = id;

  // Separate queries — no FK join (FK constraint not defined in schema)
  const [{ data: userRoles }, { data: allRoles }, { data: audit }, { data: denied }] = await Promise.all([
    supabase.from('bop_user_roles').select('role_id, valid_from, valid_to, granted_by, granted_at').eq('user_id', uid),
    supabase.from('bop_roles').select('id, name, description'),
    supabase.from('bop_access_log').select('id, screen_id, action, result, occurred_at').eq('user_id', uid).eq('result', 'granted').order('occurred_at', { ascending: false }).limit(50),
    supabase.from('bop_access_log').select('id, screen_id, action, result, reason, occurred_at').eq('user_id', uid).eq('result', 'denied').order('occurred_at', { ascending: false }).limit(50),
  ]);

  const roleIndex: Record<string, any> = {};
  for (const r of allRoles ?? []) roleIndex[r.id] = r;

  const roleIds = (userRoles ?? []).map((r: any) => r.role_id);

  let permissions: any[] = [];
  if (roleIds.length > 0) {
    const [{ data: roleScreens }, { data: screens }] = await Promise.all([
      supabase.from('bop_role_screens').select('screen_id, access_level, role_id').in('role_id', roleIds),
      supabase.from('bop_screens').select('screen_id, title, module').eq('status', 'active'),
    ]);

    const screenIndex: Record<string, any> = {};
    for (const s of screens ?? []) screenIndex[s.screen_id] = s;

    const screenMap: Record<string, any> = {};
    const levelRank: Record<string, number> = { view: 1, edit: 2, approve: 3, admin: 4 };
    for (const rs of roleScreens ?? []) {
      const existing = screenMap[rs.screen_id];
      const role = roleIndex[rs.role_id];
      if (!existing || levelRank[rs.access_level] > levelRank[existing.access_level]) {
        screenMap[rs.screen_id] = {
          screen_id: rs.screen_id,
          title: screenIndex[rs.screen_id]?.title,
          module: screenIndex[rs.screen_id]?.module,
          access_level: rs.access_level,
          role_name: role?.name,
        };
      }
    }
    permissions = Object.values(screenMap).sort((a, b) => a.screen_id.localeCompare(b.screen_id));
  }

  const roles = (userRoles ?? []).map((r: any) => ({
    role_id: r.role_id,
    role_name: roleIndex[r.role_id]?.name,
    description: roleIndex[r.role_id]?.description,
    valid_from: r.valid_from,
    valid_to: r.valid_to,
    granted_by: r.granted_by,
    granted_at: r.granted_at,
  }));

  return NextResponse.json({ roles, permissions, audit: audit ?? [], denied: denied ?? [] });
}

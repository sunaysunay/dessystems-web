import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

const ALL_ROLES = ['super_admin','platform_admin','tenant_manager','editor','viewer'];

// GET /api/bop/roles?role=super_admin  — screens for a role
// GET /api/bop/roles                   — role summary (all roles + screen counts + user counts)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const role = searchParams.get('role');
  const sb = getServerClient();

  if (role) {
    // Screens assigned to this role
    const { data: assigned } = await sb.from('bop_screen_roles')
      .select('screen_id, can_read, can_write, can_delete')
      .eq('role', role);

    // All screens for matrix
    const { data: allScreens } = await sb.from('bop_screens')
      .select('screen_id, title, module, func_type, status')
      .eq('status', 'active')
      .order('screen_id');

    const assignedIds = new Set((assigned ?? []).map(a => a.screen_id));
    const assignedMap: Record<string, any> = {};
    for (const a of assigned ?? []) assignedMap[a.screen_id] = a;

    return NextResponse.json({
      role,
      screens: (allScreens ?? []).map(s => ({
        ...s,
        assigned: assignedIds.has(s.screen_id),
        can_read: assignedMap[s.screen_id]?.can_read ?? false,
        can_write: assignedMap[s.screen_id]?.can_write ?? false,
        can_delete: assignedMap[s.screen_id]?.can_delete ?? false,
      })),
    });
  }

  // Summary: all roles with screen count + user count
  const { data: roleRows } = await sb.from('bop_screen_roles')
    .select('role, screen_id');
  const { data: userProfiles } = await sb.from('bop_user_profiles')
    .select('role');

  const screenCountByRole: Record<string, number> = {};
  for (const r of roleRows ?? []) {
    screenCountByRole[r.role] = (screenCountByRole[r.role] ?? 0) + 1;
  }
  const userCountByRole: Record<string, number> = {};
  for (const u of userProfiles ?? []) {
    if (u.role) userCountByRole[u.role] = (userCountByRole[u.role] ?? 0) + 1;
  }

  return NextResponse.json({
    roles: ALL_ROLES.map(r => ({
      role: r,
      screen_count: screenCountByRole[r] ?? 0,
      user_count: userCountByRole[r] ?? 0,
    })),
  });
}

// POST /api/bop/roles — grant screen to role
export async function POST(req: NextRequest) {
  const { role, screen_id, can_read = true, can_write = false, can_delete = false } = await req.json();
  const actor = req.headers.get('x-actor-email') ?? 'unknown';
  if (!role || !screen_id) return NextResponse.json({ error: 'role and screen_id required' }, { status: 400 });

  const sb = getServerClient();
  const { error } = await sb.from('bop_screen_roles')
    .upsert({ role, screen_id, can_read, can_write, can_delete }, { onConflict: 'screen_id,role' });

  if (!error) {
    await sb.from('bop_change_log').insert({
      actor_email: actor, action: 'ROLE_SCREEN_GRANTED',
      object_type: 'role', object_id: role,
      new_value: { screen_id, can_read, can_write, can_delete },
    });
  }
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ ok: true });
}

// DELETE /api/bop/roles — revoke screen from role
export async function DELETE(req: NextRequest) {
  const { role, screen_id } = await req.json();
  const actor = req.headers.get('x-actor-email') ?? 'unknown';
  const sb = getServerClient();
  const { error } = await sb.from('bop_screen_roles')
    .delete().eq('role', role).eq('screen_id', screen_id);

  if (!error) {
    await sb.from('bop_change_log').insert({
      actor_email: actor, action: 'ROLE_SCREEN_REVOKED',
      object_type: 'role', object_id: role,
      old_value: { screen_id },
    });
  }
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ ok: true });
}

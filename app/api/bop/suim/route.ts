import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';

function authAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const view = searchParams.get('view') ?? 'dashboard';
  const sb = getServerClient();
  const admin = authAdminClient();

  if (view === 'dashboard') {
    const { data: authUsers } = await admin.auth.admin.listUsers();
    const { data: profiles } = await sb.from('bop_user_profiles').select('status,role,valid_to,last_login_at');
    const { data: activity } = await sb.from('bop_user_activity')
      .select('user_email').gte('accessed_at', new Date(Date.now() - 86400000).toISOString());
    const { data: failedLogins } = await sb.from('bop_user_activity')
      .select('user_email').eq('action', 'FAILED_LOGIN')
      .gte('accessed_at', new Date(Date.now() - 86400000).toISOString());

    const now = new Date();
    const ago90 = new Date(Date.now() - 90 * 86400000).toISOString();
    const in30 = new Date(Date.now() + 30 * 86400000).toISOString();

    const total = authUsers?.users?.length ?? 0;
    const activeToday = new Set((activity ?? []).map(a => a.user_email)).size;
    const locked = (profiles ?? []).filter(p => p.status === 'locked' || p.status === 'suspended').length;
    const admins = (profiles ?? []).filter(p => ['super_admin','platform_admin'].includes(p.role)).length;
    const dormant = (authUsers?.users ?? []).filter(u => u.last_sign_in_at && u.last_sign_in_at < ago90).length;
    const neverLoggedIn = (authUsers?.users ?? []).filter(u => !u.last_sign_in_at).length;
    const expiringSoon = (profiles ?? []).filter(p => p.valid_to && p.valid_to < in30 && p.valid_to > now.toISOString()).length;
    const failedLoginsToday = new Set((failedLogins ?? []).map(f => f.user_email)).size;

    return NextResponse.json({ total, activeToday, locked, admins, dormant, neverLoggedIn, expiringSoon, failedLoginsToday });
  }

  if (view === 'user_reports') {
    const report = searchParams.get('report') ?? 'dormant';
    const { data: authUsers } = await admin.auth.admin.listUsers();
    const { data: profiles } = await sb.from('bop_user_profiles').select('*');
    const profileMap: Record<string, any> = {};
    for (const p of profiles ?? []) profileMap[p.user_id] = p;

    const ago90 = new Date(Date.now() - 90 * 86400000).toISOString();
    const in30 = new Date(Date.now() + 30 * 86400000).toISOString();
    const now = new Date().toISOString();

    let users = (authUsers?.users ?? []).map(u => ({ ...u, ...(profileMap[u.id] ?? {}) }));

    if (report === 'dormant') users = users.filter(u => u.last_sign_in_at && u.last_sign_in_at < ago90);
    else if (report === 'never') users = users.filter(u => !u.last_sign_in_at);
    else if (report === 'locked') users = users.filter(u => (u.status === 'locked' || u.status === 'suspended'));
    else if (report === 'expiring') users = users.filter(u => u.valid_to && u.valid_to < in30 && u.valid_to > now);
    else if (report === 'admins') users = users.filter(u => ['super_admin','platform_admin'].includes(u.role));
    else if (report === 'by_role') {
      const role = searchParams.get('role');
      if (role) users = users.filter(u => u.role === role);
    }

    return NextResponse.json({ users: users.slice(0, 100) });
  }

  if (view === 'access_explorer') {
    const screen_id = searchParams.get('screen_id');
    const user_email = searchParams.get('user_email');

    if (screen_id) {
      // Who accessed this TC?
      const { data: rows } = await sb.from('bop_user_activity')
        .select('user_email, accessed_at, tenant_id')
        .eq('screen_id', screen_id)
        .order('accessed_at', { ascending: false })
        .limit(200);
      const seen = new Set<string>();
      const unique = (rows ?? []).filter(r => { if (seen.has(r.user_email)) return false; seen.add(r.user_email); return true; });
      // Which roles have this screen?
      const { data: roleRows } = await sb.from('bop_screen_roles').select('role').eq('screen_id', screen_id);
      return NextResponse.json({ users: unique, roles: (roleRows ?? []).map(r => r.role), total_opens: rows?.length ?? 0 });
    }

    if (user_email) {
      // What TCs has this user accessed?
      const { data: rows } = await sb.from('bop_user_activity')
        .select('screen_id, screen_title, route, accessed_at')
        .eq('user_email', user_email)
        .order('accessed_at', { ascending: false })
        .limit(200);
      const seen = new Set<string>();
      const unique = (rows ?? []).filter(r => { if (seen.has(r.screen_id)) return false; seen.add(r.screen_id); return true; });
      // Get profile for role
      const { data: profile } = await sb.from('bop_user_profiles').select('role').eq('email', user_email).single();
      // Role-based screens
      const { data: roleScreens } = profile?.role
        ? await sb.from('bop_screen_roles').select('screen_id').eq('role', profile.role)
        : { data: [] };
      return NextResponse.json({ screens: unique, role: profile?.role, role_screens: (roleScreens ?? []).map(r => r.screen_id) });
    }

    return NextResponse.json({ error: 'screen_id or user_email required' }, { status: 400 });
  }

  if (view === 'activity') {
    const range = searchParams.get('range') ?? '7d';
    const days = range === '1d' ? 1 : range === '30d' ? 30 : 7;
    const since = new Date(Date.now() - days * 86400000).toISOString();

    const { data: rows } = await sb.from('bop_user_activity')
      .select('screen_id, screen_title, user_email, module, accessed_at')
      .gte('accessed_at', since)
      .order('accessed_at', { ascending: false })
      .limit(2000);

    // Top screens
    const screenMap: Record<string, { title: string; count: number; users: Set<string> }> = {};
    const userMap: Record<string, number> = {};
    for (const r of rows ?? []) {
      if (!screenMap[r.screen_id]) screenMap[r.screen_id] = { title: r.screen_title ?? r.screen_id, count: 0, users: new Set() };
      screenMap[r.screen_id].count++;
      screenMap[r.screen_id].users.add(r.user_email);
      userMap[r.user_email] = (userMap[r.user_email] ?? 0) + 1;
    }
    const topScreens = Object.entries(screenMap)
      .map(([id, v]) => ({ screen_id: id, title: v.title, opens: v.count, unique_users: v.users.size }))
      .sort((a, b) => b.opens - a.opens).slice(0, 20);
    const topUsers = Object.entries(userMap)
      .map(([email, opens]) => ({ email, opens }))
      .sort((a, b) => b.opens - a.opens).slice(0, 10);

    return NextResponse.json({ topScreens, topUsers, total: rows?.length ?? 0 });
  }

  if (view === 'audit') {
    const { data: rows } = await sb.from('bop_change_log')
      .select('*').order('created_at', { ascending: false }).limit(200);
    return NextResponse.json({ rows: rows ?? [] });
  }

  return NextResponse.json({ error: 'unknown view' }, { status: 400 });
}

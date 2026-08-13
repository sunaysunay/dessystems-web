import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export async function GET() {
  const supabase = getServerClient();

  const [
    { count: tenants },
    { count: users },
    { count: roles },
    { data: modules },
    { data: screens },
  ] = await Promise.all([
    supabase.from('bop_user_tenants').select('*', { count: 'exact', head: true }),
    supabase.from('bop_users').select('*', { count: 'exact', head: true }),
    supabase.from('bop_roles').select('*', { count: 'exact', head: true }),
    supabase.from('bop_modules').select('module_id, code, name, phase, status').order('code'),
    supabase.from('bop_screens').select('screen_id, title, module, route, status').order('screen_id'),
  ]);

  // Count active/v3 screens per module
  const screenList = screens ?? [];
  const moduleList = (modules ?? []).map((m: any) => ({
    ...m,
    active_screens: screenList.filter((s: any) => s.module === m.module_id && s.status === 'active').length,
    v3_screens:     screenList.filter((s: any) => s.module === m.module_id && s.status === 'v3').length,
  }));

  return NextResponse.json({
    tenants:      tenants ?? 0,
    users:        users ?? 0,
    active_users: users ?? 0,
    roles:        roles ?? 0,
    modules:      moduleList,
    screens:      screenList,
  });
}

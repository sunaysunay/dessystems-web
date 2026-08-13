import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { isSuperAdmin } from '@/lib/api-guard';

export const dynamic = 'force-dynamic';

// GET /api/bop/comm/history?tenant=ID — omit ?tenant= for cross-tenant view,
// which is super_admin/platform_admin only (plan §3's cross-tenant reach rule,
// same posture SY003 Tenant Management already uses).
export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const tenantParam = new URL(req.url).searchParams.get('tenant');

  if (!tenantParam && !(await isSuperAdmin())) {
    return NextResponse.json({ error: 'forbidden — cross-tenant history view requires super_admin/platform_admin' }, { status: 403 });
  }

  let q = supabase.from('bop_comm_history')
    .select('*, bop_comm_template(category, locale)')
    .order('created_at', { ascending: false }).limit(200);
  if (tenantParam) q = q.eq('tenant_id', Number(tenantParam));

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ history: data ?? [] });
}

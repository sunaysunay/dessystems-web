import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { isSuperAdmin } from '@/lib/api-guard';

export const dynamic = 'force-dynamic';

// GET /api/bop/comm/styles?tenant=ID — platform defaults (tenant_id=0) + this
// tenant's overrides, if any. CM001 shows both so an admin can see what's
// inherited vs. locally overridden (plan §1's shadow-warning requirement).
export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const tenant = Number(new URL(req.url).searchParams.get('tenant') ?? '0');
  const { data, error } = await supabase
    .from('bop_comm_master_style')
    .select('*')
    .in('tenant_id', [tenant, 0])
    .order('code')
    .order('tenant_id', { ascending: false }); // tenant override listed before the 0-default for the same code
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ styles: data ?? [] });
}

// PATCH — upsert a style row. Writing tenant_id=0 (the platform default) is
// super_admin only, since it affects every tenant without an override.
export async function PATCH(req: NextRequest) {
  const supabase = getServerClient();
  const b = await req.json();
  if (!b.code || b.tenant_id === undefined) return NextResponse.json({ error: 'code and tenant_id are required' }, { status: 400 });
  if (Number(b.tenant_id) === 0 && !(await isSuperAdmin())) {
    return NextResponse.json({ error: 'forbidden — editing the platform default (tenant_id=0) requires super_admin' }, { status: 403 });
  }
  const { error } = await supabase.from('bop_comm_master_style').upsert(b, { onConflict: 'tenant_id,code' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { isSuperAdmin } from '@/lib/api-guard';

export const dynamic = 'force-dynamic';

// POST /api/bop/sys/tenant-status  { tenant_id, status, severity, title, message, ... }
export async function POST(req: NextRequest) {
  if (!(await isSuperAdmin())) return NextResponse.json({ error: 'forbidden — super_admin only' }, { status: 403 });
  const supabase = getServerClient();
  const b = await req.json();
  if (!b.tenant_id) return NextResponse.json({ error: 'tenant_id required' }, { status: 400 });
  const { data, error } = await supabase.from('bop_tenant_status').insert({
    tenant_id: Number(b.tenant_id),
    status: b.status ?? 'operational',
    severity: b.severity ?? 'info',
    title: b.title ?? null,
    message: b.message ?? null,
    show_banner: !!b.show_banner,
    show_popup: !!b.show_popup,
    show_status_page: b.show_status_page !== false,
    affected_services: b.affected_services ?? [],
    created_by: b.created_by ?? 'admin',
  }).select('id').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}

// PATCH /api/bop/sys/tenant-status  { id, is_resolved }
export async function PATCH(req: NextRequest) {
  if (!(await isSuperAdmin())) return NextResponse.json({ error: 'forbidden — super_admin only' }, { status: 403 });
  const supabase = getServerClient();
  const b = await req.json();
  if (!b.id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const patch: any = {};
  if ('is_resolved' in b) { patch.is_resolved = b.is_resolved; patch.resolved_at = b.is_resolved ? new Date().toISOString() : null; }
  const { error } = await supabase.from('bop_tenant_status').update(patch).eq('id', b.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

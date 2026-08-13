import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

// GET /api/bop/notifications?tenant_id=200  → { notifications, unread_count }
export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const tenant_id = req.nextUrl.searchParams.get('tenant_id');

  let q = supabase.from('admin_notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  // Show this tenant's notifications PLUS global infra alerts (vps-monitor),
  // which aren't tenant-specific and must surface on every tenant.
  if (tenant_id) q = q.or(`tenant_id.eq.${parseInt(tenant_id)},meta->>source.eq.vps-monitor`);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const unread_count = (data ?? []).filter(n => !n.is_read).length;
  return NextResponse.json({ notifications: data ?? [], unread_count });
}

// PATCH /api/bop/notifications  body: { id? } — mark one or all read
export async function PATCH(req: NextRequest) {
  const supabase = getServerClient();
  const { id, tenant_id } = await req.json();

  let q = supabase.from('admin_notifications').update({ is_read: true });
  if (id) {
    q = q.eq('id', id);
  } else if (tenant_id) {
    q = q.or(`tenant_id.eq.${parseInt(String(tenant_id))},meta->>source.eq.vps-monitor`).eq('is_read', false);
  }

  const { error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

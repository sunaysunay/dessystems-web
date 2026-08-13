import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const sb = getServerClient();
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenant_id') ? Number(searchParams.get('tenant_id')) : null;
  const status   = searchParams.get('status') || '';
  const search   = searchParams.get('search') || '';

  let q = sb.from('order_summary').select('*').order('created_at', { ascending: false });

  if (tenantId) q = q.eq('tenant_id', tenantId);
  if (status)   q = q.eq('payment_status', status);
  if (search)   q = q.or(`customer_name.ilike.%${search}%,internal_id.ilike.%${search}%`);

  const { data, error } = await q.limit(200);
  if (error) {
    // fallback: order table directly if view doesn't exist
    let q2 = sb.from('order').select('id,internal_id,customer_name,customer_email,customer_phone,payment_status,currency,created_at,delivery_date,notes').order('created_at', { ascending: false });
    if (tenantId) q2 = q2.eq('tenant_id', tenantId);
    if (status)   q2 = q2.eq('payment_status', status);
    if (search)   q2 = q2.ilike('customer_name', `%${search}%`);
    const { data: d2, error: e2 } = await q2.limit(200);
    if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });
    return NextResponse.json({ orders: d2 ?? [] });
  }

  return NextResponse.json({ orders: data ?? [] });
}

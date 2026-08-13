import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const customerId = sp.get('customer_id');

  if (!customerId) {
    return NextResponse.json({ error: 'customer_id is required' }, { status: 400 });
  }

  const supabase = getServerClient();

  const { data: orders, error: ordersErr } = await supabase
    .from('shop_orders')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  if (ordersErr) return NextResponse.json({ error: ordersErr.message }, { status: 500 });

  const { data: invoices, error: invoicesErr } = await supabase
    .from('shop_invoices')
    .select('*')
    .in('order_id', (orders ?? []).map((o) => o.id));

  if (invoicesErr) return NextResponse.json({ error: invoicesErr.message }, { status: 500 });

  return NextResponse.json({
    customer_id: customerId,
    exported_at: new Date().toISOString(),
    orders: orders ?? [],
    invoices: invoices ?? [],
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const supabase = getServerClient();

  const [orders, payments, stock, claims, fulfilment] = await Promise.all([
    supabase.rpc('shop_metric_orders_today').single(),
    supabase.from('shop_payments').select('id', { count: 'exact', head: true }).eq('status', 'failed').gte('created_at', new Date(Date.now() - 86400000).toISOString()),
    supabase.from('shop_inventory').select('id,sku,product_name,qty,reorder_point').lt('qty', 5),
    supabase.from('shop_claims').select('id', { count: 'exact', head: true }).eq('status', 'open').lt('created_at', new Date(Date.now() - 86400000).toISOString()),
    supabase.from('shop_orders').select('id', { count: 'exact', head: true }).eq('fulfilment_status', 'pending').lt('created_at', new Date(Date.now() - 2 * 86400000).toISOString()),
  ]);

  return NextResponse.json({
    orders_today: orders.data ?? 0,
    failed_payments_24h: payments.count ?? 0,
    critical_low_stock: stock.data ?? [],
    sla_breached_claims: claims.count ?? 0,
    overdue_fulfilment: fulfilment.count ?? 0,
    checked_at: new Date().toISOString(),
  });
}

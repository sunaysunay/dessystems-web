import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = getServerClient();

  const [{ data: inventory }, { data: config }] = await Promise.all([
    supabase.from('shop_inventory').select('id,product_id,sku,product_name,qty,reorder_point'),
    supabase.from('shop_stock_config').select('product_id,reorder_point,reorder_qty,safety_stock'),
  ]);

  const configMap = new Map((config ?? []).map((c: any) => [c.product_id, c]));

  const requirements = (inventory ?? []).map((item: any) => {
    const cfg = configMap.get(item.product_id);
    const safetyStock = cfg?.safety_stock ?? 2;
    const reorderPoint = cfg?.reorder_point ?? item.reorder_point ?? 5;
    const reorderQty = cfg?.reorder_qty ?? 20;
    const netReq = Math.max(0, (reorderPoint + safetyStock) - item.qty);

    return {
      ...item,
      safety_stock: safetyStock,
      effective_reorder_point: reorderPoint,
      net_requirement: netReq,
      suggested_order_qty: netReq > 0 ? Math.max(netReq, reorderQty) : 0,
      status: item.qty <= 0 ? 'critical' : item.qty < reorderPoint ? 'low' : 'ok',
    };
  }).sort((a: any, b: any) => b.net_requirement - a.net_requirement);

  return NextResponse.json({ requirements, total: requirements.length });
}

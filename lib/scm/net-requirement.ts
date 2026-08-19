import { getServerClient } from '@/lib/supabase-server';

export interface NetRequirement {
  product_id: string;
  sku: string;
  current_stock: number;
  forecast_demand: number;
  safety_stock: number;
  reorder_point: number;
  net_requirement: number;
  suggested_order_qty: number;
  preferred_supplier_id: string | null;
}

export async function calculateNetRequirements(): Promise<NetRequirement[]> {
  const supabase = getServerClient();

  const [{ data: inventory }, { data: config }, { data: demand }, { data: prices }] = await Promise.all([
    supabase.from('shop_inventory').select('id,product_id,sku,qty,reorder_point'),
    supabase.from('shop_stock_config').select('product_id,reorder_point,reorder_qty,safety_stock,lead_time_days,auto_reorder'),
    supabase.from('shop_demand_forecast').select('product_id,forecast_qty').gte('period_end', new Date().toISOString()),
    supabase.from('shop_supplier_prices').select('product_id,supplier_id,cost_price,min_qty').order('cost_price'),
  ]);

  const configMap = new Map((config ?? []).map(c => [c.product_id, c]));
  const demandMap = new Map<string, number>();
  for (const d of demand ?? []) {
    demandMap.set(d.product_id, (demandMap.get(d.product_id) ?? 0) + d.forecast_qty);
  }
  const cheapestSupplier = new Map<string, string>();
  for (const p of prices ?? []) {
    if (!cheapestSupplier.has(p.product_id)) cheapestSupplier.set(p.product_id, p.supplier_id);
  }

  const results: NetRequirement[] = [];
  for (const item of inventory ?? []) {
    const cfg = configMap.get(item.product_id);
    const safetyStock = cfg?.safety_stock ?? 2;
    const reorderPoint = cfg?.reorder_point ?? item.reorder_point ?? 5;
    const reorderQty = cfg?.reorder_qty ?? 20;
    const forecastDemand = demandMap.get(item.product_id) ?? 0;
    const netReq = Math.max(0, (reorderPoint + safetyStock + forecastDemand) - item.qty);

    if (netReq > 0) {
      results.push({
        product_id: item.product_id,
        sku: item.sku,
        current_stock: item.qty,
        forecast_demand: forecastDemand,
        safety_stock: safetyStock,
        reorder_point: reorderPoint,
        net_requirement: netReq,
        suggested_order_qty: Math.max(netReq, reorderQty),
        preferred_supplier_id: cheapestSupplier.get(item.product_id) ?? null,
      });
    }
  }

  return results.sort((a, b) => b.net_requirement - a.net_requirement);
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { notifyStockReconciliationVariance } from '@/lib/shop/notify';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const supabase = getServerClient();

  const { data: inventory } = await supabase
    .from('shop_inventory')
    .select('id,sku,product_name,qty,ledger_qty');

  if (!inventory?.length) {
    return NextResponse.json({ message: 'No inventory items found', variances: 0 });
  }

  const variances: Array<{ sku: string; name: string; system: number; ledger: number; diff: number }> = [];

  for (const item of inventory) {
    const systemQty = item.qty ?? 0;
    const ledgerQty = item.ledger_qty ?? systemQty;
    const diff = systemQty - ledgerQty;
    if (diff !== 0) {
      variances.push({
        sku: item.sku,
        name: item.product_name,
        system: systemQty,
        ledger: ledgerQty,
        diff,
      });
    }
  }

  if (variances.length > 0) {
    await notifyStockReconciliationVariance(variances.length, inventory.length);
  }

  return NextResponse.json({
    total_items: inventory.length,
    variances_found: variances.length,
    variances,
    reconciled_at: new Date().toISOString(),
  });
}

import { getServerClient } from '@/lib/supabase-server';

export interface RestatementEntry {
  tenant_id: number;
  fact_date: string;
  target_table: string;
  entity_id: string | null;
  field_name: string;
  old_value: number;
  new_value: number;
  reason: string;
  source_id: string | null;
}

export async function settleReturns(
  tenantId: number,
  lookbackDays = 45,
): Promise<{ settled: number; restatements: number }> {
  const sb = getServerClient();
  const cutoff = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();

  const { data: returns } = await sb
    .from('shop_returns')
    .select(`
      id, order_id, status,
      shop_return_lines(order_line_id, variant_id, quantity, unit_price_cents)
    `)
    .in('status', ['approved', 'refund_approved', 'completed'])
    .gte('requested_at', cutoff);

  if (!returns?.length) return { settled: 0, restatements: 0 };

  let settled = 0;
  let restatements = 0;

  for (const ret of returns) {
    const { data: order } = await sb
      .from('shop_orders')
      .select('placed_at')
      .eq('id', ret.order_id)
      .single();

    if (!order?.placed_at) continue;

    const orderDate = order.placed_at.slice(0, 10);
    const returnLines = (ret as any).shop_return_lines || [];

    for (const rl of returnLines) {
      const returnValue = (rl.unit_price_cents || 0) * (rl.quantity || 0);

      const { data: existing } = await sb
        .from('ci_daily_sales')
        .select('id, net_sales_cents, items_sold')
        .eq('tenant_id', tenantId)
        .eq('fact_date', orderDate)
        .maybeSingle();

      if (existing) {
        const newNet = existing.net_sales_cents - returnValue;
        const newItems = existing.items_sold - (rl.quantity || 0);

        if (newNet !== existing.net_sales_cents) {
          await sb.from('ci_daily_sales').update({
            net_sales_cents: newNet,
            items_sold: Math.max(0, newItems),
            updated_at: new Date().toISOString(),
          }).eq('id', existing.id);

          await logRestatement(sb, {
            tenant_id: tenantId,
            fact_date: orderDate,
            target_table: 'ci_daily_sales',
            entity_id: null,
            field_name: 'net_sales_cents',
            old_value: existing.net_sales_cents,
            new_value: newNet,
            reason: `return_settled:${ret.id}`,
            source_id: ret.id,
          });
          restatements++;
        }
      }

      if (rl.variant_id) {
        const { data: prodRow } = await sb
          .from('ci_daily_product')
          .select('id, net_sales_cents, units_sold, returns_qty, return_value_cents')
          .eq('tenant_id', tenantId)
          .eq('fact_date', orderDate)
          .eq('variant_id', rl.variant_id)
          .maybeSingle();

        if (prodRow) {
          const newProdNet = prodRow.net_sales_cents - returnValue;
          const newReturnsQty = (prodRow.returns_qty || 0) + (rl.quantity || 0);
          const newReturnValue = (prodRow.return_value_cents || 0) + returnValue;

          await sb.from('ci_daily_product').update({
            net_sales_cents: newProdNet,
            returns_qty: newReturnsQty,
            return_value_cents: newReturnValue,
            updated_at: new Date().toISOString(),
          }).eq('id', prodRow.id);

          if (newProdNet !== prodRow.net_sales_cents) {
            await logRestatement(sb, {
              tenant_id: tenantId,
              fact_date: orderDate,
              target_table: 'ci_daily_product',
              entity_id: rl.variant_id,
              field_name: 'net_sales_cents',
              old_value: prodRow.net_sales_cents,
              new_value: newProdNet,
              reason: `return_settled:${ret.id}`,
              source_id: ret.id,
            });
            restatements++;
          }
        }
      }
    }

    settled++;
  }

  return { settled, restatements };
}

async function logRestatement(
  sb: ReturnType<typeof getServerClient>,
  entry: RestatementEntry,
): Promise<void> {
  await sb.from('ci_restatement').insert(entry);
}

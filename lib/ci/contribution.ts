import { getServerClient } from '@/lib/supabase-server';
import { getLandedCost, getAllParams } from './cost';

export interface OrderContribution {
  order_id: string;
  order_date: string;
  lines: LineContribution[];
  gross_sales_cents: number;
  discount_total_cents: number;
  return_total_cents: number;
  net_sales_cents: number;
  cogs_cents: number;
  gross_margin_cents: number;
  shipping_delta_cents: number;
  payment_fee_cents: number;
  pickpack_cents: number;
  return_cost_cents: number;
  contribution_cents: number;
}

export interface LineContribution {
  order_line_id: string;
  variant_id: string;
  qty_ordered: number;
  qty_returned: number;
  qty_settled: number;
  unit_net_cents: number;
  line_net_cents: number;
  discount_net_cents: number;
  return_net_cents: number;
  net_revenue_cents: number;
  landed_unit_cost_cents: number;
  cost_source: string;
  cogs_cents: number;
  shipping_charged_cents: number;
  shipping_actual_cents: number;
  shipping_delta_cents: number;
  payment_fee_cents: number;
  payment_fee_source: string;
  pickpack_cents: number;
  return_cost_cents: number;
  contribution_cents: number;
}

export async function computeOrderContribution(orderId: string): Promise<OrderContribution | null> {
  const supabase = getServerClient();

  const { data: order } = await supabase
    .from('shop_orders')
    .select('id, order_no, placed_at, shipping_net_cents, total_gross_cents, subtotal_net_cents, discount_net_cents')
    .eq('id', orderId)
    .single();
  if (!order) return null;

  const orderDate = order.placed_at?.slice(0, 10) || new Date().toISOString().slice(0, 10);

  const { data: orderLines } = await supabase
    .from('shop_order_lines')
    .select('id, variant_id, qty, unit_net_cents, line_net_cents, discount_net_cents, line_no')
    .eq('order_id', orderId)
    .order('line_no');
  if (!orderLines?.length) return null;

  const { data: returns } = await supabase
    .from('shop_return_lines')
    .select('order_line_id, quantity')
    .in('return_id',
      (await supabase
        .from('shop_returns')
        .select('id')
        .eq('order_id', orderId)
        .in('status', ['approved', 'completed', 'refunded'])
      ).data?.map((r: any) => r.id) || []
    );

  const returnQtyMap: Record<string, number> = {};
  for (const rl of returns || []) {
    returnQtyMap[rl.order_line_id] = (returnQtyMap[rl.order_line_id] || 0) + rl.quantity;
  }

  const { data: payment } = await supabase
    .from('shop_payments')
    .select('provider_fee_cents, method')
    .eq('order_id', orderId)
    .eq('state', 'paid')
    .limit(1)
    .maybeSingle();

  const params = await getAllParams(orderDate);

  const totalLineNet = orderLines.reduce((s: number, l: any) => s + l.line_net_cents, 0);

  const shippingCharged = order.shipping_net_cents || 0;
  const shippingActualParam = params['shipping.actual_per_order'];

  let actualPaymentFeeCents = payment?.provider_fee_cents ?? null;
  const paymentFeeSource: string = actualPaymentFeeCents != null ? 'actual' : 'estimate';

  if (actualPaymentFeeCents == null) {
    const method = payment?.method || 'ideal';
    const pct = params[`mollie.${method}.pct`] || 0;
    const fixed = params[`mollie.${method}.fixed`] || params['mollie.ideal.fixed'] || 0;
    actualPaymentFeeCents = Math.round(order.total_gross_cents * pct + fixed * 100);
  }

  const pickpackPerLine = Math.round((params['pickpack.per_line'] || 0) * 100);
  const pickpackPerUnit = Math.round((params['pickpack.per_unit'] || 0) * 100);
  const returnHandlingCents = Math.round((params['return.handling_cost'] || 0) * 100);
  const restockLossPct = params['return.restock_loss_pct'] || 0;

  const lines: LineContribution[] = [];

  for (const ol of orderLines) {
    const qtyOrdered = ol.qty;
    const qtyReturned = returnQtyMap[ol.id] || 0;
    const qtySettled = qtyOrdered - qtyReturned;

    const lineDiscount = ol.discount_net_cents || 0;
    const returnNetCents = qtyReturned > 0
      ? Math.round(((ol.line_net_cents - lineDiscount) / qtyOrdered) * qtyReturned)
      : 0;
    const netRevenue = ol.line_net_cents - lineDiscount - returnNetCents;

    const cost = await getLandedCost(ol.variant_id, orderDate);
    const landedUnitCostCents = cost ? Math.round(cost.landed_unit_cost * 100) : 0;
    const costSource = cost?.source || 'missing';
    const cogsCents = landedUnitCostCents * qtySettled;

    const revenueShare = totalLineNet > 0 ? ol.line_net_cents / totalLineNet : 1 / orderLines.length;

    const lineShippingCharged = Math.round(shippingCharged * revenueShare);
    const lineShippingActual = shippingActualParam != null
      ? Math.round(shippingActualParam * 100 * revenueShare)
      : Math.round(840 * revenueShare); // default €8.40 if no param

    const linePaymentFee = Math.round(actualPaymentFeeCents * revenueShare);

    const linePickpack = pickpackPerLine + (pickpackPerUnit * qtyOrdered);

    let lineReturnCost = 0;
    if (qtyReturned > 0) {
      const handlingShare = Math.round(returnHandlingCents * (qtyReturned / qtyOrdered));
      const restockLoss = Math.round(landedUnitCostCents * qtyReturned * restockLossPct);
      lineReturnCost = handlingShare + restockLoss;
    }

    const contribution = netRevenue - cogsCents
      + (lineShippingCharged - lineShippingActual)
      - linePaymentFee
      - linePickpack;

    lines.push({
      order_line_id: ol.id,
      variant_id: ol.variant_id,
      qty_ordered: qtyOrdered,
      qty_returned: qtyReturned,
      qty_settled: qtySettled,
      unit_net_cents: ol.unit_net_cents,
      line_net_cents: ol.line_net_cents,
      discount_net_cents: lineDiscount,
      return_net_cents: returnNetCents,
      net_revenue_cents: netRevenue,
      landed_unit_cost_cents: landedUnitCostCents,
      cost_source: costSource,
      cogs_cents: cogsCents,
      shipping_charged_cents: lineShippingCharged,
      shipping_actual_cents: lineShippingActual,
      shipping_delta_cents: lineShippingCharged - lineShippingActual,
      payment_fee_cents: linePaymentFee,
      payment_fee_source: paymentFeeSource,
      pickpack_cents: linePickpack,
      return_cost_cents: lineReturnCost,
      contribution_cents: contribution,
    });
  }

  const sum = (fn: (l: LineContribution) => number) => lines.reduce((s, l) => s + fn(l), 0);

  return {
    order_id: orderId,
    order_date: orderDate,
    lines,
    gross_sales_cents: sum(l => l.line_net_cents),
    discount_total_cents: sum(l => l.discount_net_cents),
    return_total_cents: sum(l => l.return_net_cents),
    net_sales_cents: sum(l => l.net_revenue_cents),
    cogs_cents: sum(l => l.cogs_cents),
    gross_margin_cents: sum(l => l.net_revenue_cents) - sum(l => l.cogs_cents),
    shipping_delta_cents: sum(l => l.shipping_delta_cents),
    payment_fee_cents: sum(l => l.payment_fee_cents),
    pickpack_cents: sum(l => l.pickpack_cents),
    return_cost_cents: sum(l => l.return_cost_cents),
    contribution_cents: sum(l => l.contribution_cents),
  };
}

export async function snapshotOrderCost(orderId: string): Promise<void> {
  const result = await computeOrderContribution(orderId);
  if (!result) return;

  const supabase = getServerClient();

  for (const line of result.lines) {
    await supabase
      .from('ci_order_line_cost')
      .upsert({
        tenant_id: 400,
        order_id: result.order_id,
        order_line_id: line.order_line_id,
        variant_id: line.variant_id,
        order_date: result.order_date,
        qty_ordered: line.qty_ordered,
        qty_returned: line.qty_returned,
        unit_net_cents: line.unit_net_cents,
        line_net_cents: line.line_net_cents,
        discount_net_cents: line.discount_net_cents,
        return_net_cents: line.return_net_cents,
        landed_unit_cost_cents: line.landed_unit_cost_cents,
        cost_source: line.cost_source,
        shipping_charged_cents: line.shipping_charged_cents,
        shipping_actual_cents: line.shipping_actual_cents,
        payment_fee_cents: line.payment_fee_cents,
        payment_fee_source: line.payment_fee_source,
        pickpack_cents: line.pickpack_cents,
        return_cost_cents: line.return_cost_cents,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'tenant_id,order_line_id' });
  }
}

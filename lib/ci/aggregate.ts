import { getServerClient } from '@/lib/supabase-server';

const TENANT_ID = 400;

export async function aggregateDailySales(
  tenantId: number,
  factDate: string,
  partial = false,
): Promise<{ rows: number }> {
  const sb = getServerClient();

  const dateStart = `${factDate}T00:00:00.000Z`;
  const dateEnd = `${factDate}T23:59:59.999Z`;

  const { data: orders } = await sb
    .from('shop_orders')
    .select('id, subtotal_net_cents, total_gross_cents, tax_cents, shipping_net_cents, discount_net_cents, state')
    .in('state', ['paid', 'shipped', 'partially_shipped', 'delivered', 'completed'])
    .gte('placed_at', dateStart)
    .lte('placed_at', dateEnd);

  if (!orders?.length) {
    await sb.from('ci_daily_sales').upsert({
      tenant_id: tenantId, fact_date: factDate, partial,
      orders: 0, net_sales_cents: 0, gross_sales_cents: 0, tax_cents: 0,
      shipping_cents: 0, discount_cents: 0, refund_cents: 0, cogs_cents: 0,
      contribution_cents: 0, payment_fee_cents: 0, avg_order_value_cents: 0,
      items_sold: 0, updated_at: new Date().toISOString(),
    }, { onConflict: 'tenant_id,fact_date' });
    return { rows: 0 };
  }

  const orderIds = orders.map(o => o.id);

  const { data: lines } = await sb
    .from('shop_order_lines')
    .select('qty, line_net_cents, discount_net_cents')
    .in('order_id', orderIds)
    .eq('line_type', 'product');

  const { data: payments } = await sb
    .from('shop_payments')
    .select('provider_fee_cents')
    .in('order_id', orderIds)
    .eq('state', 'paid');

  const { data: refunds } = await sb
    .from('shop_refunds')
    .select('amount_cents')
    .in('order_id', orderIds);

  const { data: costRows } = await sb
    .from('ci_order_line_cost')
    .select('cogs_cents, contribution_cents')
    .in('order_id', orderIds);

  const netSales = orders.reduce((s, o) => s + (o.subtotal_net_cents || 0), 0);
  const grossSales = orders.reduce((s, o) => s + (o.total_gross_cents || 0), 0);
  const tax = orders.reduce((s, o) => s + (o.tax_cents || 0), 0);
  const shipping = orders.reduce((s, o) => s + (o.shipping_net_cents || 0), 0);
  const discount = orders.reduce((s, o) => s + (o.discount_net_cents || 0), 0);
  const itemsSold = (lines || []).reduce((s, l) => s + (l.qty || 0), 0);
  const paymentFees = (payments || []).reduce((s, p) => s + (p.provider_fee_cents || 0), 0);
  const refundTotal = (refunds || []).reduce((s, r) => s + (r.amount_cents || 0), 0);
  const cogs = (costRows || []).reduce((s, c) => s + (c.cogs_cents || 0), 0);
  const contribution = (costRows || []).reduce((s, c) => s + (c.contribution_cents || 0), 0);

  await sb.from('ci_daily_sales').upsert({
    tenant_id: tenantId,
    fact_date: factDate,
    partial,
    orders: orders.length,
    net_sales_cents: netSales,
    gross_sales_cents: grossSales,
    tax_cents: tax,
    shipping_cents: shipping,
    discount_cents: discount,
    refund_cents: refundTotal,
    cogs_cents: cogs,
    contribution_cents: contribution,
    payment_fee_cents: paymentFees,
    avg_order_value_cents: orders.length > 0 ? Math.round(netSales / orders.length) : 0,
    items_sold: itemsSold,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'tenant_id,fact_date' });

  return { rows: orders.length };
}

export async function aggregateDailyTraffic(
  tenantId: number,
  factDate: string,
  partial = false,
): Promise<{ rows: number }> {
  const sb = getServerClient();

  const { data: sessions } = await sb
    .from('ci_sessions')
    .select('anonymous_id, page_views, duration_s, is_bounce, is_engaged, is_bot, consent_given')
    .eq('tenant_id', tenantId)
    .eq('session_date', factDate);

  const all = sessions || [];
  const visitors = new Set(all.map(s => s.anonymous_id));

  await sb.from('ci_daily_traffic').upsert({
    tenant_id: tenantId,
    fact_date: factDate,
    partial,
    sessions: all.length,
    unique_visitors: visitors.size,
    page_views: all.reduce((s, r) => s + (r.page_views || 0), 0),
    bounces: all.filter(s => s.is_bounce).length,
    engaged: all.filter(s => s.is_engaged).length,
    avg_duration_s: all.length > 0 ? Math.round(all.reduce((s, r) => s + (r.duration_s || 0), 0) / all.length) : 0,
    bot_sessions: all.filter(s => s.is_bot).length,
    consent_sessions: all.filter(s => s.consent_given).length,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'tenant_id,fact_date' });

  return { rows: all.length };
}

export async function aggregateDailyFunnel(
  tenantId: number,
  factDate: string,
  partial = false,
): Promise<{ rows: number }> {
  const sb = getServerClient();

  const { data: sessions } = await sb
    .from('ci_sessions')
    .select('product_views, cart_adds, checkout_steps, has_order')
    .eq('tenant_id', tenantId)
    .eq('session_date', factDate)
    .eq('is_bot', false);

  const all = sessions || [];

  await sb.from('ci_daily_funnel').upsert({
    tenant_id: tenantId,
    fact_date: factDate,
    partial,
    sessions_total: all.length,
    sessions_product_view: all.filter(s => (s.product_views || 0) > 0).length,
    sessions_cart_add: all.filter(s => (s.cart_adds || 0) > 0).length,
    sessions_checkout: all.filter(s => (s.checkout_steps || 0) > 0).length,
    sessions_payment: all.filter(s => (s.checkout_steps || 0) >= 2).length,
    sessions_order: all.filter(s => s.has_order).length,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'tenant_id,fact_date' });

  return { rows: all.length };
}

export async function aggregateDailyCart(
  tenantId: number,
  factDate: string,
  partial = false,
): Promise<{ rows: number }> {
  const sb = getServerClient();

  const { data: events } = await sb
    .from('ci_events')
    .select('event_type, session_id')
    .eq('tenant_id', tenantId)
    .eq('event_date', factDate)
    .in('event_type', ['cart_add', 'cart_remove', 'cart_view']);

  const all = events || [];
  const cartSessions = new Set(all.map(e => e.session_id).filter(Boolean));

  const { data: convertedSessions } = await sb
    .from('ci_sessions')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('session_date', factDate)
    .eq('has_order', true)
    .gt('cart_adds', 0);

  const converted = new Set((convertedSessions || []).map(s => s.id));
  const abandoned = [...cartSessions].filter(id => !converted.has(id!)).length;

  await sb.from('ci_daily_cart').upsert({
    tenant_id: tenantId,
    fact_date: factDate,
    partial,
    cart_creates: cartSessions.size,
    cart_adds: all.filter(e => e.event_type === 'cart_add').length,
    cart_removes: all.filter(e => e.event_type === 'cart_remove').length,
    cart_views: all.filter(e => e.event_type === 'cart_view').length,
    carts_abandoned: abandoned,
    carts_converted: converted.size,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'tenant_id,fact_date' });

  return { rows: all.length };
}

export async function aggregateDailyCheckout(
  tenantId: number,
  factDate: string,
  partial = false,
): Promise<{ rows: number }> {
  const sb = getServerClient();

  const { data: events } = await sb
    .from('ci_events')
    .select('event_type')
    .eq('tenant_id', tenantId)
    .eq('event_date', factDate)
    .in('event_type', ['checkout_step', 'payment_attempt', 'payment_failed', 'order_paid']);

  const all = events || [];

  await sb.from('ci_daily_checkout').upsert({
    tenant_id: tenantId,
    fact_date: factDate,
    partial,
    checkouts_started: all.filter(e => e.event_type === 'checkout_step').length,
    checkouts_completed: all.filter(e => e.event_type === 'order_paid').length,
    payment_attempts: all.filter(e => e.event_type === 'payment_attempt').length,
    payment_failures: all.filter(e => e.event_type === 'payment_failed').length,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'tenant_id,fact_date' });

  return { rows: all.length };
}

export async function aggregateDailyCustomer(
  tenantId: number,
  factDate: string,
  partial = false,
): Promise<{ rows: number }> {
  const sb = getServerClient();
  const dateStart = `${factDate}T00:00:00.000Z`;
  const dateEnd = `${factDate}T23:59:59.999Z`;

  const { data: todaysOrders } = await sb
    .from('shop_orders')
    .select('email')
    .in('state', ['paid', 'shipped', 'partially_shipped', 'delivered', 'completed'])
    .gte('placed_at', dateStart)
    .lte('placed_at', dateEnd);

  const todayEmails = new Set((todaysOrders || []).map(o => o.email?.toLowerCase()).filter(Boolean));

  const { data: priorOrders } = await sb
    .from('shop_orders')
    .select('email')
    .in('state', ['paid', 'shipped', 'partially_shipped', 'delivered', 'completed'])
    .lt('placed_at', dateStart);

  const priorEmails = new Set((priorOrders || []).map(o => o.email?.toLowerCase()).filter(Boolean));

  let newC = 0, repeatC = 0;
  for (const email of todayEmails) {
    if (priorEmails.has(email)) repeatC++;
    else newC++;
  }

  await sb.from('ci_daily_customer').upsert({
    tenant_id: tenantId,
    fact_date: factDate,
    partial,
    new_customers: newC,
    repeat_customers: repeatC,
    total_customers: todayEmails.size,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'tenant_id,fact_date' });

  return { rows: todayEmails.size };
}

export async function aggregateDailySearch(
  tenantId: number,
  factDate: string,
  partial = false,
): Promise<{ rows: number }> {
  const sb = getServerClient();

  const { data: events } = await sb
    .from('ci_events')
    .select('anonymous_id, payload')
    .eq('tenant_id', tenantId)
    .eq('event_date', factDate)
    .eq('event_type', 'search');

  const all = events || [];
  const searchers = new Set(all.map(e => e.anonymous_id).filter(Boolean));
  const zeroResults = all.filter(e => (e.payload as any)?.result_count === 0).length;

  await sb.from('ci_daily_search').upsert({
    tenant_id: tenantId,
    fact_date: factDate,
    partial,
    searches: all.length,
    unique_searchers: searchers.size,
    zero_result_searches: zeroResults,
    search_exits: 0,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'tenant_id,fact_date' });

  return { rows: all.length };
}

export async function aggregateDailyFulfilment(
  tenantId: number,
  factDate: string,
  partial = false,
): Promise<{ rows: number }> {
  const sb = getServerClient();
  const dateStart = `${factDate}T00:00:00.000Z`;
  const dateEnd = `${factDate}T23:59:59.999Z`;

  const { data: shipments } = await sb
    .from('shop_shipments')
    .select('id')
    .gte('shipped_at', dateStart)
    .lte('shipped_at', dateEnd);

  const { data: returns } = await sb
    .from('shop_returns')
    .select('status')
    .gte('requested_at', dateStart)
    .lte('requested_at', dateEnd);

  const { data: refunds } = await sb
    .from('shop_refunds')
    .select('amount_cents')
    .gte('created_at', dateStart)
    .lte('created_at', dateEnd);

  const allReturns = returns || [];

  await sb.from('ci_daily_fulfilment').upsert({
    tenant_id: tenantId,
    fact_date: factDate,
    partial,
    shipments: (shipments || []).length,
    returns_requested: allReturns.length,
    returns_approved: allReturns.filter(r => r.status === 'approved').length,
    returns_rejected: allReturns.filter(r => r.status === 'rejected').length,
    refunds_issued: (refunds || []).length,
    refund_cents: (refunds || []).reduce((s, r) => s + (r.amount_cents || 0), 0),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'tenant_id,fact_date' });

  return { rows: (shipments || []).length + allReturns.length };
}

export async function aggregateDailyInventory(
  tenantId: number,
  factDate: string,
  partial = false,
): Promise<{ rows: number }> {
  const sb = getServerClient();

  const { data: variants } = await sb
    .from('shop_variants')
    .select('id, on_hand, reserved')
    ;

  const all = variants || [];
  const LOW_STOCK_THRESHOLD = 5;

  await sb.from('ci_daily_inventory').upsert({
    tenant_id: tenantId,
    fact_date: factDate,
    partial,
    total_variants: all.length,
    in_stock: all.filter(v => (v.on_hand || 0) > 0).length,
    out_of_stock: all.filter(v => (v.on_hand || 0) <= 0).length,
    low_stock: all.filter(v => (v.on_hand || 0) > 0 && (v.on_hand || 0) <= LOW_STOCK_THRESHOLD).length,
    total_on_hand: all.reduce((s, v) => s + (v.on_hand || 0), 0),
    total_reserved: all.reduce((s, v) => s + (v.reserved || 0), 0),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'tenant_id,fact_date' });

  return { rows: all.length };
}

export async function aggregateAllForDate(
  tenantId: number,
  factDate: string,
  partial = false,
): Promise<Record<string, number>> {
  const results: Record<string, number> = {};

  const fns: [string, () => Promise<{ rows: number }>][] = [
    ['sales', () => aggregateDailySales(tenantId, factDate, partial)],
    ['traffic', () => aggregateDailyTraffic(tenantId, factDate, partial)],
    ['funnel', () => aggregateDailyFunnel(tenantId, factDate, partial)],
    ['cart', () => aggregateDailyCart(tenantId, factDate, partial)],
    ['checkout', () => aggregateDailyCheckout(tenantId, factDate, partial)],
    ['customer', () => aggregateDailyCustomer(tenantId, factDate, partial)],
    ['search', () => aggregateDailySearch(tenantId, factDate, partial)],
    ['fulfilment', () => aggregateDailyFulfilment(tenantId, factDate, partial)],
    ['inventory', () => aggregateDailyInventory(tenantId, factDate, partial)],
  ];

  for (const [name, fn] of fns) {
    const r = await fn();
    results[name] = r.rows;
  }

  return results;
}

export async function rebuildDays(
  tenantId: number,
  dates: string[],
): Promise<void> {
  for (const d of dates) {
    await aggregateAllForDate(tenantId, d, false);
  }
}

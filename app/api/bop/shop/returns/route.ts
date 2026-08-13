import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const status = sp.get('status');
  const orderId = sp.get('order_id');
  const customerId = sp.get('customer_id');
  const from = sp.get('from');
  const to = sp.get('to');
  const include = sp.get('include');
  const limit = Math.min(100, Math.max(1, Number(sp.get('limit') ?? 25)));
  const offset = Math.max(0, Number(sp.get('offset') ?? 0));

  const supabase = getServerClient();

  const selectCols = include === 'lines'
    ? '*, lines:shop_return_lines(*)'
    : '*';

  let query = supabase
    .from('shop_returns')
    .select(selectCols, { count: 'exact' });

  if (status) query = query.eq('status', status);
  if (orderId) query = query.eq('order_id', orderId);
  if (customerId) query = query.eq('customer_id', customerId);
  if (from) query = query.gte('requested_at', from);
  if (to) query = query.lte('requested_at', to);

  query = query
    .order('requested_at', { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ returns: data, total: count ?? 0 });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { order_id, customer_id, reason_code, reason_text, is_freight, weight_kg, notes, lines } = body;

  if (!order_id) {
    return NextResponse.json({ error: 'order_id is required' }, { status: 400 });
  }

  const freight = is_freight === true || (weight_kg != null && weight_kg > 20);
  const returnWindowDays = freight ? 14 : 30;
  const shippingCostCustomer = weight_kg != null && weight_kg > 20;

  const rmaNumber = `RMA-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  const supabase = getServerClient();

  const { data: ret, error: retErr } = await supabase
    .from('shop_returns')
    .insert({
      rma_number: rmaNumber,
      order_id,
      customer_id: customer_id ?? null,
      status: 'requested',
      reason_code: reason_code ?? null,
      reason_text: reason_text ?? null,
      return_window_days: returnWindowDays,
      is_freight: is_freight ?? false,
      weight_kg: weight_kg ?? null,
      shipping_cost_customer: shippingCostCustomer,
      notes: notes ?? null,
      requested_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (retErr) return NextResponse.json({ error: retErr.message }, { status: 500 });

  if (Array.isArray(lines) && lines.length > 0) {
    const lineRows = lines.map((l: Record<string, unknown>) => ({
      return_id: ret.id,
      order_line_id: l.order_line_id ?? null,
      product_id: l.product_id ?? null,
      variant_id: l.variant_id ?? null,
      sku: l.sku ?? null,
      product_title: l.product_title ?? null,
      quantity: l.quantity ?? 1,
      reason_code: l.reason_code ?? reason_code ?? null,
      reason_text: l.reason_text ?? null,
      unit_price_cents: l.unit_price_cents ?? null,
    }));

    const { error: linesErr } = await supabase
      .from('shop_return_lines')
      .insert(lineRows);

    if (linesErr) return NextResponse.json({ error: linesErr.message }, { status: 500 });
  }

  const { data: full, error: fullErr } = await supabase
    .from('shop_returns')
    .select('*, lines:shop_return_lines(*)')
    .eq('id', ret.id)
    .single();

  if (fullErr) return NextResponse.json({ error: fullErr.message }, { status: 500 });

  return NextResponse.json({ return: full }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, ...fields } = body;

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const allowed = ['status', 'tracking_code', 'carrier', 'label_url', 'notes'];
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in fields) update[key] = fields[key];
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'no valid fields to update' }, { status: 400 });
  }

  const now = new Date().toISOString();
  if (update.status === 'approved') update.approved_at = now;
  if (update.status === 'received') update.received_at = now;
  if (update.status === 'completed') update.completed_at = now;

  const supabase = getServerClient();
  const { data, error } = await supabase
    .from('shop_returns')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ return: data });
}

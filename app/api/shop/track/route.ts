import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const orderNo = searchParams.get('order_no');
  const postcode = searchParams.get('postcode');

  if (!orderNo || !postcode) {
    return NextResponse.json(
      { error: 'Both order_no and postcode are required' },
      { status: 400 },
    );
  }

  const supabase = getServerClient();
  const pc = postcode.trim().toLowerCase();

  const { data: order, error: orderError } = await supabase
    .from('shop_orders')
    .select('id, order_number, status, created_at, billing_address, shipping_address')
    .eq('order_number', orderNo)
    .maybeSingle();

  if (orderError) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const billingPc = (order.billing_address?.postcode ?? '').toLowerCase();
  const shippingPc = (order.shipping_address?.postcode ?? '').toLowerCase();

  if (pc !== billingPc && pc !== shippingPc) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const [shipmentsRes, returnsRes] = await Promise.all([
    supabase
      .from('shop_shipments')
      .select('tracking_code, carrier, status, shipped_at, delivered_at')
      .eq('order_id', order.id)
      .order('shipped_at', { ascending: false, nullsFirst: false }),
    supabase
      .from('shop_returns')
      .select('rma_number, status, tracking_code, carrier')
      .eq('order_id', order.id)
      .order('created_at', { ascending: false, nullsFirst: false }),
  ]);

  if (shipmentsRes.error || returnsRes.error) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }

  return NextResponse.json({
    order_number: order.order_number,
    status: order.status,
    created_at: order.created_at,
    shipments: shipmentsRes.data,
    returns: returnsRes.data,
  });
}

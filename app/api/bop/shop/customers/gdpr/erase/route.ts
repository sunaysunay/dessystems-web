import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { customer_id } = body;

  if (!customer_id) {
    return NextResponse.json({ error: 'customer_id is required' }, { status: 400 });
  }

  const supabase = getServerClient();

  const { data: orders, error: fetchErr } = await supabase
    .from('shop_orders')
    .select('id')
    .eq('customer_id', customer_id);

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });

  const orderIds = (orders ?? []).map((o) => o.id);

  if (orderIds.length === 0) {
    return NextResponse.json({ erased: true, orders_anonymized: 0 });
  }

  const { error: updateErr } = await supabase
    .from('shop_orders')
    .update({
      customer_email: 'erased@gdpr',
      customer_name: 'GDPR Erased',
      customer_phone: null,
      shipping_address: null,
      billing_address: null,
    })
    .eq('customer_id', customer_id);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  return NextResponse.json({ erased: true, orders_anonymized: orderIds.length });
}

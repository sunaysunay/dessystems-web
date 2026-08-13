import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { notifyRefundAwaitingApproval } from '@/lib/shop/notify';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const status = sp.get('status');
  const orderId = sp.get('order_id');
  const limit = Math.min(100, Math.max(1, Number(sp.get('limit') ?? 50)));
  const offset = Math.max(0, Number(sp.get('offset') ?? 0));

  const supabase = getServerClient();
  let query = supabase
    .from('shop_refund_requests')
    .select('*', { count: 'exact' });

  if (status) query = query.eq('status', status);
  if (orderId) query = query.eq('order_id', orderId);

  query = query
    .order('requested_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ refund_requests: data, total: count ?? 0 });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { order_id, amount_cents, payment_id, reason, reason_code, requested_by, currency } = body;

  if (!order_id || amount_cents == null) {
    return NextResponse.json({ error: 'order_id and amount_cents are required' }, { status: 400 });
  }

  const autoApproved = amount_cents <= 5000;

  const supabase = getServerClient();
  const { data, error } = await supabase
    .from('shop_refund_requests')
    .insert({
      order_id,
      amount_cents,
      payment_id: payment_id ?? null,
      reason: reason ?? null,
      reason_code: reason_code ?? null,
      requested_by: requested_by ?? null,
      currency: currency ?? 'EUR',
      auto_approved: autoApproved,
      status: autoApproved ? 'approved' : 'pending',
      approved_at: autoApproved ? new Date().toISOString() : null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!autoApproved) {
    const { data: order } = await supabase.from('shop_orders').select('order_number').eq('id', order_id).maybeSingle();
    void notifyRefundAwaitingApproval(data.id, order?.order_number ?? order_id, amount_cents, reason ?? null);
  }

  return NextResponse.json({ refund_request: data }, { status: 201 });
}

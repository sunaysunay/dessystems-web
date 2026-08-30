export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { getTenantId } from '@/lib/tenant';

const TENANT_ID = getTenantId('console');

export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const { searchParams } = new URL(req.url);

  // Token-based lookup (public, no tenant filter)
  const token = searchParams.get('token');
  if (token) {
    const { data, error } = await supabase
      .from('wrk_approvals')
      .select('*, wrk_orders(wo_number)')
      .eq('token', token)
      .single();
    if (error || !data) return NextResponse.json({ error: 'Approval not found' }, { status: 404 });
    return NextResponse.json({ data });
  }

  // Internal list with filters
  const page = Number(searchParams.get('page') ?? '1');
  const limit = Math.min(Number(searchParams.get('limit') ?? '25'), 100);
  const offset = (page - 1) * limit;
  const status = searchParams.get('status');
  const workOrderId = searchParams.get('work_order_id');

  let query = supabase
    .from('wrk_approvals')
    .select('*, wrk_orders(wo_number)', { count: 'exact' })
    .eq('tenant_id', TENANT_ID)
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);
  if (workOrderId) query = query.eq('work_order_id', workOrderId);

  const { data, error, count } = await query.range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data, total: count, page, limit });
}

export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const body = await req.json();

  const { work_order_id, items, expires_at } = body;
  if (!work_order_id || !items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'work_order_id and items[] are required' }, { status: 400 });
  }

  // Calculate totals for each item and overall
  const processedItems = items.map((item: { description: string; quantity: number; unit_price: number; recommended?: boolean }) => ({
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unit_price,
    total: Math.round(item.quantity * item.unit_price * 100) / 100,
    recommended: item.recommended ?? true,
  }));
  const totalAmount = processedItems.reduce((sum: number, i: { total: number }) => sum + i.total, 0);

  // Generate a UUID token
  const token = crypto.randomUUID();

  const { data, error } = await supabase
    .from('wrk_approvals')
    .insert({
      tenant_id: TENANT_ID,
      work_order_id,
      token,
      status: 'pending',
      items: processedItems,
      total_amount: Math.round(totalAmount * 100) / 100,
      expires_at: expires_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select('*, wrk_orders(wo_number)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const supabase = getServerClient();
  const body = await req.json();
  const { id, token, ...updates } = body;

  // Token-based update (public customer response)
  if (token) {
    const { data: existing } = await supabase
      .from('wrk_approvals')
      .select('id, status, expires_at')
      .eq('token', token)
      .single();

    if (!existing) return NextResponse.json({ error: 'Approval not found' }, { status: 404 });
    if (existing.status !== 'pending') {
      return NextResponse.json({ error: 'Already responded' }, { status: 400 });
    }
    if (existing.expires_at && new Date(existing.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Approval request has expired' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('wrk_approvals')
      .update({
        status: updates.status,
        customer_response: updates.customer_response,
        signature_data: updates.signature_data,
        items: updates.items,
        responded_at: new Date().toISOString(),
        ip_address: updates.ip_address,
        user_agent: updates.user_agent,
      })
      .eq('token', token)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  // Internal update by id
  if (!id) return NextResponse.json({ error: 'id or token required' }, { status: 400 });

  const { data, error } = await supabase
    .from('wrk_approvals')
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', TENANT_ID)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { getTenantId } from '@/lib/tenant';

const TENANT_ID = getTenantId('console');

export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get('page') ?? '1');
  const limit = Math.min(Number(searchParams.get('limit') ?? '25'), 100);
  const offset = (page - 1) * limit;
  const status = searchParams.get('status');
  const expiryBefore = searchParams.get('expiry_before');
  const expiryAfter = searchParams.get('expiry_after');
  const search = searchParams.get('search');
  const view = searchParams.get('view');

  // KPI summary view
  if (view === 'kpi') {
    const now = new Date();
    const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const nextMonthEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const fmt = (d: Date) => d.toISOString().split('T')[0];

    const [thisMonth, nextMonth, sent, booked] = await Promise.all([
      supabase.from('wrk_apk_reminders').select('id', { count: 'exact', head: true })
        .eq('tenant_id', TENANT_ID)
        .gte('apk_expiry', fmt(now)).lte('apk_expiry', fmt(thisMonthEnd)),
      supabase.from('wrk_apk_reminders').select('id', { count: 'exact', head: true })
        .eq('tenant_id', TENANT_ID)
        .gte('apk_expiry', fmt(nextMonthStart)).lte('apk_expiry', fmt(nextMonthEnd)),
      supabase.from('wrk_apk_reminders').select('id', { count: 'exact', head: true })
        .eq('tenant_id', TENANT_ID).eq('status', 'sent'),
      supabase.from('wrk_apk_reminders').select('id', { count: 'exact', head: true })
        .eq('tenant_id', TENANT_ID).eq('status', 'booked'),
    ]);

    return NextResponse.json({
      expiring_this_month: thisMonth.count ?? 0,
      expiring_next_month: nextMonth.count ?? 0,
      reminders_sent: sent.count ?? 0,
      booked: booked.count ?? 0,
    });
  }

  let query = supabase
    .from('wrk_apk_reminders')
    .select('*', { count: 'exact' })
    .eq('tenant_id', TENANT_ID);

  if (status) query = query.eq('status', status);
  if (expiryBefore) query = query.lte('apk_expiry', expiryBefore);
  if (expiryAfter) query = query.gte('apk_expiry', expiryAfter);
  if (search) {
    query = query.or(`vehicle_id.eq.${search},customer_id.eq.${search}`);
  }

  const { data, error, count } = await query
    .order('apk_expiry', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data, total: count, page, limit });
}

export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const body = await req.json();

  // Bulk import action
  if (body.action === 'bulk_import') {
    const items = body.items;
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'items array required' }, { status: 400 });
    }
    const rows = items.map((item: { vehicle_id: string; customer_id: string; apk_expiry: string }) => ({
      tenant_id: TENANT_ID,
      vehicle_id: item.vehicle_id,
      customer_id: item.customer_id,
      apk_expiry: item.apk_expiry,
      status: 'pending',
      channel: 'email',
    }));
    const { data, error } = await supabase
      .from('wrk_apk_reminders')
      .insert(rows)
      .select();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ imported: data?.length ?? 0 }, { status: 201 });
  }

  // Bulk send action
  if (body.action === 'bulk_send') {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('wrk_apk_reminders')
      .update({ status: 'sent', reminder_sent_at: now })
      .eq('tenant_id', TENANT_ID)
      .eq('status', 'pending')
      .select();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ sent: data?.length ?? 0 });
  }

  // Single create
  const { vehicle_id, customer_id, apk_expiry, channel } = body;
  if (!vehicle_id || !customer_id || !apk_expiry) {
    return NextResponse.json({ error: 'vehicle_id, customer_id, apk_expiry required' }, { status: 400 });
  }
  const { data, error } = await supabase
    .from('wrk_apk_reminders')
    .insert({
      tenant_id: TENANT_ID,
      vehicle_id,
      customer_id,
      apk_expiry,
      channel: channel ?? 'email',
      status: 'pending',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const supabase = getServerClient();
  const body = await req.json();
  const { id, status, reminder_sent_at, campaign_id } = body;

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const update: Record<string, unknown> = {};
  if (status) update.status = status;
  if (reminder_sent_at) update.reminder_sent_at = reminder_sent_at;
  if (campaign_id) update.campaign_id = campaign_id;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('wrk_apk_reminders')
    .update(update)
    .eq('id', id)
    .eq('tenant_id', TENANT_ID)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

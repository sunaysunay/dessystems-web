export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { getTenantId } from '@/lib/tenant';
import { updateAssetFromWO } from '@/lib/wrk/integrations/ast-writeback';
import { createWOTask } from '@/lib/wrk/integrations/ops-tasks';
import { runWOIntegrations } from './integrations';

const TENANT_ID = getTenantId('console');

export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get('page') ?? '1');
  const limit = Math.min(Number(searchParams.get('limit') ?? '25'), 100);
  const offset = (page - 1) * limit;

  let query = supabase
    .from('wrk_orders')
    .select(`
      *,
      wrk_technicians ( id, display_name, grade ),
      wrk_order_lines ( id, line_type, description, hours, rate, quantity, unit_price, total )
    `, { count: 'exact' })
    .eq('tenant_id', TENANT_ID)
    .is('deleted_at', null);

  const status = searchParams.get('status');
  if (status) query = query.eq('status', status);

  const type = searchParams.get('type');
  if (type) query = query.eq('type', type);

  const vehicleId = searchParams.get('vehicle_id');
  if (vehicleId) query = query.eq('vehicle_id', vehicleId);

  const customerId = searchParams.get('customer_id');
  if (customerId) query = query.eq('customer_id', customerId);

  const technicianId = searchParams.get('technician_id');
  if (technicianId) query = query.eq('technician_id', technicianId);

  const search = searchParams.get('q');
  if (search) query = query.ilike('wo_number', `%${search}%`);

  query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data, total: count, page, limit });
}

export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const body = await req.json();

  if (body.action === 'create_with_lines') {
    const { lines, ...orderData } = body;
    const { data: order, error: orderErr } = await supabase
      .from('wrk_orders')
      .insert({ ...orderData, tenant_id: TENANT_ID, action: undefined })
      .select()
      .single();

    if (orderErr) return NextResponse.json({ error: orderErr.message }, { status: 500 });

    if (lines && Array.isArray(lines) && lines.length > 0) {
      const lineRows = lines.map((l: Record<string, unknown>, i: number) => {
        const { total, ...rest } = l;
        return { ...rest, order_id: order.id, tenant_id: TENANT_ID, sort_order: i };
      });
      const { error: lineErr } = await supabase.from('wrk_order_lines').insert(lineRows);
      if (lineErr) return NextResponse.json({ error: lineErr.message, order }, { status: 500 });
    }

    return NextResponse.json(order, { status: 201 });
  }

  const { data, error } = await supabase
    .from('wrk_orders')
    .insert({ ...body, tenant_id: TENANT_ID })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const supabase = getServerClient();
  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { data, error } = await supabase
    .from('wrk_orders')
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', TENANT_ID)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // --- WRK integrations (best-effort, non-blocking) ---

  // AST vehicle write-back: update mileage / last_service_date
  if (updates.status === 'completed' || updates.mileage_at_intake != null) {
    updateAssetFromWO(supabase, data).catch(() => {});
  }

  // OPS task auto-creation on status transitions
  const STATUS_TO_TRIGGER: Record<string, 'parts_ordered' | 'ready_pickup' | 'approval_needed'> = {
    waiting_parts: 'parts_ordered',
    completed: 'ready_pickup',
    waiting_approval: 'approval_needed',
  };

  const trigger = updates.status ? STATUS_TO_TRIGGER[updates.status] : undefined;
  if (trigger && data.wo_number) {
    createWOTask(supabase, {
      tenantId: TENANT_ID,
      trigger,
      woId: data.id,
      woNumber: data.wo_number,
    }).catch(() => {});
  }

  // SAL warranty claim + CRM contact enrichment on completion
  if (updates.status === 'completed') {
    runWOIntegrations(supabase, data).catch(() => {});
  }

  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const supabase = getServerClient();
  const { id } = await req.json();

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { error } = await supabase
    .from('wrk_orders')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', TENANT_ID);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

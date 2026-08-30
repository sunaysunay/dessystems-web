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

  const workOrderId = searchParams.get('work_order_id');
  const vehicleId = searchParams.get('vehicle_id');
  const conditionGrade = searchParams.get('condition_grade');

  let query = supabase
    .from('wrk_inspections')
    .select(
      '*, wrk_orders(wo_number, status), wrk_technicians(display_name)',
      { count: 'exact' }
    )
    .eq('tenant_id', TENANT_ID)
    .order('created_at', { ascending: false });

  if (workOrderId) query = query.eq('work_order_id', workOrderId);
  if (vehicleId) query = query.eq('vehicle_id', vehicleId);
  if (conditionGrade) query = query.eq('condition_grade', conditionGrade);

  const { data, error, count } = await query.range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Flatten joined fields for easier frontend consumption
  const rows = (data ?? []).map((r: Record<string, unknown>) => {
    const wo = r.wrk_orders as Record<string, unknown> | null;
    const tech = r.wrk_technicians as Record<string, unknown> | null;
    return {
      ...r,
      wo_number: wo?.wo_number ?? null,
      wo_status: wo?.status ?? null,
      inspector_name: tech?.display_name ?? null,
      wrk_orders: undefined,
      wrk_technicians: undefined,
    };
  });

  return NextResponse.json({ data: rows, total: count, page, limit });
}

export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const body = await req.json();

  const allowed = ['work_order_id', 'vehicle_id', 'inspector_id', 'checklist', 'summary'];
  const insert: Record<string, unknown> = { tenant_id: TENANT_ID };
  for (const k of allowed) {
    if (body[k] !== undefined) insert[k] = body[k];
  }

  const { data, error } = await supabase
    .from('wrk_inspections')
    .insert(insert)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const supabase = getServerClient();
  const body = await req.json();
  const { id, ...fields } = body;

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const allowed = ['checklist', 'photos', 'condition_grade', 'summary'];
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const k of allowed) {
    if (fields[k] !== undefined) update[k] = fields[k];
  }

  const { data, error } = await supabase
    .from('wrk_inspections')
    .update(update)
    .eq('id', id)
    .eq('tenant_id', TENANT_ID)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

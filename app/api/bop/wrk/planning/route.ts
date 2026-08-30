export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { getTenantId } from '@/lib/tenant';

const TENANT_ID = getTenantId('console');

/** Monday 00:00 of the ISO week containing `d`. */
function weekMonday(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** Saturday 23:59:59 of the same ISO week. */
function weekSaturday(mon: Date): Date {
  const sat = new Date(mon);
  sat.setDate(sat.getDate() + 5);
  sat.setHours(23, 59, 59, 999);
  return sat;
}

export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const { searchParams } = new URL(req.url);

  // Determine date range
  let rangeStart: Date;
  let rangeEnd: Date;

  const dateParam = searchParams.get('date');
  const weekParam = searchParams.get('week');
  const techParam = searchParams.get('technician_id');

  if (dateParam) {
    // Single day
    rangeStart = new Date(dateParam + 'T00:00:00');
    rangeEnd = new Date(dateParam + 'T23:59:59.999');
  } else if (weekParam) {
    // Week starting from provided Monday
    rangeStart = new Date(weekParam + 'T00:00:00');
    rangeEnd = weekSaturday(rangeStart);
  } else {
    // Default: current week Mon-Sat
    rangeStart = weekMonday(new Date());
    rangeEnd = weekSaturday(rangeStart);
  }

  let query = supabase
    .from('wrk_planning_slots')
    .select(`*, technician:wrk_technicians(id, display_name, grade), order:wrk_orders(id, wo_number, status)`)
    .eq('tenant_id', TENANT_ID)
    .gte('start_at', rangeStart.toISOString())
    .lte('start_at', rangeEnd.toISOString())
    .order('start_at', { ascending: true });

  if (techParam) {
    query = query.eq('technician_id', techParam);
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch active technicians
  const { data: technicians, error: techErr } = await supabase
    .from('wrk_technicians')
    .select('id, display_name, grade, specializations, bay_preference, hourly_capacity')
    .eq('tenant_id', TENANT_ID)
    .eq('active', true)
    .order('display_name');

  if (techErr) return NextResponse.json({ error: techErr.message }, { status: 500 });

  return NextResponse.json({ data, technicians });
}

export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const body = await req.json();

  const { technician_id, bay_id, start_at, end_at, work_order_id, slot_type, notes } = body;

  if (!technician_id || !start_at || !end_at || !slot_type) {
    return NextResponse.json({ error: 'Missing required fields: technician_id, start_at, end_at, slot_type' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('wrk_planning_slots')
    .insert({
      tenant_id: TENANT_ID,
      technician_id,
      bay_id: bay_id || null,
      start_at,
      end_at,
      work_order_id: work_order_id || null,
      slot_type,
      notes: notes || null,
    })
    .select(`*, technician:wrk_technicians(id, display_name, grade), order:wrk_orders(id, wo_number, status)`)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const supabase = getServerClient();
  const body = await req.json();

  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: 'Missing slot id' }, { status: 400 });

  // Only allow specific fields to be updated
  const allowed: Record<string, unknown> = {};
  for (const key of ['start_at', 'end_at', 'technician_id', 'bay_id', 'work_order_id', 'slot_type', 'notes']) {
    if (updates[key] !== undefined) allowed[key] = updates[key];
  }

  const { data, error } = await supabase
    .from('wrk_planning_slots')
    .update(allowed)
    .eq('id', id)
    .eq('tenant_id', TENANT_ID)
    .select(`*, technician:wrk_technicians(id, display_name, grade), order:wrk_orders(id, wo_number, status)`)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function DELETE(req: NextRequest) {
  const supabase = getServerClient();
  const body = await req.json();

  const { id } = body;
  if (!id) return NextResponse.json({ error: 'Missing slot id' }, { status: 400 });

  const { error } = await supabase
    .from('wrk_planning_slots')
    .delete()
    .eq('id', id)
    .eq('tenant_id', TENANT_ID);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

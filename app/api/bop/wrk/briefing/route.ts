export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { getTenantId } from '@/lib/tenant';

const TENANT_ID = getTenantId('console');

export async function GET(_req: NextRequest) {
  const supabase = getServerClient();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  // 1. Today's planning slots with technician + WO info
  const { data: slots, error: slotsErr } = await supabase
    .from('wrk_planning_slots')
    .select(`*, technician:wrk_technicians(id, display_name, grade), order:wrk_orders(id, wo_number, status, description)`)
    .eq('tenant_id', TENANT_ID)
    .gte('start_at', todayStart.toISOString())
    .lte('start_at', todayEnd.toISOString())
    .order('start_at', { ascending: true });

  if (slotsErr) return NextResponse.json({ error: slotsErr.message }, { status: 500 });

  // 2. WOs waiting for parts
  const { data: waitingParts, error: wpErr } = await supabase
    .from('wrk_orders')
    .select('id, wo_number, description, status')
    .eq('tenant_id', TENANT_ID)
    .eq('status', 'waiting_parts');

  if (wpErr) return NextResponse.json({ error: wpErr.message }, { status: 500 });

  // 3. WOs waiting for approval
  const { data: waitingApproval, error: waErr } = await supabase
    .from('wrk_orders')
    .select('id, wo_number, description, status')
    .eq('tenant_id', TENANT_ID)
    .eq('status', 'waiting_approval');

  if (waErr) return NextResponse.json({ error: waErr.message }, { status: 500 });

  // 4. All active technicians
  const { data: technicians, error: techErr } = await supabase
    .from('wrk_technicians')
    .select('id, display_name, grade, active')
    .eq('tenant_id', TENANT_ID)
    .eq('active', true)
    .order('display_name');

  if (techErr) return NextResponse.json({ error: techErr.message }, { status: 500 });

  // 5. Inspections scheduled today
  const { data: inspections, error: inspErr } = await supabase
    .from('wrk_apk_reminders')
    .select('id, license_plate, apk_expiry_date, status')
    .eq('tenant_id', TENANT_ID)
    .gte('apk_expiry_date', todayStart.toISOString().slice(0, 10))
    .lte('apk_expiry_date', todayEnd.toISOString().slice(0, 10));

  if (inspErr) return NextResponse.json({ error: inspErr.message }, { status: 500 });

  // Build technician availability map
  const techSlotMap = new Map<string, typeof slots>();
  for (const slot of slots ?? []) {
    const tid = slot.technician_id;
    if (!techSlotMap.has(tid)) techSlotMap.set(tid, []);
    techSlotMap.get(tid)!.push(slot);
  }

  const techAvailability = (technicians ?? []).map((t: Record<string, unknown>) => ({
    ...t,
    has_slots_today: techSlotMap.has(t.id as string),
    slots: techSlotMap.get(t.id as string) ?? [],
  }));

  return NextResponse.json({
    slots: slots ?? [],
    waiting_parts: waitingParts ?? [],
    waiting_approval: waitingApproval ?? [],
    technicians: techAvailability,
    inspections: inspections ?? [],
    generated_at: new Date().toISOString(),
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

// GET /api/bop/sal/appointments?status=&inspection_type=&date_from=&date_to=&q=
export async function GET(req: NextRequest) {
  const sb = getServerClient();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') ?? '';
  const itype = searchParams.get('inspection_type') ?? '';
  const dateFrom = searchParams.get('date_from') ?? '';
  const dateTo = searchParams.get('date_to') ?? '';
  const q = searchParams.get('q') ?? '';

  let query = sb
    .from('bop_appointments')
    .select('id, ref, tenant_id, date, time_slot, inspection_type, vehicle_url, vin, name, email, phone, message, status, locale, source, internal_notes, confirmed_at, completed_at, created_at')
    .eq('tenant_id', 300)
    .order('date', { ascending: false })
    .order('time_slot', { ascending: true })
    .limit(500);

  if (status) query = query.eq('status', status);
  if (itype) query = query.eq('inspection_type', itype);
  if (dateFrom) query = query.gte('date', dateFrom);
  if (dateTo) query = query.lte('date', dateTo);
  if (q) query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%,ref.ilike.%${q}%,vehicle_url.ilike.%${q}%,vin.ilike.%${q}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ appointments: data ?? [] });
}

// PATCH /api/bop/sal/appointments — bulk status update
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { ids, status } = body as { ids?: string[]; status?: string };
  if (!ids?.length || !status) {
    return NextResponse.json({ error: 'ids[] and status required' }, { status: 400 });
  }
  const valid: Status[] = ['pending', 'confirmed', 'completed', 'cancelled', 'no_show'];
  if (!valid.includes(status as Status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }
  const patch: Record<string, any> = { status };
  if (status === 'confirmed') patch.confirmed_at = new Date().toISOString();
  if (status === 'completed') patch.completed_at = new Date().toISOString();
  if (status === 'pending') { patch.confirmed_at = null; patch.completed_at = null; }

  const sb = getServerClient();
  const { data, error } = await sb
    .from('bop_appointments')
    .update(patch)
    .in('id', ids)
    .eq('tenant_id', 300)
    .select('id, status');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ updated: data ?? [] });
}

// DELETE /api/bop/sal/appointments — bulk delete (no_show only)
export async function DELETE(req: NextRequest) {
  const body = await req.json();
  const { ids } = body as { ids?: string[] };
  if (!ids?.length) {
    return NextResponse.json({ error: 'ids[] required' }, { status: 400 });
  }

  const sb = getServerClient();

  // Verify all are no_show
  const { data: check } = await sb
    .from('bop_appointments')
    .select('id, status')
    .in('id', ids)
    .eq('tenant_id', 300);
  const nonNoShow = (check ?? []).filter(a => a.status !== 'no_show');
  if (nonNoShow.length > 0) {
    return NextResponse.json({ error: 'Only appointments with status "no_show" can be deleted' }, { status: 400 });
  }

  // Delete related comm_history entries
  await sb.from('bop_comm_history').delete().in('record_id', ids).eq('module', 'appointment');

  // Delete related crm_activities (linked via lead lookup is indirect, but clean up by record)
  // Delete the appointments
  const { error } = await sb
    .from('bop_appointments')
    .delete()
    .in('id', ids)
    .eq('tenant_id', 300);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: ids.length });
}

type Status = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';

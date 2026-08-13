import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { callerUid } from '@/lib/api-guard';

export const dynamic = 'force-dynamic';

// GET /api/bop/sal/sell-leads?status=&vehicle_type=&active=1
const ACTIVE = ['new', 'reviewing', 'offer_sent', 'negotiating', 'accepted'];
const DELETABLE = ['declined_by_us', 'lost'];

export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') ?? '';
  const vtype = searchParams.get('vehicle_type') ?? '';
  const activeOnly = searchParams.get('active') === '1';
  const search = searchParams.get('q') ?? '';

  let q = supabase.from('sell_leads')
    .select('id, ref, created_at, vehicle_type, make, model, build_year, mileage_km, condition, asking_price_eur, our_offer_eur, status, source, seller_name, seller_email, seller_phone, license_plate, internal_notes')
    .order('created_at', { ascending: false })
    .limit(300);
  if (status) q = q.eq('status', status);
  else if (activeOnly) q = q.in('status', ACTIVE);
  if (vtype) q = q.eq('vehicle_type', vtype);
  if (search) q = q.or(`ref.ilike.%${search}%,make.ilike.%${search}%,model.ilike.%${search}%,license_plate.ilike.%${search}%,seller_name.ilike.%${search}%,seller_email.ilike.%${search}%,seller_phone.ilike.%${search}%,internal_notes.ilike.%${search}%`);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ leads: data ?? [] });
}

// PATCH /api/bop/sal/sell-leads — bulk status update or delete
export async function PATCH(req: NextRequest) {
  const supabase = getServerClient();
  const actor = await callerUid() || 'console';
  const { ids, action, status } = await req.json() as { ids: string[]; action: 'set_status' | 'delete'; status?: string };

  if (!ids?.length) return NextResponse.json({ error: 'ids required' }, { status: 400 });

  if (action === 'delete') {
    const { data: rows } = await supabase.from('sell_leads').select('id, status').in('id', ids);
    const deletable = (rows ?? []).filter(r => DELETABLE.includes(r.status)).map(r => r.id);
    if (!deletable.length) return NextResponse.json({ error: 'only terminal-status leads can be deleted' }, { status: 400 });
    await supabase.from('sell_lead_events').insert(deletable.map(id => ({ lead_id: id, event: 'deleted', actor, payload: {} })));
    const { error } = await supabase.from('sell_leads').delete().in('id', deletable);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, deleted: deletable.length });
  }

  if (action === 'set_status' && status) {
    const { error } = await supabase.from('sell_leads').update({ status }).in('id', ids);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await supabase.from('sell_lead_events').insert(ids.map(id => ({ lead_id: id, event: 'status_changed', actor, payload: { to: status, bulk: true } })));
    return NextResponse.json({ ok: true, updated: ids.length });
  }

  return NextResponse.json({ error: 'invalid action' }, { status: 400 });
}

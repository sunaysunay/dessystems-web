import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

// BOP Object Lock Service (OLS) — SAP-style enqueue/dequeue over Postgres RPCs.
// GET    ?all=1                       → all live locks (SY032 Lock Monitor)
// GET    ?type=listing&id=…           → lock state of one object
// POST   {type,id,user,session,reason} → acquire (atomic upsert; 423 if held)
// PUT    {type,id,session}             → heartbeat (extends the 4-min lease)
// DELETE {type,id,session}  |  {type,id,force:true} → release / admin force-release

export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const sp = req.nextUrl.searchParams;
  if (sp.get('all')) {
    const { data, error } = await supabase.from('bop_object_locks').select('*')
      .gt('expires_at', new Date().toISOString()).order('acquired_at', { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ locks: data ?? [] });
  }
  const type = sp.get('type'), id = sp.get('id');
  if (!type || !id) return NextResponse.json({ error: 'type and id required' }, { status: 400 });
  const { data } = await supabase.from('bop_object_locks').select('*')
    .eq('object_type', type).eq('object_id', id).gt('expires_at', new Date().toISOString()).maybeSingle();
  return NextResponse.json({ lock: data ?? null });
}

export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const b = await req.json();
  if (!b.type || !b.id || !b.session) return NextResponse.json({ error: 'type, id, session required' }, { status: 400 });
  const { data, error } = await supabase.rpc('bop_acquire_lock', {
    p_type: b.type, p_id: String(b.id), p_user: b.user || 'unknown', p_session: b.session, p_reason: b.reason || 'edit',
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (data && data.length) return NextResponse.json({ acquired: true, lock: data[0] });
  // zero rows = held by someone else — return the owner for the banner
  const { data: holder } = await supabase.from('bop_object_locks').select('*')
    .eq('object_type', b.type).eq('object_id', String(b.id)).maybeSingle();
  return NextResponse.json({ acquired: false, lock: holder ?? null }, { status: 423 });
}

export async function PUT(req: NextRequest) {
  const supabase = getServerClient();
  const b = await req.json();
  const { data, error } = await supabase.rpc('bop_heartbeat_lock', {
    p_type: b.type, p_id: String(b.id), p_session: b.session,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: !!data });
}

export async function DELETE(req: NextRequest) {
  const supabase = getServerClient();
  // sendBeacon posts text/plain — parse defensively
  let b: any = {};
  try { b = JSON.parse(await req.text()); } catch { /* empty */ }
  if (!b.type || !b.id) return NextResponse.json({ error: 'type and id required' }, { status: 400 });
  if (b.force) {
    // admin force-release (SY032) — audited
    await supabase.from('bop_object_locks').delete().eq('object_type', b.type).eq('object_id', String(b.id));
    await supabase.from('bop_change_log').insert({
      actor_email: b.user || 'admin', action: 'LOCK_FORCE_RELEASED',
      object_type: b.type, object_id: String(b.id),
      new_value: { source: 'SY032' },
    }).then(() => {}, () => {}); // best-effort audit
    return NextResponse.json({ ok: true, forced: true });
  }
  if (!b.session) return NextResponse.json({ error: 'session required' }, { status: 400 });
  const { data } = await supabase.rpc('bop_release_lock', { p_type: b.type, p_id: String(b.id), p_session: b.session });
  return NextResponse.json({ ok: !!data });
}

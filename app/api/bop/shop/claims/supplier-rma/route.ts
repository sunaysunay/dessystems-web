import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const claim_id = sp.get('claim_id');
  const status = sp.get('status');
  const limit = Math.min(100, Math.max(1, Number(sp.get('limit') ?? 25)));
  const offset = Math.max(0, Number(sp.get('offset') ?? 0));

  const supabase = getServerClient();

  let query = supabase
    .from('shop_supplier_rmas')
    .select('*', { count: 'exact' });

  if (claim_id) query = query.eq('claim_id', claim_id);
  if (status) query = query.eq('status', status);

  query = query
    .order('created_at', { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ rmas: data, total: count ?? 0 });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { claim_id, supplier_name, supplier_ref, deadline_at, notes } = body;

  if (!claim_id || !supplier_name) {
    return NextResponse.json(
      { error: 'claim_id and supplier_name are required' },
      { status: 400 },
    );
  }

  const supabase = getServerClient();

  const { data: rma, error: rmaErr } = await supabase
    .from('shop_supplier_rmas')
    .insert({
      claim_id,
      supplier_name,
      supplier_ref: supplier_ref ?? null,
      deadline_at: deadline_at ?? null,
      notes: notes ?? null,
    })
    .select()
    .single();

  if (rmaErr) return NextResponse.json({ error: rmaErr.message }, { status: 500 });

  await supabase.from('shop_claim_events').insert({
    claim_id,
    event_type: 'supplier_rma_created',
    detail: { rma_id: rma.id, supplier_name },
  });

  const { data: claim } = await supabase
    .from('shop_claims')
    .select('status')
    .eq('id', claim_id)
    .single();

  if (claim?.status === 'investigating') {
    await supabase
      .from('shop_claims')
      .update({ status: 'awaiting_supplier', updated_at: new Date().toISOString() })
      .eq('id', claim_id);

    await supabase.from('shop_claim_events').insert({
      claim_id,
      event_type: 'status_change',
      from_status: 'investigating',
      to_status: 'awaiting_supplier',
    });
  }

  return NextResponse.json({ rma }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, status, tracking_code, carrier, resolution_type, notes } = body;

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const supabase = getServerClient();

  const { data: existing, error: fetchErr } = await supabase
    .from('shop_supplier_rmas')
    .select('status')
    .eq('id', id)
    .single();

  if (fetchErr || !existing) {
    return NextResponse.json({ error: 'RMA not found' }, { status: 404 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (status !== undefined) updates.status = status;
  if (tracking_code !== undefined) updates.tracking_code = tracking_code;
  if (carrier !== undefined) updates.carrier = carrier;
  if (resolution_type !== undefined) updates.resolution_type = resolution_type;
  if (notes !== undefined) updates.notes = notes;

  if (status && status !== existing.status) {
    if (status === 'submitted') updates.submitted_at = new Date().toISOString();
    if (status === 'resolved') updates.resolved_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('shop_supplier_rmas')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ rma: data });
}

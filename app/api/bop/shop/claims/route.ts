import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const status = sp.get('status');
  const claim_type = sp.get('claim_type');
  const priority = sp.get('priority');
  const customer_id = sp.get('customer_id');
  const order_id = sp.get('order_id');
  const from = sp.get('from');
  const to = sp.get('to');
  const limit = Math.min(100, Math.max(1, Number(sp.get('limit') ?? 25)));
  const offset = Math.max(0, Number(sp.get('offset') ?? 0));
  const include = sp.get('include')?.split(',') ?? [];

  const supabase = getServerClient();

  const selects: string[] = ['*'];
  if (include.includes('photos')) selects.push('shop_claim_photos(*)');
  if (include.includes('events')) selects.push('shop_claim_events(*)');

  let query = supabase
    .from('shop_claims')
    .select(selects.join(', '), { count: 'exact' });

  if (status) query = query.eq('status', status);
  if (claim_type) query = query.eq('claim_type', claim_type);
  if (priority) query = query.eq('priority', priority);
  if (customer_id) query = query.eq('customer_id', customer_id);
  if (order_id) query = query.eq('order_id', order_id);
  if (from) query = query.gte('submitted_at', from);
  if (to) query = query.lte('submitted_at', to);

  query = query
    .order('submitted_at', { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ claims: data, total: count ?? 0 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, status, priority, resolution_type, resolution_notes, notes } = body;

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const supabase = getServerClient();

  const { data: existing, error: fetchErr } = await supabase
    .from('shop_claims')
    .select('status')
    .eq('id', id)
    .single();

  if (fetchErr || !existing) {
    return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};
  if (status !== undefined) updates.status = status;
  if (priority !== undefined) updates.priority = priority;
  if (resolution_type !== undefined) updates.resolution_type = resolution_type;
  if (resolution_notes !== undefined) updates.resolution_notes = resolution_notes;
  if (notes !== undefined) updates.notes = notes;

  if (status && status !== existing.status) {
    if (status === 'triaged') updates.triaged_at = new Date().toISOString();
    if (status === 'resolved') updates.resolved_at = new Date().toISOString();
  }

  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('shop_claims')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (status && status !== existing.status) {
    await supabase.from('shop_claim_events').insert({
      claim_id: id,
      event_type: 'status_change',
      from_status: existing.status,
      to_status: status,
    });
  }

  return NextResponse.json({ claim: data });
}

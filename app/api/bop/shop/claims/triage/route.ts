import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { claim_id, priority, triaged_by, notes } = body;

  if (!claim_id) {
    return NextResponse.json({ error: 'claim_id is required' }, { status: 400 });
  }

  const supabase = getServerClient();

  const { data: existing, error: fetchErr } = await supabase
    .from('shop_claims')
    .select('status')
    .eq('id', claim_id)
    .single();

  if (fetchErr || !existing) {
    return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
  }

  if (existing.status !== 'submitted') {
    return NextResponse.json(
      { error: `Claim is already ${existing.status}, expected submitted` },
      { status: 409 },
    );
  }

  const now = new Date().toISOString();
  const updates: Record<string, unknown> = {
    status: 'triaged',
    triaged_at: now,
    updated_at: now,
  };
  if (priority) updates.priority = priority;
  if (triaged_by) updates.triaged_by = triaged_by;

  const { data, error } = await supabase
    .from('shop_claims')
    .update(updates)
    .eq('id', claim_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const eventPayload: Record<string, unknown> = {
    claim_id,
    event_type: 'status_change',
    from_status: 'submitted',
    to_status: 'triaged',
  };
  if (triaged_by) eventPayload.actor_id = triaged_by;
  if (notes) eventPayload.detail = { notes };

  await supabase.from('shop_claim_events').insert(eventPayload);

  return NextResponse.json({ claim: data });
}

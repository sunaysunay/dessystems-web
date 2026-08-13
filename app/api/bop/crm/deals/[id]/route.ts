import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

const STAGE_PROBABILITY: Record<string, number> = {
  discovery: 10, sourcing: 20, vehicle_matched: 35, quoted: 50,
  negotiation: 70, reserved: 85, sold: 95, delivered: 100, closed_won: 100, closed_lost: 0,
};

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getServerClient();
  const tenantId = new URL(req.url).searchParams.get('tenant_id');

  let q = supabase
    .from('crm_deals')
    .select('*, crm_leads(id, ref_code, title, source, stage)')
    .eq('id', id);
  if (tenantId) q = q.eq('tenant_id', Number(tenantId));
  const { data, error } = await q.single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });

  // Fetch events for this deal
  let events: any[] = [];
  try {
    const { data: evRows } = await supabase
      .from('crm_events')
      .select('*')
      .eq('deal_id', id)
      .order('occurred_at', { ascending: false })
      .limit(100);
    events = evRows ?? [];
  } catch {}

  // Also include lead events if linked
  if (data?.lead_id) {
    try {
      const { data: leadEvents } = await supabase
        .from('crm_events')
        .select('*')
        .eq('lead_id', data.lead_id)
        .order('occurred_at', { ascending: false })
        .limit(50);
      if (leadEvents) events = [...events, ...leadEvents];
    } catch {}
  }

  events.sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());

  // Stage history
  let stageHistory: any[] = [];
  try {
    const { data: hist } = await supabase
      .from('crm_deal_stage_history')
      .select('*')
      .eq('deal_id', id)
      .order('changed_at', { ascending: false });
    stageHistory = hist ?? [];
  } catch {}

  return NextResponse.json({
    deal: { ...data, crm_events: events, stage_history: stageHistory },
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getServerClient();
  const tenantId = new URL(req.url).searchParams.get('tenant_id');
  const body = await req.json();

  // Stage change: log history + event + update probability
  if (body.stage && body._actor_email) {
    const { data: current } = await supabase
      .from('crm_deals')
      .select('stage, tenant_id')
      .eq('id', id)
      .single();

    if (current && current.stage !== body.stage) {
      body.probability = STAGE_PROBABILITY[body.stage] ?? body.probability;

      try {
        await supabase.from('crm_deal_stage_history').insert({
          deal_id: id,
          from_stage: current.stage,
          to_stage: body.stage,
          changed_by: body._actor_email,
        });
      } catch {}

      try {
        await supabase.from('crm_events').insert({
          tenant_id: current.tenant_id,
          deal_id: id,
          event_type: 'stage.changed',
          actor_type: 'user',
          actor_id: body._actor_email,
          summary: `Deal stage: ${current.stage} → ${body.stage}`,
          payload: { from: current.stage, to: body.stage, reason: body.lost_reason || null },
        });
      } catch {}
    }
  }

  const { _actor_email, ...updateFields } = body;

  let q = supabase
    .from('crm_deals')
    .update({ ...updateFields, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (tenantId) q = q.eq('tenant_id', Number(tenantId));
  const { data, error } = await q.select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deal: data });
}

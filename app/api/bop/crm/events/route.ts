import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const { searchParams } = new URL(req.url);
  const leadId = searchParams.get('lead_id') ?? '';
  const tenantId = searchParams.get('tenant_id');
  const limit = Math.min(Number(searchParams.get('limit') ?? 50), 200);
  const offset = Number(searchParams.get('offset') ?? 0);

  if (!leadId) return NextResponse.json({ error: 'lead_id required' }, { status: 400 });

  let q = supabase
    .from('crm_events')
    .select('*', { count: 'exact' })
    .eq('lead_id', leadId)
    .order('occurred_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (tenantId) q = q.eq('tenant_id', Number(tenantId));

  const { data, error, count } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ events: data ?? [], total: count ?? 0 });
}

export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const body = await req.json();

  const { tenant_id, lead_id, deal_id, event_type, actor_type, actor_id, summary, payload, is_internal } = body;

  if (!tenant_id || (!lead_id && !deal_id) || !event_type) {
    return NextResponse.json({ error: 'tenant_id, lead_id or deal_id, event_type required' }, { status: 400 });
  }

  const row = {
    tenant_id: Number(tenant_id),
    lead_id: lead_id ?? null,
    deal_id: deal_id ?? null,
    event_type,
    actor_type: actor_type ?? 'user',
    actor_id: actor_id ?? null,
    summary: summary ?? null,
    payload: payload ?? {},
    is_internal: is_internal ?? false,
  };

  const { data, error } = await supabase.from('crm_events').insert(row).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Also write to crm_activities for backward compat (only if lead_id present)
  if (lead_id && ['note.added', 'call.logged', 'email.sent'].includes(event_type)) {
    const actType = event_type === 'note.added' ? 'note' : event_type === 'call.logged' ? 'call' : 'email';
    await supabase.from('crm_activities').insert({
      lead_id,
      type: actType,
      subject: summary,
      body: payload?.body ?? summary,
      actor_email: actor_id,
      done: true,
    }).then(() => {});
  }

  return NextResponse.json({ event: data });
}

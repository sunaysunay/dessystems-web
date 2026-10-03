import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { callerUid, isSuperAdmin } from '@/lib/api-guard';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: Promise<{ number: string }> }) {
  const uid = await callerUid();
  if (!uid) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (!(await isSuperAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { number } = await params;
  const supabase = getServerClient();

  const { data: caseData } = await supabase
    .from('sup_requests')
    .select('id, tenant_id, assigned_agent_id')
    .or(`request_no.eq.${number},case_number.eq.${number}`)
    .single();
  if (!caseData) return NextResponse.json({ error: 'Case not found' }, { status: 404 });

  const body = await req.json();
  const agentId = body.assign_to_me ? uid : (body.agent_id ?? uid);

  const { data: updated, error } = await supabase
    .from('sup_requests')
    .update({ assigned_agent_id: agentId })
    .eq('id', caseData.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('sup_case_events').insert({
    tenant_id: caseData.tenant_id,
    case_id: caseData.id,
    event_type: 'assigned',
    actor_type: 'agent',
    actor_id: uid,
    before_val: { assigned_agent_id: caseData.assigned_agent_id },
    after_val: { assigned_agent_id: agentId },
  });

  return NextResponse.json({ case: updated });
}

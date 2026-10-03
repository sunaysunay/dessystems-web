import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { callerUid, isSuperAdmin } from '@/lib/api-guard';
import { VALID_TRANSITIONS } from '@/lib/support/types';
import type { CaseStatus } from '@/lib/support/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: Promise<{ number: string }> }) {
  const uid = await callerUid();
  if (!uid) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (!(await isSuperAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { number } = await params;
  const supabase = getServerClient();

  const { data: caseData } = await supabase
    .from('sup_requests')
    .select('id, tenant_id, status')
    .or(`request_no.eq.${number},case_number.eq.${number}`)
    .single();
  if (!caseData) return NextResponse.json({ error: 'Case not found' }, { status: 404 });

  const body = await req.json();
  const toStatus = body.to_status as CaseStatus;
  const fromStatus = caseData.status as CaseStatus;

  const allowed = VALID_TRANSITIONS[fromStatus] ?? [];
  if (!allowed.includes(toStatus)) {
    return NextResponse.json({ error: `Cannot transition from ${fromStatus} to ${toStatus}` }, { status: 400 });
  }

  const updates: Record<string, unknown> = { status: toStatus };
  if (toStatus === 'resolved') updates.resolved_at = new Date().toISOString();
  if (toStatus === 'closed') updates.closed_at = new Date().toISOString();

  const { data: updated, error } = await supabase
    .from('sup_requests')
    .update(updates)
    .eq('id', caseData.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('sup_case_events').insert({
    tenant_id: caseData.tenant_id,
    case_id: caseData.id,
    event_type: 'status_changed',
    actor_type: 'agent',
    actor_id: uid,
    before_val: { status: fromStatus },
    after_val: { status: toStatus },
  });

  return NextResponse.json({ case: updated });
}

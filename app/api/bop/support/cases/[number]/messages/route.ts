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
    .select('id, tenant_id')
    .or(`request_no.eq.${number},case_number.eq.${number}`)
    .single();
  if (!caseData) return NextResponse.json({ error: 'Case not found' }, { status: 404 });

  const body = await req.json();
  const { body: msgBody, visibility = 'public' } = body;
  if (!msgBody?.trim()) return NextResponse.json({ error: 'body required' }, { status: 400 });

  const { data: message, error } = await supabase
    .from('sup_messages')
    .insert({
      request_id: caseData.id,
      sender_id: uid,
      sender_role: 'admin',
      body: msgBody.trim(),
      visibility,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('sup_case_events').insert({
    tenant_id: caseData.tenant_id,
    case_id: caseData.id,
    event_type: 'message_added',
    actor_type: 'agent',
    actor_id: uid,
    after_val: { visibility, message_id: message.id },
  });

  return NextResponse.json({ message }, { status: 201 });
}

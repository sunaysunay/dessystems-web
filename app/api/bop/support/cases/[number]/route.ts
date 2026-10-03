import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { callerUid, isSuperAdmin } from '@/lib/api-guard';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ number: string }> }) {
  const uid = await callerUid();
  if (!uid) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (!(await isSuperAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { number } = await params;
  const supabase = getServerClient();

  const { data: caseData, error: caseErr } = await supabase
    .from('sup_requests')
    .select('*')
    .or(`request_no.eq.${number},case_number.eq.${number}`)
    .single();

  if (caseErr || !caseData) return NextResponse.json({ error: 'Case not found' }, { status: 404 });

  const { data: messages } = await supabase
    .from('sup_messages')
    .select('*')
    .eq('request_id', caseData.id)
    .order('created_at', { ascending: true });

  const { data: events } = await supabase
    .from('sup_case_events')
    .select('*')
    .eq('case_id', caseData.id)
    .order('created_at', { ascending: true });

  return NextResponse.json({
    case: caseData,
    messages: messages ?? [],
    events: events ?? [],
  });
}

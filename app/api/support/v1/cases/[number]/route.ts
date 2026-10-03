import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiKey, requireScope } from '@/lib/support/api-auth';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ number: string }> }
) {
  try {
    const auth = await authenticateApiKey(req.headers.get('authorization'));
    requireScope(auth.scopes, 'cases.read');

    const { number: caseNumber } = await params;
    const supabase = getServerClient();

    const { data: caseRow, error } = await supabase
      .from('sup_requests')
      .select('id, case_number, tenant_id, subject, category, priority, status, channel_kind, resolution, correlation_id, created_at, updated_at, resolved_at, closed_at')
      .eq('case_number', caseNumber)
      .eq('tenant_id', auth.tenant_id)
      .single();

    if (error || !caseRow) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    const { data: messages } = await supabase
      .from('sup_messages')
      .select('id, sender_role, body, visibility, created_at')
      .eq('request_id', caseRow.id)
      .eq('visibility', 'public')
      .order('created_at', { ascending: true });

    const { data: events } = await supabase
      .from('sup_case_events')
      .select('id, event_type, created_at')
      .eq('case_id', caseRow.id)
      .in('event_type', ['case.created', 'case.status_changed', 'case.resolved', 'case.closed', 'case.reopened'])
      .order('created_at', { ascending: true });

    const { data: context } = await supabase
      .from('sup_case_context')
      .select('*')
      .eq('case_id', caseRow.id)
      .single();

    return NextResponse.json({
      case: caseRow,
      messages: messages ?? [],
      events: events ?? [],
      context: context ?? null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

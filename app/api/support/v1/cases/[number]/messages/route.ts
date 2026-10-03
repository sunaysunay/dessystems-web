import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiKey, requireScope } from '@/lib/support/api-auth';
import { CaseService } from '@/lib/support/case-service';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ number: string }> }
) {
  try {
    const auth = await authenticateApiKey(req.headers.get('authorization'));
    requireScope(auth.scopes, 'cases.write');

    const { number: caseNumber } = await params;
    const body = await req.json();

    if (!body.body?.trim()) {
      return NextResponse.json({ error: 'body is required' }, { status: 400 });
    }

    const supabase = getServerClient();

    const { data: caseRow } = await supabase
      .from('sup_requests')
      .select('id, tenant_id, status')
      .eq('case_number', caseNumber)
      .eq('tenant_id', auth.tenant_id)
      .single();

    if (!caseRow) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    if (['closed', 'cancelled'].includes(caseRow.status)) {
      return NextResponse.json({ error: 'Cannot reply to a closed or cancelled case' }, { status: 400 });
    }

    const caseService = new CaseService();
    const result = await caseService.addMessage(
      caseRow.id,
      body.requester_email || auth.client_name,
      'contact',
      body.body.trim(),
      'public',
      'api'
    );

    return NextResponse.json(
      {
        message_id: result.message.id,
        created_at: result.message.created_at,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

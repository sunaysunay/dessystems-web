import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiKey, requireScope } from '@/lib/support/api-auth';
import { CaseIngest } from '@/lib/support/case-ingest';
import { ApiAdapter } from '@/lib/support/adapters/api';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateApiKey(req.headers.get('authorization'));
    requireScope(auth.scopes, 'cases.write');

    const body = await req.json();
    const adapter = new ApiAdapter();
    const dto = await adapter.parse({ body, tenantSlug: auth.tenant_slug });

    const ingest = new CaseIngest();
    const result = await ingest.submit(dto);

    return NextResponse.json(
      {
        case_number: result.case_number,
        id: result.case.id,
        status: result.case.status,
        subject: result.case.subject,
        priority: result.case.priority,
        category: result.case.category,
        created_at: result.case.created_at,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = message.includes('not found') || message.includes('Invalid API key')
      ? 401
      : message.includes('Duplicate') || message.includes('idempotency')
      ? 409
      : message.includes('required') || message.includes('Invalid')
      ? 400
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateApiKey(req.headers.get('authorization'));
    requireScope(auth.scopes, 'cases.read');

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '25', 10), 100);
    const offset = (page - 1) * limit;

    const supabase = getServerClient();
    let query = supabase
      .from('sup_requests')
      .select('id, case_number, subject, category, priority, status, channel_kind, created_at, updated_at, resolved_at, closed_at', { count: 'exact' })
      .eq('tenant_id', auth.tenant_id)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq('status', status);

    const { data, error, count } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      cases: data ?? [],
      pagination: { page, limit, total: count ?? 0 },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

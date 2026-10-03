import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { callerUid, isSuperAdmin } from '@/lib/api-guard';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const uid = await callerUid();
  if (!uid) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (!(await isSuperAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const supabase = getServerClient();
  const { searchParams } = new URL(req.url);
  const status   = searchParams.get('status') ?? '';
  const priority = searchParams.get('priority') ?? '';
  const q        = searchParams.get('q') ?? '';

  let query = supabase
    .from('sup_requests')
    .select('id, request_no, case_number, tenant_id, created_by, category, priority, status, subject, channel_kind, resolution, assigned_agent_id, first_response_at, resolved_at, ctx_route, ctx_env, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(200);

  if (status) query = query.eq('status', status);
  if (priority) query = query.eq('priority', priority);
  if (q) query = query.or(`subject.ilike.%${q}%,request_no.ilike.%${q}%,case_number.ilike.%${q}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ cases: data ?? [] });
}

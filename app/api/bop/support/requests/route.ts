import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { callerUid, isSuperAdmin } from '@/lib/api-guard';
import { notifyRequestCreated } from '@/lib/support/notify';

export const dynamic = 'force-dynamic';

// GET /api/bop/support/requests?tenant=ID&status=open
// Users see own requests; super_admin sees all (cross-tenant).
export async function GET(req: NextRequest) {
  const uid = await callerUid();
  if (!uid) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const supabase = getServerClient();
  const { searchParams } = new URL(req.url);
  const tenantParam = searchParams.get('tenant');
  const status      = searchParams.get('status') ?? '';
  const isAdmin     = await isSuperAdmin();

  let q = supabase
    .from('sup_requests')
    .select('id, request_no, tenant_id, created_by, category, priority, status, subject, resolution, ctx_route, ctx_env, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(100);

  if (!isAdmin) {
    q = q.eq('created_by', uid);
    if (tenantParam) q = q.eq('tenant_id', Number(tenantParam));
  } else {
    if (tenantParam) q = q.eq('tenant_id', Number(tenantParam));
  }
  if (status) q = q.eq('status', status);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ requests: data ?? [] });
}

// POST /api/bop/support/requests
// Body: { tenant_id, category, priority, subject, description, ctx_route, ctx_browser, ctx_env, ctx_extra }
export async function POST(req: NextRequest) {
  const uid = await callerUid();
  if (!uid) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const supabase = getServerClient();

  // Rate limit: max 10 requests per user per hour
  const hourAgo = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await supabase
    .from('sup_requests')
    .select('id', { count: 'exact', head: true })
    .eq('created_by', uid)
    .gte('created_at', hourAgo);
  if ((count ?? 0) >= 10) {
    return NextResponse.json({ error: 'Rate limit: max 10 requests per hour' }, { status: 429 });
  }

  const body = await req.json();
  const { tenant_id, category, priority = 'normal', subject, description, ctx_route, ctx_browser, ctx_env, ctx_extra } = body;

  if (!tenant_id || !category || !subject?.trim() || !description?.trim()) {
    return NextResponse.json({ error: 'tenant_id, category, subject, description required' }, { status: 400 });
  }

  const VALID_CATEGORIES = ['access_problem','bug','question','feature_request','other'];
  const VALID_PRIORITIES  = ['low','normal','high','critical'];
  if (!VALID_CATEGORIES.includes(category)) return NextResponse.json({ error: 'invalid category' }, { status: 400 });
  if (!VALID_PRIORITIES.includes(priority))  return NextResponse.json({ error: 'invalid priority' }, { status: 400 });

  // Create request + first message in sequence (no transaction in Supabase client)
  const { data: request, error: reqErr } = await supabase
    .from('sup_requests')
    .insert({ tenant_id, created_by: uid, category, priority, subject: subject.trim(),
              status: 'waiting_admin', ctx_route, ctx_browser, ctx_env, ctx_extra: ctx_extra ?? {} })
    .select()
    .single();
  if (reqErr || !request) return NextResponse.json({ error: reqErr?.message ?? 'insert failed' }, { status: 500 });

  await supabase.from('sup_messages').insert({
    request_id: request.id, sender_id: uid, sender_role: 'user', body: description.trim(),
  });

  // Side effects — non-blocking
  try {
    const { data: profile } = await supabase.auth.admin.getUserById(uid);
    const userEmail = profile?.user?.email ?? uid;
    await notifyRequestCreated(request, userEmail);
  } catch { /* non-blocking */ }

  return NextResponse.json({ request }, { status: 201 });
}

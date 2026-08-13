import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';

function authAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// GET /api/bop/users — list all users joined with profiles
export async function GET() {
  const sb = getServerClient();
  const admin = authAdminClient();

  const { data: authUsers } = await admin.auth.admin.listUsers();
  const { data: profiles } = await sb
    .from('bop_user_profiles')
    .select('*');
  const { data: tenants } = await sb
    .from('bop_user_tenants')
    .select('user_id, tenant_id, is_default');

  const profileMap: Record<string, any> = {};
  for (const p of profiles ?? []) profileMap[p.user_id] = p;

  const tenantMap: Record<string, number[]> = {};
  for (const t of tenants ?? []) {
    if (!tenantMap[t.user_id]) tenantMap[t.user_id] = [];
    tenantMap[t.user_id].push(t.tenant_id);
  }

  const users = (authUsers?.users ?? []).map(u => ({
    id: u.id,
    email: u.email,
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at ?? null,
    ...(profileMap[u.id] ?? {}),
    tenant_ids: tenantMap[u.id] ?? [],
  }));

  return NextResponse.json({ users });
}

// POST /api/bop/users — create user
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email, password, role, first_name, last_name, department, phone, timezone, language, default_screen, valid_from, valid_to, user_type, ai_enabled, ai_quota, tenant_ids } = body;
  if (!email || !password) return NextResponse.json({ error: 'Email and password required' }, { status: 400 });

  const admin = authAdminClient();
  const sb = getServerClient();

  const { data: created, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const uid = created.user.id;
  await sb.from('bop_user_profiles').upsert({
    user_id: uid, email, first_name, last_name, role: role ?? 'viewer',
    department, phone, timezone: timezone ?? 'Europe/Amsterdam', language: language ?? 'en',
    default_screen, valid_from, valid_to, user_type: user_type ?? 'human',
    ai_enabled: ai_enabled ?? false, ai_quota: ai_quota ?? 0,
  });

  if (tenant_ids?.length) {
    await sb.from('bop_user_tenants').insert(
      tenant_ids.map((tid: number, i: number) => ({ user_id: uid, tenant_id: tid, is_default: i === 0 }))
    );
  }

  return NextResponse.json({ ok: true, user_id: uid });
}

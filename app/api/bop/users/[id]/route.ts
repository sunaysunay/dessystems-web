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

async function logChange(sb: any, actor_email: string, target_user: string, action: string, object_type: string, object_id: string, old_value: any, new_value: any) {
  await sb.from('bop_change_log').insert({ actor_email, target_user, action, object_type, object_id, old_value, new_value }).catch(() => {});
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const actor = req.headers.get('x-actor-email') ?? 'unknown';
  const sb = getServerClient();
  const admin = authAdminClient();

  // Fetch current state for diff
  const { data: current } = await sb.from('bop_user_profiles').select('*').eq('user_id', id).single();

  if (body.password) {
    const { error } = await admin.auth.admin.updateUserById(id, { password: body.password });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await logChange(sb, actor, current?.email ?? id, 'PW_RESET', 'user', id, null, null);
    if (Object.keys(body).length === 1) return NextResponse.json({ ok: true });
  }

  const profileFields: Record<string, unknown> = { ...body }; delete profileFields['password'];

  // Detect what changed for audit log
  if (profileFields.role && current?.role !== profileFields.role) {
    await logChange(sb, actor, current?.email ?? id, 'ROLE_CHANGED', 'user', id,
      { role: current?.role }, { role: profileFields.role });
  }
  if (profileFields.status && current?.status !== profileFields.status) {
    const action = profileFields.status === 'locked' ? 'USER_LOCKED'
      : profileFields.status === 'active' ? 'USER_UNLOCKED' : 'STATUS_CHANGED';
    await logChange(sb, actor, current?.email ?? id, action, 'user', id,
      { status: current?.status }, { status: profileFields.status });
  }

  const { error } = await sb.from('bop_user_profiles')
    .upsert({ user_id: id, ...profileFields }, { onConflict: 'user_id' });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = req.headers.get('x-actor-email') ?? 'unknown';
  const admin = authAdminClient();
  
  let reason = null;
  try {
    const body = await req.json();
    reason = body.reason || null;
  } catch {}

  // Fetch user profile for logging purposes using admin to bypass RLS
  const { data: current } = await admin.from('bop_user_profiles').select('*').eq('user_id', id).single();
  let targetEmail = current?.email;

  if (!targetEmail) {
    // Fallback to auth.users if they don't have a profile yet
    const { data: authUser } = await admin.auth.admin.getUserById(id);
    targetEmail = authUser?.user?.email || id;
  }

  // 1. Manually wipe child tables using ADMIN client to bypass RLS and avoid Foreign Key blocks!
  await admin.from('bop_user_tenants').delete().eq('user_id', id);
  await admin.from('mdm_partner_roles').delete().eq('user_id', id);
  await admin.from('bop_user_profiles').delete().eq('user_id', id);

  // 2. Delete from auth.users
  const { error: deleteErr } = await admin.auth.admin.deleteUser(id);
  
  if (deleteErr) {
    console.error("Auth Delete Error:", deleteErr);
    return NextResponse.json({ error: 'Failed to wipe user identity: ' + deleteErr.message }, { status: 500 });
  }

  // 3. Log the permanent deletion using Admin client to ensure it writes successfully
  await admin.from('bop_change_log').insert({
    actor_email: actor,
    target_user: targetEmail,
    action: 'USER_DELETED',
    object_type: 'user',
    object_id: id,
    old_value: current || { status: 'deleted' },
    new_value: null,
    reason: reason
  }).then(({error}) => {
    if (error) console.error("Log change error:", error);
  });

  return NextResponse.json({ ok: true, deleted: true });
}

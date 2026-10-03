import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { callerUid, isSuperAdmin } from '@/lib/api-guard';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const uid = await callerUid();
  if (!uid) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (!(await isSuperAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { slug } = await params;
  const supabase = getServerClient();

  const { data: tenant, error: tErr } = await supabase
    .from('sup_tenants')
    .select('*')
    .eq('slug', slug)
    .single();
  if (tErr || !tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

  const { data: contacts } = await supabase
    .from('sup_contacts')
    .select('*')
    .eq('tenant_id', tenant.id)
    .order('created_at', { ascending: false });

  const { data: api_clients } = await supabase
    .from('sup_api_clients')
    .select('id, tenant_id, name, key_prefix, scopes, rate_limit, is_active, last_used_at, created_at')
    .eq('tenant_id', tenant.id)
    .order('created_at', { ascending: false });

  return NextResponse.json({
    tenant,
    contacts: contacts ?? [],
    api_clients: api_clients ?? [],
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const uid = await callerUid();
  if (!uid) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (!(await isSuperAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { slug } = await params;
  const supabase = getServerClient();
  const body = await req.json();

  const allowedFields = ['name', 'status', 'kind', 'channels_enabled', 'notify_config', 'branding', 'locale', 'timezone'];
  const updates: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in body) updates[key] = body[key];
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const { data: tenant, error } = await supabase
    .from('sup_tenants')
    .update(updates)
    .eq('slug', slug)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tenant });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const uid = await callerUid();
  if (!uid) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (!(await isSuperAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { slug } = await params;
  const supabase = getServerClient();

  const { data: tenant } = await supabase
    .from('sup_tenants')
    .select('id, status')
    .eq('slug', slug)
    .single();

  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

  const { data: caseCount } = await supabase
    .from('sup_requests')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenant.id);

  if (caseCount && (caseCount as unknown[]).length > 0) {
    const { error } = await supabase
      .from('sup_tenants')
      .update({ status: 'offboarded' })
      .eq('slug', slug);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ action: 'offboarded', message: 'Tenant has cases and was offboarded instead of deleted' });
  }

  const { error } = await supabase
    .from('sup_tenants')
    .delete()
    .eq('slug', slug);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ action: 'deleted' });
}

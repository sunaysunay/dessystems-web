import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { callerUid, isSuperAdmin } from '@/lib/api-guard';

export const dynamic = 'force-dynamic';

export async function GET() {
  const uid = await callerUid();
  if (!uid) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (!(await isSuperAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const supabase = getServerClient();
  const { data, error } = await supabase
    .from('sup_tenants')
    .select('*')
    .order('name');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tenants: data ?? [] });
}

export async function POST(req: NextRequest) {
  const uid = await callerUid();
  if (!uid) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (!(await isSuperAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = await req.json();
  const { name, slug, case_prefix, kind, locale, timezone, channels_enabled } = body;

  if (!name || !slug || !case_prefix) {
    return NextResponse.json({ error: 'name, slug, and case_prefix are required' }, { status: 400 });
  }

  const supabase = getServerClient();

  const { data: existing } = await supabase
    .from('sup_tenants')
    .select('id')
    .eq('slug', slug)
    .single();

  if (existing) {
    return NextResponse.json({ error: `Tenant with slug '${slug}' already exists` }, { status: 409 });
  }

  const { data: tenant, error } = await supabase
    .from('sup_tenants')
    .insert({
      name,
      slug: slug.toLowerCase(),
      case_prefix: case_prefix.toUpperCase(),
      kind: kind || 'external',
      status: 'active',
      locale: locale || 'nl',
      timezone: timezone || 'Europe/Amsterdam',
      channels_enabled: channels_enabled || ['console'],
      notify_config: {},
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('sup_sequences').insert({
    tenant_id: tenant.id,
    prefix: case_prefix.toUpperCase(),
    last_number: 0,
  });

  return NextResponse.json({ tenant }, { status: 201 });
}

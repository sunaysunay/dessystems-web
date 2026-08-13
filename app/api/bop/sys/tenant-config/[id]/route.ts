import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { isSuperAdmin } from '@/lib/api-guard';

export const dynamic = 'force-dynamic';

const COLS = ['name','domain','dev_domain','brand_color','brand_color2','logo_url','favicon_url','active','sort_order',
  'default_language','timezone','currency','country','business_type',
  'lead_email','email_from_name','email_from_address','smtp_provider','smtp_username','smtp_api_key',
  'feature_flags','analytics_enabled','ai_enabled',
  'dns_provider','dns_provider_user','dns_provider_password',
  'google_account_email','gtm_container_id','google_maps_api_key','google_oauth_client_id','google_oauth_client_secret','ga4_property_id',
  'initialized_at'];

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getServerClient();
  const [{ data: cfg }, { data: status }] = await Promise.all([
    supabase.from('bop_tenants').select('*').eq('tenant_id', Number(id)).maybeSingle(),
    supabase.from('bop_tenant_status').select('*').eq('tenant_id', Number(id)).order('created_at', { ascending: false }).limit(50),
  ]);
  return NextResponse.json({ tenant: cfg, status: status ?? [] });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await isSuperAdmin())) return NextResponse.json({ error: 'forbidden — super_admin only' }, { status: 403 });
  const supabase = getServerClient();
  const b = await req.json();
  const patch: any = {};
  for (const c of COLS) if (c in b) patch[c] = b[c] === '' ? null : b[c];
  const { error } = await supabase.from('bop_tenants')
    .upsert({ tenant_id: Number(id), ...patch }, { onConflict: 'tenant_id' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

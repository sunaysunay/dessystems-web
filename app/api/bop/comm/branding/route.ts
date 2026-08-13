import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

// GET /api/bop/comm/branding?tenant=ID&brand=default
export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const p = new URL(req.url).searchParams;
  const tenant = Number(p.get('tenant') ?? '0');
  const brand = p.get('brand') ?? 'default';
  const { data, error } = await supabase
    .from('bop_comm_branding').select('*')
    .eq('tenant_id', tenant).eq('brand_id', brand).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ branding: data ?? { tenant_id: tenant, brand_id: brand } });
}

// PATCH — upsert branding tokens for a tenant+brand. Always real-tenant scoped
// (no tenant_id=0 sentinel here — every tenant configures its own branding).
export async function PATCH(req: NextRequest) {
  const supabase = getServerClient();
  const b = await req.json();
  if (!b.tenant_id) return NextResponse.json({ error: 'tenant_id is required' }, { status: 400 });
  const row = { ...b, brand_id: b.brand_id ?? 'default' };
  const { error } = await supabase.from('bop_comm_branding').upsert(row, { onConflict: 'tenant_id,brand_id' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

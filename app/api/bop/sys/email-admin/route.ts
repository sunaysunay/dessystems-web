import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { isSuperAdmin } from '@/lib/api-guard';

export const dynamic = 'force-dynamic';

// GET  /api/bop/sys/email-admin?resource=map|layouts|brand|log|templates&tenant=200
// PATCH same ?resource=... with row body (upsert). super_admin for writes.
export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const p = new URL(req.url).searchParams;
  const res = p.get('resource'); const tenant = Number(p.get('tenant') ?? '0');
  if (res === 'map')       return NextResponse.json({ rows: (await supabase.from('bop_email_template_map').select('*').order('sort')).data ?? [] });
  if (res === 'layouts')   return NextResponse.json({ rows: (await supabase.from('bop_email_base_layout').select('*').order('key')).data ?? [] });
  if (res === 'brand')     return NextResponse.json({ row:  (await supabase.from('bop_email_brand').select('*').eq('tenant_id', tenant).maybeSingle()).data ?? null });
  if (res === 'templates') return NextResponse.json({ rows: (await supabase.from('bop_email_template').select('*').in('tenant_id', [tenant, 0]).order('email_type')).data ?? [] });
  if (res === 'log')       return NextResponse.json({ rows: (await supabase.from('bop_email_log').select('*').order('sent_at', { ascending: false }).limit(100)).data ?? [] });
  return NextResponse.json({ error: 'unknown resource' }, { status: 400 });
}

export async function PATCH(req: NextRequest) {
  if (!(await isSuperAdmin())) return NextResponse.json({ error: 'forbidden — super_admin only' }, { status: 403 });
  const supabase = getServerClient();
  const res = new URL(req.url).searchParams.get('resource');
  const b = await req.json();
  const T: Record<string, { table: string; conflict: string }> = {
    map:      { table: 'bop_email_template_map', conflict: 'email_type' },
    layouts:  { table: 'bop_email_base_layout',  conflict: 'key' },
    brand:    { table: 'bop_email_brand',        conflict: 'tenant_id' },
    template: { table: 'bop_email_template',      conflict: 'tenant_id,email_type,locale' },
  };
  const cfg = res ? T[res] : null;
  if (!cfg) return NextResponse.json({ error: 'unknown resource' }, { status: 400 });
  const { error } = await supabase.from(cfg.table).upsert(b, { onConflict: cfg.conflict });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

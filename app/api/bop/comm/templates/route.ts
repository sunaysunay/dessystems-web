import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

// GET /api/bop/comm/templates?tenant=ID — platform defaults (tenant_id=0) +
// this tenant's overrides. Backing API for CM004 Template Studio.
export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const tenant = Number(new URL(req.url).searchParams.get('tenant') ?? '0');
  const { data, error } = await supabase
    .from('bop_comm_template').select('*')
    .in('tenant_id', [tenant, 0])
    .order('category').order('locale');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ templates: data ?? [] });
}

// POST — create a new template row.
export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const b = await req.json();
  if (!b.category || !b.context_type) return NextResponse.json({ error: 'category and context_type are required' }, { status: 400 });
  const { data, error } = await supabase.from('bop_comm_template').insert({ ...b, tenant_id: b.tenant_id ?? 0 }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ template: data });
}

// PATCH — update an existing template row by id.
export async function PATCH(req: NextRequest) {
  const supabase = getServerClient();
  const b = await req.json();
  if (!b.id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  const { id, ...rest } = b;
  const { error } = await supabase.from('bop_comm_template').update(rest).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

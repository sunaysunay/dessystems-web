import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

// GET /api/bop/comm/automation?tenant=ID — real-tenant-scoped only, no
// tenant_id=0 fallback (automation is opt-in per tenant, plan §2).
export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const tenant = Number(new URL(req.url).searchParams.get('tenant') ?? '0');
  const { data, error } = await supabase
    .from('bop_comm_automation').select('*, bop_comm_template(category, locale, subject)')
    .eq('tenant_id', tenant).order('event_code');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ automations: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const b = await req.json();
  if (!b.tenant_id || !b.event_code) return NextResponse.json({ error: 'tenant_id and event_code are required' }, { status: 400 });
  const { data, error } = await supabase.from('bop_comm_automation').insert(b).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ automation: data });
}

export async function PATCH(req: NextRequest) {
  const supabase = getServerClient();
  const b = await req.json();
  if (!b.id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  const { id, ...rest } = b;
  const { error } = await supabase.from('bop_comm_automation').update(rest).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

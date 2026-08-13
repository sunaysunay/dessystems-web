import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const view = sp.get('view');
  const tid = Number(sp.get('tenant_id') || '0');

  const sb = getServerClient();

  if (view === 'prefixes') {
    const q = sb.from('bop_shortlink_prefixes').select('*').order('prefix');
    if (tid) q.eq('tenant_id', tid);
    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ prefixes: data ?? [] });
  }

  return NextResponse.json({ error: 'unknown view' }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const sb = getServerClient();
  const { data, error } = await sb.from('bop_shortlink_prefixes').insert(body).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ row: data });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { tenant_id, prefix, ...rest } = body;
  if (!tenant_id || !prefix) return NextResponse.json({ error: 'tenant_id and prefix required' }, { status: 400 });
  const sb = getServerClient();
  const { data, error } = await sb.from('bop_shortlink_prefixes').update(rest).eq('tenant_id', tenant_id).eq('prefix', prefix).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ row: data });
}

export async function DELETE(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const tid = Number(sp.get('tenant_id') || '0');
  const prefix = sp.get('prefix') || '';
  if (!tid || !prefix) return NextResponse.json({ error: 'tenant_id and prefix required' }, { status: 400 });
  const sb = getServerClient();
  const { error } = await sb.from('bop_shortlink_prefixes').delete().eq('tenant_id', tid).eq('prefix', prefix);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// app/api/bop/mkt/campaigns/route.ts  — list + create-shell
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { callerUid } from '@/lib/api-guard';
export const dynamic = 'force-dynamic';

// GET /api/bop/mkt/campaigns?tenant_id=200&status=review
export async function GET(req: NextRequest) {
  const sb = getServerClient();
  const u = new URL(req.url);
  const tenant = Number(u.searchParams.get('tenant_id') || 0);
  const status = u.searchParams.get('status');
  let q = sb.from('bop_mkt_campaigns').select('*').order('created_at', { ascending: false }).limit(200);
  if (tenant) q = q.eq('tenant_id', tenant);
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ campaigns: data });
}

// DELETE /api/bop/mkt/campaigns?id=uuid
export async function DELETE(req: NextRequest) {
  if (!await callerUid()) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const sb = getServerClient();
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const { error } = await sb.from('bop_mkt_campaigns').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

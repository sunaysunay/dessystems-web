import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const sb = getServerClient();
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenant_id') ? Number(searchParams.get('tenant_id')) : null;
  const range    = searchParams.get('range') || '7d';

  const days: Record<string,number> = { '1d':1,'3d':3,'7d':7,'30d':30,'90d':90 };
  const d = new Date();
  d.setDate(d.getDate() - (days[range] ?? 7));

  let q = sb.from('dm_activity_sessions').select('*').order('started_at', { ascending: false }).limit(500);
  if (tenantId) q = q.eq('tenant_id', tenantId);
  if (range !== 'all') q = q.gte('started_at', d.toISOString());

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

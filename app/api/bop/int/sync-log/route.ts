import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const sp = new URL(req.url).searchParams;
  const system_id = sp.get('connector_id') ?? sp.get('system_id') ?? '';
  const status    = sp.get('status') ?? '';
  const limit     = Math.min(parseInt(sp.get('limit') ?? '50', 10), 200);
  let q = supabase
    .from('int_runs')
    .select('*, int_systems(name, system_key), int_flows(flow_key, name)')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (system_id) q = q.eq('system_id', system_id);
  if (status)    q = q.eq('status', status);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ logs: data ?? [] });
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const sp     = new URL(req.url).searchParams;
  const status = sp.get('status') ?? '';
  const type   = sp.get('type') ?? '';
  const limit  = Math.min(parseInt(sp.get('limit') ?? '100', 10), 500);

  let q = supabase
    .from('int_messages')
    .select('*, int_systems(name, system_key), int_flows(flow_key, name, int_systems(system_key))')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status) q = (q as any).eq('status', status);

  // type filter: 'outbound' = publish/update/delete, 'webhook' = webhook_event
  if (type === 'outbound') q = (q as any).in('message_type', ['publish', 'update', 'delete']);
  if (type === 'webhook')  q = (q as any).eq('message_type', 'webhook_event');

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ messages: data ?? [] });
}

export async function PATCH(req: NextRequest) {
  const supabase = getServerClient();
  const { id, ...fields } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const allowed = ['status', 'next_attempt_at', 'attempts', 'priority'];
  const patch = Object.fromEntries(Object.entries(fields).filter(([k]) => allowed.includes(k)));
  patch.updated_at = new Date().toISOString();
  const { error } = await supabase.from('int_messages').update(patch).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

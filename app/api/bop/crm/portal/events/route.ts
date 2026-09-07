export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

// GET ?client_id=&type=&limit= → portal activity log
export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get('client_id') ?? '';
  const type = searchParams.get('type') ?? '';
  const limit = Math.min(Number(searchParams.get('limit') ?? 100), 500);

  let q = supabase
    .from('portal_events')
    .select('*, portal_clients(name, slug)')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (clientId) q = q.eq('client_id', clientId);
  if (type) q = q.eq('type', type);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ events: data ?? [] });
}

// DELETE ?id= → remove one event from the activity log
export async function DELETE(req: NextRequest) {
  const supabase = getServerClient();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id') ?? '';
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { error } = await supabase.from('portal_events').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

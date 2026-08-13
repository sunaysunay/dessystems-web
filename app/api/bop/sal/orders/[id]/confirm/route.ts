import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getServerClient();
  const { actor } = await req.json().catch(() => ({ actor: 'user' }));
  const { data, error } = await supabase.rpc('bop_order_confirm', {
    p_order_id: id, p_actor: actor ?? 'user',
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? { ok: true });
}

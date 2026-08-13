import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const { order_id, scheduled_at, actor } = await req.json();
  if (!order_id) return NextResponse.json({ error: 'order_id required' }, { status: 400 });

  const { data, error } = await supabase.rpc('bop_create_handover_from_order', {
    p_order_id: order_id,
    p_scheduled_at: scheduled_at ?? new Date().toISOString(),
    p_actor: actor ?? 'staff',
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

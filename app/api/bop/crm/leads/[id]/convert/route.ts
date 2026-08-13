import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getServerClient();
  const { target, actor } = await req.json();
  if (!target) return NextResponse.json({ error: 'target required (sal_quotations or sal_orders)' }, { status: 400 });

  const { data, error } = await supabase.rpc('bop_convert_lead', {
    p_lead_id: id,
    p_target: target,
    p_actor: actor ?? 'user',
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data?.ok) return NextResponse.json({ error: data?.error ?? 'Conversion failed' }, { status: 400 });
  return NextResponse.json(data);
}

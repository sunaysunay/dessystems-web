import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') ?? '';
  const order_id = searchParams.get('order_id') ?? '';

  let q = supabase
    .from('sal_handovers')
    .select(`*, mdm_business_partners(id, name, company_name), sal_orders(id, order_number, status)`)
    .order('scheduled_at', { ascending: false })
    .limit(200);

  if (status) q = q.eq('status', status);
  if (order_id) q = q.eq('order_id', order_id);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ handovers: data });
}

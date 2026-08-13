import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') ?? '';
  const search = searchParams.get('search') ?? '';
  let q = supabase
    .from('sal_orders')
    .select('*, mdm_business_partners(id,name,company_name), ast_assets(id,make,model,year)')
    .order('created_at', { ascending: false }).limit(200);
  if (status) q = q.eq('status', status);
  if (search) q = q.or(`order_number.ilike.%${search}%`);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ orders: data ?? [] });
}
export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const body = await req.json();
  const now = new Date();
  const prefix = 'ORD-' + now.getFullYear() + String(now.getMonth()+1).padStart(2,'0');
  const { count } = await supabase.from('sal_orders').select('id', { count: 'exact', head: true });
  const order_number = prefix + '-' + String((count ?? 0)+1).padStart(4,'0');
  const { data, error } = await supabase.from('sal_orders').insert({ ...body, order_number }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ order: data });
}

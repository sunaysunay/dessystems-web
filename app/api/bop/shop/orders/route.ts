import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const page = Math.max(1, Number(sp.get('page') ?? 1));
  const limit = Math.min(100, Math.max(1, Number(sp.get('limit') ?? 25)));
  const status = sp.get('status');
  const search = sp.get('search')?.trim();

  const supabase = getServerClient();
  let query = supabase
    .from('shop_orders')
    .select('*', { count: 'exact' });

  if (status) query = query.eq('status', status);
  if (search) query = query.or(`internal_id.ilike.%${search}%,customer_name.ilike.%${search}%,customer_email.ilike.%${search}%`);

  const from = (page - 1) * limit;
  query = query.order('created_at', { ascending: false }).range(from, from + limit - 1);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ orders: data ?? [], total: count ?? 0 });
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const apiKey = req.headers.get('x-api-key');
  if (!apiKey) return NextResponse.json({ error: 'Missing x-api-key header' }, { status: 401 });

  const supabase = getServerClient();
  const { data: key } = await supabase.from('shop_api_keys').select('id').eq('key', apiKey).eq('active', true).single();
  if (!key) return NextResponse.json({ error: 'Invalid API key' }, { status: 403 });

  const sp = new URL(req.url).searchParams;
  const page = Math.max(1, Number(sp.get('page') ?? 1));
  const limit = Math.min(50, Math.max(1, Number(sp.get('limit') ?? 25)));

  let query = supabase.from('shop_suppliers').select('*', { count: 'exact' });
  const from = (page - 1) * limit;
  query = query.order('created_at', { ascending: false }).range(from, from + limit - 1);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ suppliers: data, total: count ?? 0, page, limit });
}

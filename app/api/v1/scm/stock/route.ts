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
  const sku = sp.get('sku');
  const lowStock = sp.get('low_stock') === 'true';

  let query = supabase.from('shop_inventory').select('id,sku,product_name,qty,reorder_point,location,updated_at');
  if (sku) query = query.eq('sku', sku);
  if (lowStock) query = query.lt('qty', 5);
  query = query.order('sku').limit(100);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ inventory: data ?? [] });
}

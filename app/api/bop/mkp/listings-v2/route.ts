import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const sp = req.nextUrl.searchParams;
  const status   = sp.get('status') ?? '';
  const tenantId = sp.get('tenant_id') ?? '';
  const limit    = Math.min(parseInt(sp.get('limit') ?? '200', 10), 500);

  let q = supabase
    .from('bop_listings')
    .select(`
      id, ref_no, category, year, status, sale_method, condition, created_at,
      bop_brands(name),
      bop_models(name),
      bop_listing_pricing(asking_price, currency),
      bop_listing_media(url, media_type, sort_order),
      bop_listing_channels(channel, status, external_url)
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status)   q = q.eq('status', status);
  if (tenantId) q = q.eq('tenant_id', parseInt(tenantId, 10));

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ listings: data ?? [] });
}

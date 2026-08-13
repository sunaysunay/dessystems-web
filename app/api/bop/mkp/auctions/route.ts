import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

// GET /api/bop/mkp/auctions?tenant=300&status=&type=
export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const { searchParams } = new URL(req.url);
  const tenant = searchParams.get('tenant');
  const status = searchParams.get('status');
  const type   = searchParams.get('type');

  let q = supabase
    .from('bop_auctions')
    .select('*, bop_auction_lots(count)')
    .order('starts_at', { ascending: false, nullsFirst: false })
    .limit(200);

  if (tenant) q = q.eq('tenant_id', Number(tenant));
  if (status) q = q.eq('status', status);
  if (type)   q = q.eq('type', type);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const auctions = (data ?? []).map((a: any) => ({
    ...a,
    lot_count: a.bop_auction_lots?.[0]?.count ?? 0,
  }));
  return NextResponse.json({ auctions });
}

// POST /api/bop/mkp/auctions
export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const b = await req.json();
  if (!b.tenant_id || !b.title) {
    return NextResponse.json({ error: 'tenant_id and title are required' }, { status: 400 });
  }
  const { data, error } = await supabase
    .from('bop_auctions')
    .insert({
      tenant_id: b.tenant_id,
      title: b.title,
      type: b.type ?? 'online',
      status: b.status ?? 'draft',
      starts_at: b.starts_at || null,
      ends_at: b.ends_at || null,
      location: b.location ?? null,
      country: b.country ?? null,
      buyer_premium_pct: b.buyer_premium_pct ?? 0,
      currency: b.currency ?? 'EUR',
      catalog_url: b.catalog_url ?? null,
      livestream_url: b.livestream_url ?? null,
    })
    .select('id')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}

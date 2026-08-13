import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

// GET /api/bop/dae/price-history?listing_id=X
export async function GET(req: NextRequest) {
  const sb = getServerClient();
  const listing_id = req.nextUrl.searchParams.get('listing_id');
  if (!listing_id) return NextResponse.json({ error: 'listing_id required' }, { status: 400 });

  const { data, error } = await sb
    .from('dae_price_history')
    .select('price, currency, recorded_at, source')
    .eq('listing_id', listing_id)
    .order('recorded_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ history: data ?? [] });
}

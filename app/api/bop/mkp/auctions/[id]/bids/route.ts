import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

// GET /api/bop/mkp/auctions/[id]/bids → all bids for this auction's lots
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getServerClient();
  const { data: lots } = await supabase.from('bop_auction_lots').select('id').eq('auction_id', id);
  const lotIds = (lots ?? []).map(l => l.id);
  if (!lotIds.length) return NextResponse.json({ bids: [] });
  const { data: bids } = await supabase
    .from('bop_auction_bids')
    .select('*')
    .in('lot_id', lotIds)
    .order('placed_at', { ascending: false })
    .limit(500);
  return NextResponse.json({ bids: bids ?? [] });
}

// POST /api/bop/mkp/auctions/[id]/bids  { lot_id, amount, bidder_id?, bid_type? }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getServerClient();
  const b = await req.json();
  if (!b.lot_id || b.amount === null) return NextResponse.json({ error: 'lot_id and amount are required' }, { status: 400 });
  const amount = Number(b.amount);

  const { data: lot } = await supabase
    .from('bop_auction_lots').select('current_bid, start_bid, bid_increment, status')
    .eq('id', b.lot_id).eq('auction_id', id).maybeSingle();
  if (!lot) return NextResponse.json({ error: 'lot not found' }, { status: 404 });
  if (lot.status === 'closed' || lot.status === 'sold') return NextResponse.json({ error: 'lot is closed' }, { status: 400 });

  const floor = lot.current_bid ?? lot.start_bid ?? 0;
  const minNext = Number(floor) + Number(lot.current_bid ? (lot.bid_increment ?? 0) : 0);
  if (amount < minNext) return NextResponse.json({ error: `bid must be at least ${minNext}` }, { status: 400 });

  // demote previous winning bid, insert new winning bid, bump lot current_bid
  await supabase.from('bop_auction_bids').update({ is_winning: false }).eq('lot_id', b.lot_id).eq('is_winning', true);
  const { data: bid, error } = await supabase.from('bop_auction_bids').insert({
    lot_id: b.lot_id,
    bidder_id: b.bidder_id ?? null,
    amount,
    bid_type: b.bid_type ?? 'manual',
    max_proxy_amount: b.max_proxy_amount ?? null,
    is_winning: true,
  }).select('id').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await supabase.from('bop_auction_lots').update({ current_bid: amount }).eq('id', b.lot_id);

  return NextResponse.json({ ok: true, bid_id: bid.id, current_bid: amount });
}

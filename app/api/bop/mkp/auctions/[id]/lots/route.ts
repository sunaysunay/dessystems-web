import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

// POST /api/bop/mkp/auctions/[id]/lots  → add a listing as a lot
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getServerClient();
  const b = await req.json();
  if (!b.listing_id) return NextResponse.json({ error: 'listing_id is required' }, { status: 400 });

  // next lot number
  let lotNo = b.lot_number;
  if (!lotNo) {
    const { data: max } = await supabase
      .from('bop_auction_lots')
      .select('lot_number')
      .eq('auction_id', id)
      .order('lot_number', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    lotNo = (max?.lot_number ?? 0) + 1;
  }

  const { data, error } = await supabase
    .from('bop_auction_lots')
    .insert({
      auction_id: id,
      listing_id: b.listing_id,
      lot_number: lotNo,
      reserve_price: b.reserve_price ?? null,
      start_bid: b.start_bid ?? null,
      bid_increment: b.bid_increment ?? 100,
      status: 'open',
    })
    .select('id')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id, lot_number: lotNo });
}

// PATCH /api/bop/mkp/auctions/[id]/lots  { lot_id, action: 'close' | 'reopen' }
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getServerClient();
  const b = await req.json();
  if (!b.lot_id) return NextResponse.json({ error: 'lot_id required' }, { status: 400 });

  if (b.action === 'reopen') {
    await supabase.from('bop_auction_results').delete().eq('lot_id', b.lot_id);
    await supabase.from('bop_auction_lots').update({ status: 'open' }).eq('id', b.lot_id).eq('auction_id', id);
    return NextResponse.json({ ok: true, status: 'open' });
  }

  // close: winner = highest bid, if reserve met
  const { data: lot } = await supabase.from('bop_auction_lots')
    .select('reserve_price').eq('id', b.lot_id).eq('auction_id', id).maybeSingle();
  if (!lot) return NextResponse.json({ error: 'lot not found' }, { status: 404 });

  const { data: top } = await supabase.from('bop_auction_bids')
    .select('bidder_id, amount').eq('lot_id', b.lot_id)
    .order('amount', { ascending: false }).limit(1).maybeSingle();

  const { data: auction } = await supabase.from('bop_auctions')
    .select('buyer_premium_pct').eq('id', id).maybeSingle();

  const reserveMet = top && (lot.reserve_price === null || Number(top.amount) >= Number(lot.reserve_price));
  if (top && reserveMet) {
    const premium = Number(top.amount) * (Number(auction?.buyer_premium_pct ?? 0) / 100);
    await supabase.from('bop_auction_results').upsert({
      lot_id: b.lot_id,
      winner_bidder_id: top.bidder_id ?? null,
      winning_bid: top.amount,
      buyer_premium: premium,
      total_due: Number(top.amount) + premium,
      payment_status: 'pending',
      payment_due_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    }, { onConflict: 'lot_id' });
    await supabase.from('bop_auction_lots').update({ status: 'sold' }).eq('id', b.lot_id);
    return NextResponse.json({ ok: true, status: 'sold', winning_bid: top.amount });
  }

  await supabase.from('bop_auction_lots').update({ status: 'unsold' }).eq('id', b.lot_id);
  return NextResponse.json({ ok: true, status: 'unsold', reason: top ? 'reserve not met' : 'no bids' });
}

// DELETE /api/bop/mkp/auctions/[id]/lots?lot_id=...
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getServerClient();
  const lotId = new URL(req.url).searchParams.get('lot_id');
  if (!lotId) return NextResponse.json({ error: 'lot_id is required' }, { status: 400 });
  const { error } = await supabase
    .from('bop_auction_lots')
    .delete()
    .eq('id', lotId)
    .eq('auction_id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

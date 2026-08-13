import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const AUCTION_COLS = ['title','type','status','starts_at','ends_at','location','country',
  'buyer_premium_pct','currency','catalog_url','livestream_url'];

function pick(o: any, cols: string[]) {
  const out: any = {}; for (const c of cols) if (c in o) out[c] = o[c] === '' ? null : o[c]; return out;
}

// GET /api/bop/mkp/auctions/[id] → auction + lots (joined to listing summary)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getServerClient();
  const { data, error } = await supabase
    .from('bop_auctions')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });

  const { data: lots } = await supabase
    .from('bop_auction_lots')
    .select(`
      *,
      bop_listings ( id, category, brand_id, model_id, year, des_score,
        bop_brands ( name ), bop_models ( name ) )
    `)
    .eq('auction_id', id)
    .order('lot_number', { ascending: true, nullsFirst: false });

  const shaped = (lots ?? []).map((l: any) => ({
    ...l,
    listing_label: l.bop_listings
      ? `${l.bop_listings.bop_brands?.name ?? ''} ${l.bop_listings.bop_models?.name ?? ''}`.trim() || l.bop_listings.category
      : '(listing removed)',
    listing_category: l.bop_listings?.category ?? null,
    listing_score: l.bop_listings?.des_score ?? null,
  }));

  return NextResponse.json({ auction: data, lots: shaped });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getServerClient();
  const b = await req.json();
  const { error } = await supabase.from('bop_auctions')
    .update({ ...pick(b, AUCTION_COLS), updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getServerClient();
  const { error } = await supabase.from('bop_auctions').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

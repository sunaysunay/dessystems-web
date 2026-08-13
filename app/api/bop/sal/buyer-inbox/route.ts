import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

// GET /api/bop/sal/buyer-inbox — threads, unread-first
export async function GET(_req: NextRequest) {
  const supabase = getServerClient();
  const { data, error } = await supabase.from('dm_conversations')
    .select('id, listing_id, buyer_id, status, last_message_at, des_unread, created_at, bop_listings(ref_no, year, bop_brands(name), bop_models(name), bop_listing_pricing(asking_price))')
    .order('des_unread', { ascending: false })
    .order('last_message_at', { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // buyer emails via profiles (display) — auth admin listing is heavier; dm_profiles first
  const buyerIds = [...new Set((data ?? []).map((c: any) => c.buyer_id))];
  const { data: profiles } = buyerIds.length
    ? await supabase.from('dm_profiles').select('id, display_name, phone').in('id', buyerIds)
    : { data: [] as any[] };
  const pmap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p]));

  return NextResponse.json({
    conversations: (data ?? []).map((c: any) => {
      const l = c.bop_listings;
      const pricing = Array.isArray(l?.bop_listing_pricing) ? l?.bop_listing_pricing[0] : l?.bop_listing_pricing;
      return {
        ...c,
        bop_listings: l ? { ref_no: l.ref_no, year: l.year, brand: l.bop_brands?.name ?? '', model: l.bop_models?.name ?? '', price: pricing?.asking_price ?? 0 } : null,
        buyer: pmap[c.buyer_id] ?? null,
      };
    }),
  });
}

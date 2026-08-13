// app/api/bop/mkt/meta/route.ts — cockpit bootstrap: channels, brand profiles,
// and listing search/context preview (Stage 1 grounding card).
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { buildBopListingContext } from '@/lib/bop-mkt';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const sb = getServerClient();
  const u = new URL(req.url);
  const q = u.searchParams.get('listing_q');
  const listingId = u.searchParams.get('listing_id');
  const locale = u.searchParams.get('locale') || 'nl';
  const tenant = Number(u.searchParams.get('tenant_id') || 0);

  // context preview for one listing (the grounding card)
  if (listingId) {
    const ctx = await buildBopListingContext(sb, listingId, locale);
    return NextResponse.json({ context: ctx });
  }

  // listing search by ref/title
  if (q !== null) {
    let base = sb.from('bop_listings').select('id,ref_no,tenant_id,year,category').limit(20);
    if (tenant) base = base.eq('tenant_id', tenant);
    if (q) base = base.ilike('ref_no', `%${q}%`);
    const { data: rows } = await base.order('created_at', { ascending: false });
    const ids = (rows ?? []).map(r => r.id);
    const { data: titles } = ids.length
      ? await sb.from('bop_listing_content').select('listing_id,title').in('listing_id', ids).eq('locale', locale)
      : { data: [] as any[] };
    const tmap = new Map((titles ?? []).map((t: any) => [t.listing_id, t.title]));
    return NextResponse.json({ listings: (rows ?? []).map(r => ({ ...r, title: tmap.get(r.id) ?? r.ref_no })) });
  }

  // default: channels + brand profiles
  const [{ data: channels }, { data: brands }] = await Promise.all([
    sb.from('bop_mkt_channels').select('*').eq('active', true).order('sort'),
    sb.from('bop_mkt_brand_profiles').select('*').order('tenant_id'),
  ]);
  return NextResponse.json({ channels: channels ?? [], brand_profiles: brands ?? [] });
}

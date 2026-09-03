/**
 * GET /api/bop/int/feed/marktplaats
 *
 * Generates an Admarkt XML feed from all active BOP listings
 * that have channel "marktplaats" enabled in bop_listing_channels.
 * Marktplaats polls this URL daily and syncs the ads.
 *
 * Query params:
 *   ?tenant_id=1        — filter by tenant (default: all)
 *   ?status=active       — listing status filter (default: published)
 *   ?key=<feed_secret>   — simple bearer token to prevent public scraping
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const NS = 'http://admarkt.marktplaats.nl/schemas/1.0';

const SPEC_TABLE: Record<string, string> = {
  van: 'bop_listing_specs_van', truck: 'bop_listing_specs_truck',
  trailer: 'bop_listing_specs_trailer', machinery: 'bop_listing_specs_machinery',
  construction: 'bop_listing_specs_machinery', camper: 'bop_listing_specs_camper',
  caravan: 'bop_listing_specs_camper', bus: 'bop_listing_specs_van',
  car: 'bop_listing_specs_car',
};

const CATEGORY_MAP: Record<string, string> = {
  camper:       '2060',
  caravan:      '2059',
  car:          '91',
  van:          '92',
  truck:        '93',
  bus:          '95',
  trailer:      '94',
  machinery:    '1744',
  construction: '1744',
};

function esc(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escAttr(s: string): string {
  return esc(s);
}

function priceType(method: string | null | undefined): string {
  if (!method) return 'FIXED_PRICE';
  switch (method) {
    case 'fixed': return 'FIXED_PRICE';
    case 'auction': return 'BIDDING';
    case 'negotiable': return 'NEGOTIABLE';
    case 'on_request': return 'SEE_DESCRIPTION';
    default: return 'FIXED_PRICE';
  }
}

function buildAdXml(
  listing: any,
  content: any,
  pricing: any,
  media: any[],
  spec: any,
): string {
  const vendorId = `bop-${listing.id}`;
  const categoryId = CATEGORY_MAP[listing.category] ?? '91';
  const rawTitle = content?.title
    ?? `${listing.bop_brands?.name ?? ''} ${listing.bop_models?.name ?? ''} ${listing.year ?? ''}`.trim();
  const title = esc(rawTitle || 'Vehicle');
  const description = esc(content?.full_desc ?? content?.short_desc ?? title);
  const priceCents = pricing?.asking_price ? Math.round(pricing.asking_price * 100) : null;
  const pt = priceType(listing.sale_method);

  const imageXml = media
    .map((m: any) => m.url)
    .filter(Boolean)
    .slice(0, 24)
    .map((url: string) => `      <admarkt:image url="${escAttr(url)}"/>`)
    .join('\n');

  const attrs: Array<{ name: string; value: string }> = [];
  if (spec?.mileage) attrs.push({ name: 'mileage', value: String(spec.mileage) });
  if (spec?.fuel) attrs.push({ name: 'fuel', value: String(spec.fuel) });
  if (listing.year) attrs.push({ name: 'constructionYear', value: String(listing.year) });
  if (spec?.power_hp) attrs.push({ name: 'power', value: String(spec.power_hp) });
  if (spec?.transmission) attrs.push({ name: 'transmission', value: String(spec.transmission) });
  if (spec?.color) attrs.push({ name: 'color', value: String(spec.color) });
  if (spec?.doors) attrs.push({ name: 'doors', value: String(spec.doors) });
  if (spec?.seats) attrs.push({ name: 'seats', value: String(spec.seats) });
  if (spec?.length_m) attrs.push({ name: 'length', value: String(spec.length_m) });
  if (spec?.gvw_kg) attrs.push({ name: 'gvw', value: String(spec.gvw_kg) });

  const attrXml = attrs.length > 0
    ? `    <admarkt:attributes>\n${attrs.map(a =>
        `      <admarkt:attribute>\n        <admarkt:attributeName>${esc(a.name)}</admarkt:attributeName>\n        <admarkt:attributeValue>${esc(a.value)}</admarkt:attributeValue>\n      </admarkt:attribute>`
      ).join('\n')}\n    </admarkt:attributes>`
    : '';

  const urlTag = listing.ref_no
    ? `    <admarkt:url>https://desshop.com/vehicles/${esc(String(listing.ref_no))}</admarkt:url>`
    : '';

  const phoneTag = listing.contact_phone
    ? `    <admarkt:phoneNumber>${esc(listing.contact_phone)}</admarkt:phoneNumber>`
    : '';

  const condTag = listing.condition
    ? `    <admarkt:condition>${listing.condition === 'new' ? 'new' : 'used'}</admarkt:condition>`
    : '    <admarkt:condition>used</admarkt:condition>';

  const brandTag = listing.bop_brands?.name
    ? `    <admarkt:brand>${esc(listing.bop_brands.name)}</admarkt:brand>`
    : '';

  return `  <admarkt:ad>
    <admarkt:vendorId>${esc(vendorId)}</admarkt:vendorId>
    <admarkt:title>${title}</admarkt:title>
    <admarkt:categoryId>${categoryId}</admarkt:categoryId>
    <admarkt:description>${description}</admarkt:description>
    <admarkt:priceType>${pt}</admarkt:priceType>
${priceCents !== null ? `    <admarkt:price>${priceCents}</admarkt:price>` : '    <admarkt:price xsi:nil="true" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"/>'}
    <admarkt:sellerName>DES Camper|Caravan|Outdoor</admarkt:sellerName>
    <admarkt:status>ACTIVE</admarkt:status>
    <admarkt:emailAdvertiser>true</admarkt:emailAdvertiser>
${urlTag ? urlTag + '\n' : ''}${phoneTag ? phoneTag + '\n' : ''}${condTag}
${brandTag ? brandTag + '\n' : ''}${imageXml ? `    <admarkt:media>\n${imageXml}\n    </admarkt:media>` : ''}
    <admarkt:shippingOptions>
      <admarkt:shippingOption>
        <admarkt:shippingType>PICKUP</admarkt:shippingType>
        <admarkt:location>4703RB</admarkt:location>
      </admarkt:shippingOption>
    </admarkt:shippingOptions>
${attrXml ? attrXml + '\n' : ''}  </admarkt:ad>`;
}

export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const sp = req.nextUrl.searchParams;

  const feedKey = sp.get('key') ?? '';
  const envKey = process.env.MARKTPLAATS_FEED_KEY ?? '';
  if (envKey && feedKey !== envKey) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const tenantId = sp.get('tenant_id') ?? '';
  const listingStatus = sp.get('status') ?? 'active';

  let q = supabase
    .from('bop_listings')
    .select(`
      *, bop_brands(name), bop_models(name),
      bop_listing_pricing(*),
      bop_listing_content(*),
      bop_listing_media(*),
      bop_listing_channels(*)
    `)
    .eq('status', listingStatus)
    .order('created_at', { ascending: false })
    .limit(500);

  if (tenantId) q = q.eq('tenant_id', parseInt(tenantId, 10));

  const { data: listings, error } = await q;

  if (error) {
    return new NextResponse(`<!-- error: ${error.message} -->`, {
      status: 500,
      headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    });
  }

  const rows = listings ?? [];
  const marktplaatsListings = rows.filter((l: any) =>
    (l.bop_listing_channels ?? []).some((c: any) => c.channel === 'marktplaats' && c.status !== 'removed')
  );

  const adXmls: string[] = [];

  for (const listing of marktplaatsListings) {
    const one = (v: any) => Array.isArray(v) ? v[0] ?? null : v ?? null;
    const pricing = one(listing.bop_listing_pricing);
    const content = (listing.bop_listing_content ?? []).find((c: any) => c.locale === 'nl') ?? one(listing.bop_listing_content);
    const media = (listing.bop_listing_media ?? []).sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

    const specTable = SPEC_TABLE[listing.category] ?? 'bop_listing_specs_van';
    const { data: spec } = await supabase.from(specTable).select('*').eq('listing_id', listing.id).maybeSingle();

    adXmls.push(buildAdXml(listing, content, pricing, media, spec));
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<admarkt:ads xmlns:admarkt="${NS}">
${adXmls.join('\n')}
</admarkt:ads>`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

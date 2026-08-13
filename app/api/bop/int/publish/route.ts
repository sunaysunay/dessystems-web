/**
 * POST /api/bop/int/publish
 * Fetches a bop_listing with all joins, builds a platform-specific payload,
 * and enqueues an int_messages row for the die-worker to process.
 *
 * GET /api/bop/int/publish?listing_id=<uuid>
 * Returns current channel publish status for a listing.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';


const SPEC_TABLE: Record<string, string> = {
  van: 'bop_listing_specs_van', truck: 'bop_listing_specs_truck',
  trailer: 'bop_listing_specs_trailer', machinery: 'bop_listing_specs_machinery',
  construction: 'bop_listing_specs_machinery', camper: 'bop_listing_specs_camper',
  caravan: 'bop_listing_specs_camper', bus: 'bop_listing_specs_van',
  car: 'bop_listing_specs_car',
};

function buildMarktplaatsPayload(
  listing_id: string,
  listing: any,
  content: any,
  pricing: any,
  media: any[],
  spec: any,
  action: string,
  existingChannel: any,
): Record<string, unknown> {
  const attrs = [
    spec?.mileage  ? { key: 'mileage',          value: String(spec.mileage)   } : null,
    spec?.fuel     ? { key: 'fuel',              value: spec.fuel              } : null,
    listing.year   ? { key: 'constructionYear', value: String(listing.year)   } : null,
    spec?.power_hp ? { key: 'power',             value: String(spec.power_hp) } : null,
  ].filter(Boolean);
  const externalId = action !== 'publish' && existingChannel
    ? { external_id: existingChannel.external_url?.split('/').pop() } : {};
  return {
    listing_id, entity_type: 'listing', entity_id: listing_id,
    title: (content?.title ?? `${listing.bop_brands?.name ?? ''} ${listing.bop_models?.name ?? ''}`.trim()) || 'Vehicle',
    description: content?.full_desc ?? content?.short_desc ?? '',
    category_id: '91',
    price_cents: pricing?.asking_price ? Math.round(pricing.asking_price * 100) : null,
    price_type: listing.sale_method === 'fixed' ? 'FIXED' : listing.sale_method === 'auction' ? 'AUCTION' : 'NEGOTIABLE',
    postcode: '0000AA',
    image_urls: media.map((m: any) => m.url).filter(Boolean).slice(0, 24),
    attributes: attrs,
    ...externalId,
  };
}

function inferGearbox(transmission: string | null | undefined): string | null {
  if (!transmission) return null;
  return transmission.toLowerCase().includes('auto') ? 'A' : 'M';
}

function inferPowerKw(powerKw: number | null | undefined, powerHp: number | null | undefined): number | null {
  if (powerKw !== null && powerKw !== undefined) return powerKw;
  if (powerHp) return Math.round(powerHp * 0.7457);
  return null;
}

function inferFirstReg(firstReg: string | null | undefined, year: number | null | undefined): string | null {
  if (firstReg) return firstReg;
  if (year) return `${year}-01-01`;
  return null;
}

function pickDescription(content: { full_desc?: string | null; short_desc?: string | null; title?: string | null } | null | undefined): string {
  return content?.full_desc ?? content?.short_desc ?? content?.title ?? '';
}

function buildAutoscout24Payload(
  listing_id: string,
  listing: any,
  content: any,
  pricing: any,
  media: any[],
  spec: any,
  action: string,
  existingChannel: any,
): Record<string, unknown> {
  const externalId = action !== 'publish' && existingChannel
    ? { external_id: (existingChannel.external_url as string | null)?.split('/').pop() } : {};
  return {
    listing_id, entity_type: 'listing', entity_id: listing_id,
    make: listing.bop_brands?.name ?? '',
    model: listing.bop_models?.name ?? '',
    year: listing.year ?? null,
    mileage_km: spec?.mileage ?? null,
    fuel_code: 'P',
    body_type_code: '5',
    power_kw: inferPowerKw(spec?.power_kw, spec?.power_hp),
    gearbox: inferGearbox(spec?.transmission),
    doors: spec?.doors ?? null,
    color: spec?.color ?? null,
    price_eur: pricing?.asking_price ?? null,
    description_nl: pickDescription(content),
    image_urls: (media as { url: string }[]).map(m => m.url).filter(Boolean).slice(0, 20),
    vin: spec?.vin ?? null,
    first_reg: inferFirstReg(spec?.first_registration, listing.year),
    ...externalId,
  };
}

export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const listing_id = req.nextUrl.searchParams.get('listing_id');
  if (!listing_id) return NextResponse.json({ error: 'listing_id required' }, { status: 400 });
  const { data, error } = await supabase
    .from('bop_listing_channels')
    .select('*')
    .eq('listing_id', listing_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ channels: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const { listing_id, channel, action = 'publish' } = await req.json();

  if (!listing_id || !channel) return NextResponse.json({ error: 'listing_id and channel required' }, { status: 400 });
  const flowAction = action === 'delete' ? `${channel}.delete` : action === 'update' ? `${channel}.update` : `${channel}.publish`;
  if (!['marktplaats.publish','marktplaats.update','marktplaats.delete','autoscout24.publish','autoscout24.update','autoscout24.delete'].includes(flowAction))
    return NextResponse.json({ error: `Unsupported channel/action: ${channel}/${action}` }, { status: 400 });

  // Resolve flow
  const { data: flow } = await supabase.from('int_flows').select('id, system_id').eq('flow_key', flowAction).eq('active', true).maybeSingle();
  if (!flow) return NextResponse.json({ error: `Flow ${flowAction} not found or inactive. Register credentials first.` }, { status: 400 });

  // Fetch full listing
  const { data: listing, error: listErr } = await supabase
    .from('bop_listings')
    .select(`*, bop_brands(name), bop_models(name), bop_listing_pricing(*), bop_listing_content(*), bop_listing_media(*), bop_listing_channels(*)`)
    .eq('id', listing_id)
    .single();
  if (listErr || !listing) return NextResponse.json({ error: listErr?.message ?? 'Listing not found' }, { status: 404 });

  // Fetch spec row
  const specTable = SPEC_TABLE[listing.category] ?? 'bop_listing_specs_van';
  const { data: spec } = await supabase.from(specTable).select('*').eq('listing_id', listing_id).maybeSingle();

  const one = (v: any) => Array.isArray(v) ? v[0] ?? null : v ?? null;
  const pricing  = one(listing.bop_listing_pricing);
  const content  = (listing.bop_listing_content ?? []).find((c: any) => c.locale === 'nl') ?? one(listing.bop_listing_content);
  const media    = (listing.bop_listing_media ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order);
  const channels = listing.bop_listing_channels ?? [];

  // For delete/update, we need the external_id from bop_listing_channels
  const existingChannel = channels.find((c: any) => c.channel === channel);

  const platformPayload = channel === 'marktplaats'
    ? buildMarktplaatsPayload(listing_id, listing, content, pricing, media, spec, action, existingChannel)
    : buildAutoscout24Payload(listing_id, listing, content, pricing, media, spec, action, existingChannel);

  // Enqueue int_messages row
  const { data: msg, error: msgErr } = await supabase.from('int_messages').insert({
    flow_id:      flow.id,
    system_id:    flow.system_id,
    message_type: action,
    entity_type:  'listing',
    entity_id:    listing_id,
    priority:     5,
    status:       'pending',
    max_attempts: 3,
    next_attempt_at: new Date().toISOString(),
    payload:      platformPayload,
  }).select('id').single();

  if (msgErr) return NextResponse.json({ error: msgErr.message }, { status: 500 });

  // Optimistically mark channel as pending in bop_listing_channels
  if (action === 'publish' || action === 'update') {
    await supabase.from('bop_listing_channels').upsert({
      listing_id, channel, status: 'pending', external_url: existingChannel?.external_url ?? null,
    }, { onConflict: 'listing_id,channel' });
  }

  return NextResponse.json({ ok: true, message_id: msg?.id, flow_key: flowAction });
}

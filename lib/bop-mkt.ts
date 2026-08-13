// lib/bop-mkt.ts — AI Marketing Cockpit core (shared shape for BOP + descamper *2)
// Pure & provider-agnostic: the caller injects the LLM completion fn and the
// Supabase client, so this same file works in the BOP console and in descamper.
//
// Grounding contract: ONLY fields placed on `ListingContext` reach the model.
// If a field is absent it is omitted — the model is instructed never to invent.

import type { SupabaseClient } from '@supabase/supabase-js';

// ── Types ───────────────────────────────────────────────────────────────────
export type Channel =
  | 'linkedin' | 'facebook' | 'instagram' | 'x' | 'email'
  | 'marktplaats' | 'telegram' | 'blog' | 'google_business';

export interface BrandProfile {
  tenant_id: number;
  entity: string | null;
  tone: string;
  voice_notes: string | null;
  banned_phrases: string[];
  locale_defaults: string[];
}

export interface ChannelSpec { channel: Channel; label: string; char_limit: number | null; supports_image: boolean; }

export interface ListingContext {
  ref?: string | null;
  title?: string | null;
  category?: string | null;
  brand?: string | null;
  model?: string | null;
  year?: number | null;
  condition?: string | null;
  price?: number | null;
  currency?: string | null;
  vat_scheme?: string | null;
  des_score?: number | null;
  highlights?: string[];
  features?: string[];
  specs?: Record<string, string | number>;
  cover_image?: string | null;
  country?: string | null;
}

export interface GenerateBrief {
  objective?: string;                 // lead_gen | new_arrival | price_drop | feature_highlight | brand_awareness
  target_audience?: string;
  channels: Channel[];
  locales: string[];                  // ['nl','en',...]
  toneOverride?: string;
  manualPrompt?: string;              // when source_type = manual (no listing)
}

export interface OutputDraft {
  channel: Channel; locale: string;
  subject?: string; body: string; hashtags: string[]; cta?: string; image_prompt?: string;
}

// ── Brand + channels loaders ─────────────────────────────────────────────────
export async function loadBrandProfile(sb: SupabaseClient, tenantId: number): Promise<BrandProfile> {
  const { data } = await sb.from('bop_mkt_brand_profiles').select('*').eq('tenant_id', tenantId).maybeSingle();
  return {
    tenant_id: tenantId,
    entity: data?.entity ?? null,
    tone: data?.tone ?? 'professional',
    voice_notes: data?.voice_notes ?? null,
    banned_phrases: data?.banned_phrases ?? [],
    locale_defaults: data?.locale_defaults ?? ['nl', 'en'],
  };
}

export async function loadChannelSpecs(sb: SupabaseClient, channels: Channel[]): Promise<ChannelSpec[]> {
  const { data } = await sb.from('bop_mkt_channels').select('channel,label,char_limit,supports_image').in('channel', channels).eq('active', true);
  return (data ?? []) as ChannelSpec[];
}

function extractVanSpecs(
  specVan: { mileage?: number | null; fuel?: string | null; transmission?: string | null; power_hp?: number | null; euro_norm?: string | null } | null | undefined,
): Record<string, string | number> {
  const specs: Record<string, string | number> = {};
  if (!specVan) return specs;
  if (specVan.mileage !== null && specVan.mileage !== undefined)   specs.mileage_km  = specVan.mileage;
  if (specVan.fuel)              specs.fuel         = specVan.fuel;
  if (specVan.transmission)      specs.transmission = specVan.transmission;
  if (specVan.power_hp !== null && specVan.power_hp !== undefined)  specs.power_hp     = specVan.power_hp;
  if (specVan.euro_norm)         specs.euro_norm    = specVan.euro_norm;
  return specs;
}

// ── Context builder — grounds strictly on bop_listings + children ────────────
// locale: the primary locale used to pull title/desc/highlights/features.
export async function buildBopListingContext(sb: SupabaseClient, listingId: string, locale = 'nl'): Promise<ListingContext> {
  const [{ data: l }, { data: content }, { data: pricing }, { data: media }] = await Promise.all([
    sb.from('bop_listings').select('ref_no,category,year,condition,country_origin,des_score,brand_id,model_id').eq('id', listingId).maybeSingle(),
    sb.from('bop_listing_content').select('title,highlights,features,short_desc').eq('listing_id', listingId).eq('locale', locale).maybeSingle(),
    sb.from('bop_listing_pricing').select('asking_price,currency,vat_scheme').eq('listing_id', listingId).maybeSingle(),
    sb.from('bop_listing_media').select('url,is_cover,sort_order').eq('listing_id', listingId).order('is_cover', { ascending: false }).order('sort_order').limit(1),
  ]);

  // brand/model names + typed specs (van table is the common core; extend per category)
  const [{ data: brand }, { data: model }, { data: specVan }] = await Promise.all([
    l?.brand_id ? sb.from('bop_brands').select('name').eq('id', l.brand_id).maybeSingle() : Promise.resolve({ data: null }),
    l?.model_id ? sb.from('bop_models').select('name').eq('id', l.model_id).maybeSingle() : Promise.resolve({ data: null }),
    sb.from('bop_listing_specs_van').select('mileage,fuel,transmission,power_hp,euro_norm').eq('listing_id', listingId).maybeSingle(),
  ]);

  const specs = extractVanSpecs(specVan);

  return prune({
    ref: l?.ref_no,
    title: content?.title,
    category: l?.category,
    brand: (brand as any)?.name ?? null,
    model: (model as any)?.name ?? null,
    year: l?.year,
    condition: l?.condition,
    price: pricing?.asking_price,
    currency: pricing?.currency,
    vat_scheme: pricing?.vat_scheme,
    des_score: l?.des_score,
    highlights: content?.highlights ?? [],
    features: content?.features ?? [],
    specs,
    cover_image: media?.[0]?.url ?? null,
    country: l?.country_origin,
  });
}

// drop null/undefined/empty so absent fields never reach the model
function prune(ctx: ListingContext): ListingContext {
  const out: any = {};
  for (const [k, v] of Object.entries(ctx)) {
    if (v === null) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    if (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0) continue;
    out[k] = v;
  }
  return out;
}

// ── Prompt assembler ─────────────────────────────────────────────────────────
export function buildSystemPrompt(brand: BrandProfile, channels: ChannelSpec[]): string {
  const limits = channels.map(c => `- ${c.channel}: ${c.char_limit ? `~${c.char_limit} chars max` : 'no hard limit'}`).join('\n');
  const banned = brand.banned_phrases.length ? `\nNever use these phrases: ${brand.banned_phrases.join(', ')}.` : '';
  return [
    `You are the marketing copywriter for ${brand.entity ?? 'the company'}.`,
    `Brand tone: ${brand.tone}.${brand.voice_notes ? ` Voice: ${brand.voice_notes}` : ''}${banned}`,
    ``,
    `HARD RULES:`,
    `- Use ONLY facts present in the provided listing JSON. If a field is absent, do not mention it.`,
    `- Never invent price, mileage, year, condition, availability, or specifications.`,
    `- Write each requested locale natively (not translated word-for-word).`,
    `- Respect per-channel length:`,
    limits,
    ``,
    `OUTPUT: strict JSON, no prose, shape:`,
    `{"outputs":[{"channel":"<c>","locale":"<xx>","subject":"<for email/blog, else empty>","body":"...","hashtags":["..."],"cta":"...","image_prompt":"..."}]}`,
  ].join('\n');
}

export function buildUserPrompt(ctx: ListingContext | null, brief: GenerateBrief): string {
  const pairs = brief.channels.flatMap(c => brief.locales.map(loc => ({ channel: c, locale: loc })));
  return JSON.stringify({
    task: 'Generate marketing copy for every channel×locale pair below.',
    objective: brief.objective ?? 'brand_awareness',
    target_audience: brief.target_audience ?? null,
    tone_override: brief.toneOverride ?? null,
    manual_prompt: brief.manualPrompt ?? null,
    listing: ctx,                       // null for manual campaigns
    required_pairs: pairs,
  }, null, 2);
}

// ── Strict-JSON parser (tolerant of code fences / leading prose) ─────────────
export function parseOutputs(raw: string): OutputDraft[] {
  let txt = raw.trim();
  const fence = txt.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) txt = fence[1].trim();
  const start = txt.indexOf('{');
  const end = txt.lastIndexOf('}');
  if (start >= 0 && end > start) txt = txt.slice(start, end + 1);
  const obj = JSON.parse(txt);
  const arr = Array.isArray(obj) ? obj : obj.outputs;
  if (!Array.isArray(arr)) throw new Error('LLM output missing "outputs" array');
  return arr.map((o: any) => ({
    channel: o.channel, locale: (o.locale || '').slice(0, 2),
    subject: o.subject || undefined,
    body: String(o.body ?? ''),
    hashtags: Array.isArray(o.hashtags) ? o.hashtags : [],
    cta: o.cta || undefined,
    image_prompt: o.image_prompt || undefined,
  })).filter((o: OutputDraft) => o.channel && o.locale && o.body);
}

// ── Verification pass prompt (cheap model) ───────────────────────────────────
export function buildVerifyPrompt(ctx: ListingContext | null, outputs: OutputDraft[]): { system: string; user: string } {
  return {
    system: 'You are a fact-checker. Given a listing JSON (the ONLY source of truth) and marketing copy, list any claim in the copy not supported by the listing JSON. Output strict JSON: {"warnings":[{"channel":"","locale":"","claim":"","issue":""}]}. Empty array if all supported.',
    user: JSON.stringify({ listing: ctx, outputs: outputs.map(o => ({ channel: o.channel, locale: o.locale, body: o.body })) }),
  };
}

export interface VerifyWarning { channel: string; locale: string; claim: string; issue: string; }
export function parseWarnings(raw: string): VerifyWarning[] {
  try {
    let t = raw.trim(); const f = t.match(/```(?:json)?\s*([\s\S]*?)```/); if (f) t = f[1];
    const s = t.indexOf('{'), e = t.lastIndexOf('}'); if (s >= 0) t = t.slice(s, e + 1);
    const w = JSON.parse(t).warnings; return Array.isArray(w) ? w : [];
  } catch { return []; }
}

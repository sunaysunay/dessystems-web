import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Static taxonomy ──────────────────────────────────────────────────────────
// These are injected into each row when the DB columns don't exist yet.
// Once migration 57 (ALTER TABLE … ADD COLUMN) is applied, the DB values take over.

const GROUP_MAP: Record<string, string> = {
  seo_faceted_urls: 'seo', listing_meta: 'seo', vehicles_meta: 'seo',
  show_btw_badge: 'b2b', btw_toggle: 'b2b', listing_card_v2: 'b2b',
  cargo_visualizer: 'b2b', suitability_ratings: 'b2b', smart_badges: 'b2b',
  live_category_counts: 'ux', show_comparison: 'ux', comparison_drawer: 'ux',
  active_filter_chips: 'ux', export_readiness: 'ux', hover_image_cycle: 'ux',
  quick_preview: 'ux', similar_vehicles: 'ux', market_heat: 'ux', vehicle_timeline: 'ux',
  show_financing_teaser: 'pricing', show_deal_score: 'pricing', finance_preview: 'pricing',
  opportunity_score: 'pricing', price_history: 'pricing', total_landed_cost: 'pricing',
  trade_calculator: 'pricing',
  sell_funnel: 'conversion', dealer_trust_card: 'conversion', fly_banner: 'conversion',
  dm_accounts: 'accounts', save_search: 'accounts', save_search_email: 'accounts',
  vehicle_story: 'content',
};

const AUDIENCE_MAP: Record<string, string> = {
  show_btw_badge: 'b2b', btw_toggle: 'b2b', listing_card_v2: 'b2b',
  show_financing_teaser: 'b2c',
  dm_accounts: 'both', save_search: 'both', save_search_email: 'both',
  show_deal_score: 'both', show_comparison: 'both', active_filter_chips: 'both',
  live_category_counts: 'both', seo_faceted_urls: 'both', listing_meta: 'both',
  vehicles_meta: 'both', export_readiness: 'both', sell_funnel: 'both',
};

const CTX_MAP: Record<string, string> = {
  // dm_accounts is intentionally 'any' — 'logged_in' would hide the login menu
  // from anonymous storefront visitors (see sql/bop_v2/57_site_features_groups.sql)
  save_search: 'logged_in', save_search_email: 'logged_in',
};

// Protection fallback (until migration 58 adds is_locked/is_critical columns)
const LOCKED_KEYS_FALLBACK = new Set(['dm_accounts']);
const LOCKED_REASONS_FALLBACK: Record<string, string> = {
  dm_accounts: 'Disabling logs out all users and destroys active sessions. Contact super-admin.',
};

function enrich(row: Record<string, unknown>): Record<string, unknown> {
  const key = row.feature_key as string;
  return {
    ...row,
    group_key:        (row.group_key        as string  | null) ?? GROUP_MAP[key]    ?? 'system',
    audience:         (row.audience         as string  | null) ?? AUDIENCE_MAP[key] ?? 'both',
    user_context:     (row.user_context     as string  | null) ?? CTX_MAP[key]      ?? 'any',
    importance_level: (row.importance_level as string  | null) ?? 'P2',
    // Protection: DB column value wins; if absent fall back to hardcoded sets
    is_locked:   row.is_locked   != null ? (row.is_locked   as boolean) : LOCKED_KEYS_FALLBACK.has(key),
    lock_reason: (row.lock_reason as string | null) ?? (LOCKED_KEYS_FALLBACK.has(key) ? LOCKED_REASONS_FALLBACK[key] ?? null : null),
    is_critical: (row.is_critical as boolean | null) ?? null,
  };
}

export async function GET(req: NextRequest) {
  const tid = req.nextUrl.searchParams.get('tenant_id');
  if (!tid) return NextResponse.json({ error: 'tenant_id required' }, { status: 400 });
  const { data, error } = await sb()
    .from('tenant_site_features')
    .select('*')
    .eq('tenant_id', tid)
    .order('sort_order');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: (data ?? []).map(enrich) });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { tenant_id, feature_key, enabled, notes, config } = body;
  if (!tenant_id || !feature_key) return NextResponse.json({ error: 'tenant_id and feature_key required' }, { status: 400 });
  // Enforce lock: check hardcoded fallback first (fast), then DB column if present
  const LOCKED_KEYS_API = new Set(['dm_accounts']);
  const LOCKED_REASONS_API: Record<string, string> = {
    dm_accounts: 'Disabling logs out all users and destroys active sessions. Contact super-admin.',
  };
  if (enabled !== undefined) {
    // Check DB lock column
    const { data: featureRow } = await sb()
      .from('tenant_site_features')
      .select('*')
      .eq('tenant_id', tenant_id)
      .eq('feature_key', feature_key)
      .single();
    const locked = (featureRow as any)?.is_locked ?? LOCKED_KEYS_API.has(feature_key as string);
    if (locked) {
      const reason = (featureRow as any)?.lock_reason ?? LOCKED_REASONS_API[feature_key as string] ?? 'Contact super-admin';
      return NextResponse.json({ error: 'Feature is locked', reason }, { status: 403 });
    }
  }
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (enabled !== undefined) { patch.enabled = enabled; }
  if (notes !== undefined) patch.notes = notes;
  if (config !== undefined) patch.config = config;
  const { error } = await sb()
    .from('tenant_site_features')
    .update(patch)
    .eq('tenant_id', tenant_id)
    .eq('feature_key', feature_key);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

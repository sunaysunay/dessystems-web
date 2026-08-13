-- Migration 58: Add protection columns to tenant_site_features
-- Apply in Supabase SQL Editor at: supabase.com > project > SQL Editor

ALTER TABLE tenant_site_features
  ADD COLUMN IF NOT EXISTS is_critical boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_locked   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lock_reason text,
  ADD COLUMN IF NOT EXISTS changed_by  text,
  ADD COLUMN IF NOT EXISTS changed_at  timestamptz;

-- Seed critical flags (for all tenants — they can adjust per tenant if needed)
UPDATE tenant_site_features SET is_critical = true
WHERE feature_key IN (
  'listing_meta','seo_faceted_urls','vehicles_meta',
  'sell_funnel','save_search_email','btw_toggle'
);

-- Seed locked flag (dm_accounts)
UPDATE tenant_site_features
SET is_critical = true,
    is_locked = true,
    lock_reason = 'Disabling logs out all users and destroys active sessions. Contact super-admin.'
WHERE feature_key = 'dm_accounts';

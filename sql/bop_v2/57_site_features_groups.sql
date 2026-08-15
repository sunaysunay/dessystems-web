-- ============================================================
-- Migration 57: Site features grouping, audience, user context
--               + importance level
-- ============================================================

ALTER TABLE tenant_site_features
  ADD COLUMN IF NOT EXISTS group_key        text,
  ADD COLUMN IF NOT EXISTS audience         text DEFAULT 'both'
    CHECK (audience IN ('b2b', 'b2c', 'both')),
  ADD COLUMN IF NOT EXISTS user_context     text DEFAULT 'any'
    CHECK (user_context IN ('any', 'logged_in', 'b2b')),
  ADD COLUMN IF NOT EXISTS importance_level text DEFAULT 'P2'
    CHECK (importance_level IN ('P0', 'P1', 'P2', 'P3'));

-- Indexes for common filter queries
CREATE INDEX IF NOT EXISTS idx_tsf_group_key   ON tenant_site_features (tenant_id, group_key);
CREATE INDEX IF NOT EXISTS idx_tsf_importance  ON tenant_site_features (tenant_id, importance_level);
CREATE INDEX IF NOT EXISTS idx_tsf_audience    ON tenant_site_features (tenant_id, audience);

-- importance_level key:
--   P0 = Core / must-have  (product breaks or major revenue impact)
--   P1 = High              (significant UX or conversion impact)
--   P2 = Medium            (valuable enhancement, can launch without)
--   P3 = Advanced          (future / nice-to-have / experimental)

UPDATE tenant_site_features SET group_key='seo',        audience='both',      user_context='any',       importance_level='P0' WHERE feature_key='listing_meta';
UPDATE tenant_site_features SET group_key='seo',        audience='both',      user_context='any',       importance_level='P0' WHERE feature_key='seo_faceted_urls';
UPDATE tenant_site_features SET group_key='seo',        audience='both',      user_context='any',       importance_level='P1' WHERE feature_key='vehicles_meta';
UPDATE tenant_site_features SET group_key='b2b',        audience='b2b',       user_context='any',       importance_level='P0' WHERE feature_key='show_btw_badge';
UPDATE tenant_site_features SET group_key='b2b',        audience='b2b',       user_context='any',       importance_level='P1' WHERE feature_key='btw_toggle';
UPDATE tenant_site_features SET group_key='b2b',        audience='b2b',       user_context='any',       importance_level='P2' WHERE feature_key='listing_card_v2';
UPDATE tenant_site_features SET group_key='ux',         audience='both',      user_context='any',       importance_level='P1' WHERE feature_key='live_category_counts';
UPDATE tenant_site_features SET group_key='ux',         audience='both',      user_context='any',       importance_level='P1' WHERE feature_key='active_filter_chips';
UPDATE tenant_site_features SET group_key='ux',         audience='both',      user_context='any',       importance_level='P2' WHERE feature_key='show_comparison';
UPDATE tenant_site_features SET group_key='ux',         audience='both',      user_context='any',       importance_level='P2' WHERE feature_key='export_readiness';
UPDATE tenant_site_features SET group_key='pricing',    audience='b2c',       user_context='any',       importance_level='P1' WHERE feature_key='show_financing_teaser';
UPDATE tenant_site_features SET group_key='pricing',    audience='both',      user_context='any',       importance_level='P2' WHERE feature_key='show_deal_score';
UPDATE tenant_site_features SET group_key='conversion', audience='both',      user_context='any',       importance_level='P0' WHERE feature_key='sell_funnel';
-- dm_accounts must stay user_context='any': the storefront layout fetches flags
-- with context 'any', and a 'logged_in' value would hide the login/account menu
-- from anonymous visitors (nobody could sign in).
UPDATE tenant_site_features SET group_key='accounts',   audience='both',      user_context='any',       importance_level='P0' WHERE feature_key='dm_accounts';
UPDATE tenant_site_features SET group_key='accounts',   audience='both',      user_context='logged_in', importance_level='P2' WHERE feature_key='save_search';
UPDATE tenant_site_features SET group_key='accounts',   audience='both',      user_context='logged_in', importance_level='P3' WHERE feature_key='save_search_email';

-- Default all remaining unclassified features
UPDATE tenant_site_features SET
  group_key        = COALESCE(group_key,        'system'),
  audience         = COALESCE(audience,         'both'),
  user_context     = COALESCE(user_context,     'any'),
  importance_level = COALESCE(importance_level, 'P2')
WHERE group_key IS NULL OR audience IS NULL OR user_context IS NULL OR importance_level IS NULL;

-- ============================================================================
-- CI-T11: Ad spend import (Google + Meta)
-- ============================================================================

CREATE TABLE IF NOT EXISTS ci_ad_spend_daily (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id       integer NOT NULL,
  fact_date       date NOT NULL,
  channel         text NOT NULL,
  campaign_name   text,
  campaign_id     text,
  adset_name      text,
  adset_id        text,

  spend_cents     bigint NOT NULL DEFAULT 0,
  spend_currency  text NOT NULL DEFAULT 'EUR',
  fx_rate         numeric(12,6) NOT NULL DEFAULT 1.000000,
  spend_eur_cents bigint NOT NULL DEFAULT 0,

  impressions     bigint NOT NULL DEFAULT 0,
  clicks          integer NOT NULL DEFAULT 0,
  conversions     integer NOT NULL DEFAULT 0,
  conversion_value_cents bigint NOT NULL DEFAULT 0,

  restated        boolean NOT NULL DEFAULT false,
  imported_at     timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, fact_date, channel, campaign_id, adset_id)
);

CREATE INDEX IF NOT EXISTS idx_ci_ad_spend_date
  ON ci_ad_spend_daily (tenant_id, fact_date);

CREATE INDEX IF NOT EXISTS idx_ci_ad_spend_channel
  ON ci_ad_spend_daily (tenant_id, channel, fact_date);

ALTER TABLE ci_ad_spend_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY ci_ad_spend_daily_tenant_isolation ON ci_ad_spend_daily
  USING (tenant_id = current_setting('app.tenant_id', true)::integer)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::integer);

INSERT INTO bop_objects (object_id, type, module, name, status, description)
VALUES
  ('table:ci_ad_spend_daily', 'table', 'SHP', 'ci_ad_spend_daily', 'active',
   'L2 — Daily ad spend import (Google Ads, Meta)')
ON CONFLICT (object_id) DO UPDATE SET
  description = EXCLUDED.description,
  status = 'active';

-- ROLLBACK:
-- DELETE FROM bop_objects WHERE object_id = 'table:ci_ad_spend_daily';
-- DROP POLICY IF EXISTS ci_ad_spend_daily_tenant_isolation ON ci_ad_spend_daily;
-- DROP TABLE IF EXISTS ci_ad_spend_daily;

-- ============================================================
-- BOP V2 Migration 89 — op_goal_metrics_catalog + KR metric_code
-- STR-P2 T4.1: System-wide metric definitions for auto-compute
-- ============================================================

BEGIN;

-- 1) Metrics catalog — no tenant_id (system-wide reference)
CREATE TABLE IF NOT EXISTS op_goal_metrics_catalog (
  code        TEXT PRIMARY KEY,
  name_i18n   JSONB NOT NULL DEFAULT '{}',
  metric_type TEXT NOT NULL DEFAULT 'count'
              CHECK (metric_type IN ('count','sum','avg','ratio','manual')),
  unit_label  TEXT NOT NULL DEFAULT '',
  entity_scoped BOOLEAN NOT NULL DEFAULT TRUE,
  query_key   TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE op_goal_metrics_catalog IS 'System-wide metric definitions for auto-computed KRs';

-- 2) Add metric_code FK to op_goal_key_results
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'op_goal_key_results' AND column_name = 'metric_code'
  ) THEN
    ALTER TABLE op_goal_key_results
      ADD COLUMN metric_code TEXT REFERENCES op_goal_metrics_catalog(code) ON DELETE SET NULL;
  END IF;
END $$;

-- 3) Seed 9 metric codes
INSERT INTO op_goal_metrics_catalog (code, name_i18n, metric_type, unit_label, entity_scoped, query_key, description)
VALUES
  ('vans_sold',
   '{"en":"Vans Sold","nl":"Busjes Verkocht","de":"Transporter Verkauft"}',
   'count', 'units', TRUE, 'vans_sold',
   'Count of assets transitioned to sold status within period'),

  ('revenue_invoiced',
   '{"en":"Revenue Invoiced","nl":"Gefactureerde Omzet","de":"Fakturierter Umsatz"}',
   'sum', '€', TRUE, 'revenue_invoiced',
   'Sum of fin_invoices.gross for non-cancelled invoices within period'),

  ('gross_margin_sum',
   '{"en":"Gross Margin","nl":"Bruto Marge","de":"Bruttomarge"}',
   'sum', '€', TRUE, 'gross_margin_sum',
   'Sum of (selling_price - cost_price) for sold assets, margeregeling-aware'),

  ('avg_days_to_sale',
   '{"en":"Avg Days to Sale","nl":"Gem. Dagen tot Verkoop","de":"Durchschn. Tage bis Verkauf"}',
   'avg', 'days', TRUE, 'avg_days_to_sale',
   'Average days between asset created_at and sold_at within period'),

  ('inquiries_count',
   '{"en":"Inquiries","nl":"Aanvragen","de":"Anfragen"}',
   'count', 'leads', TRUE, 'inquiries_count',
   'Count of listing_inquiries or crm_leads created within period'),

  ('inquiry_to_sale_conversion',
   '{"en":"Inquiry→Sale Conversion","nl":"Aanvraag→Verkoop Conversie","de":"Anfrage→Verkauf Konversion"}',
   'ratio', '%', TRUE, 'inquiry_to_sale_conversion',
   'Ratio of won leads to total leads within period'),

  ('nps_avg',
   '{"en":"NPS Average","nl":"NPS Gemiddeld","de":"NPS Durchschnitt"}',
   'avg', 'score', FALSE, 'nps_avg',
   'Average NPS score from sal_surveys within period'),

  ('review_score_avg',
   '{"en":"Review Score Avg","nl":"Review Score Gem.","de":"Bewertung Durchschn."}',
   'avg', '★', FALSE, 'review_score_avg',
   'Average review rating from sal_surveys within period'),

  ('stock_count',
   '{"en":"Stock Count","nl":"Voorraad Aantal","de":"Bestandsanzahl"}',
   'count', 'units', TRUE, 'stock_count',
   'Current count of assets with status available or reserved')
ON CONFLICT (code) DO NOTHING;

-- 4) Index for KR lookups by metric_code
CREATE INDEX IF NOT EXISTS idx_op_goal_kr_metric_code
  ON op_goal_key_results (metric_code)
  WHERE metric_code IS NOT NULL;

COMMIT;

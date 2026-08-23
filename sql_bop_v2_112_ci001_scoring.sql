-- CI-T27/T28 — Scoring engine tables
-- ci_benchmark: percentile distributions per scope (§6.1)
-- ci_score_def: score definitions, versioned (§6)
-- ci_score_component: component weights per score definition
-- ci_score_result: computed scores per entity per day

-- ═══════════════════════════════════════════════════════
--  ci_benchmark
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS ci_benchmark (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id     integer NOT NULL DEFAULT current_setting('app.tenant_id', true)::integer,
  scope         text    NOT NULL,       -- 'site' | 'category:<id>' | 'category_price_band:<id>:<band>'
  metric        text    NOT NULL,       -- e.g. 'cvr_view_to_order', 'revenue_per_session'
  computed_date date    NOT NULL,
  n             integer NOT NULL,
  p1            double precision,
  p5            double precision,
  p10           double precision,
  p25           double precision,
  p50           double precision,
  p75           double precision,
  p90           double precision,
  p95           double precision,
  p99           double precision,
  mean          double precision,
  stddev        double precision,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, scope, metric, computed_date)
);

ALTER TABLE ci_benchmark ENABLE ROW LEVEL SECURITY;
CREATE POLICY ci_benchmark_tenant_isolation ON ci_benchmark
  USING (tenant_id = current_setting('app.tenant_id', true)::integer)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::integer);

-- ═══════════════════════════════════════════════════════
--  ci_score_def — versioned score definitions
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS ci_score_def (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id     integer NOT NULL DEFAULT current_setting('app.tenant_id', true)::integer,
  score_key     text    NOT NULL,       -- 'product_performance', 'customer_value', 'content_fitment'
  version       integer NOT NULL DEFAULT 1,
  label         jsonb   NOT NULL DEFAULT '{}',
  description   text,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, score_key, version)
);

ALTER TABLE ci_score_def ENABLE ROW LEVEL SECURITY;
CREATE POLICY ci_score_def_tenant_isolation ON ci_score_def
  USING (tenant_id = current_setting('app.tenant_id', true)::integer)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::integer);

-- ═══════════════════════════════════════════════════════
--  ci_score_component — weights per score definition
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS ci_score_component (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  score_def_id  bigint  NOT NULL REFERENCES ci_score_def(id) ON DELETE CASCADE,
  component_key text    NOT NULL,       -- e.g. 'cvr', 'margin', 'return_rate'
  weight        double precision NOT NULL DEFAULT 1.0,
  direction     text    NOT NULL DEFAULT 'higher_better',  -- 'higher_better' | 'lower_better'
  metric        text    NOT NULL,       -- source metric key
  shrinkage_key text,                   -- null = no shrinkage; else key in SHRINKAGE_K
  sort_order    integer NOT NULL DEFAULT 0,
  UNIQUE (score_def_id, component_key)
);

-- No RLS needed — accessed via score_def join

-- ═══════════════════════════════════════════════════════
--  ci_score_result — computed scores per entity per day
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS ci_score_result (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id       integer NOT NULL DEFAULT current_setting('app.tenant_id', true)::integer,
  score_def_id    bigint  NOT NULL REFERENCES ci_score_def(id) ON DELETE CASCADE,
  entity_type     text    NOT NULL,     -- 'product' | 'customer' | 'variant'
  entity_id       text    NOT NULL,
  computed_date   date    NOT NULL,
  score           double precision,     -- null if suppressed
  suppressed_reason text,               -- e.g. 'cost_data_missing', 'insufficient_data'
  components      jsonb   NOT NULL DEFAULT '{}',
  -- { "cvr": { "raw": 0.03, "adjusted": 0.028, "score": 62, "peer_level": "category", "n": 45, "confidence": 0.72 }, ... }
  peer_level      text,
  confidence      double precision,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, score_def_id, entity_type, entity_id, computed_date)
);

ALTER TABLE ci_score_result ENABLE ROW LEVEL SECURITY;
CREATE POLICY ci_score_result_tenant_isolation ON ci_score_result
  USING (tenant_id = current_setting('app.tenant_id', true)::integer)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::integer);

-- ═══════════════════════════════════════════════════════
--  bop_objects registration
-- ═══════════════════════════════════════════════════════

INSERT INTO bop_objects (object_id, type, module, name, status, description)
VALUES
  ('ci_benchmark',      'table', 'CI', 'ci_benchmark',      'active', 'Percentile distributions per scope/metric/date (L2, §6.1)'),
  ('ci_score_def',      'table', 'CI', 'ci_score_def',      'active', 'Score definitions, versioned (L3, §6)'),
  ('ci_score_component','table', 'CI', 'ci_score_component', 'active', 'Component weights per score definition (L3)'),
  ('ci_score_result',   'table', 'CI', 'ci_score_result',   'active', 'Computed scores per entity per day (L2, §6)')
ON CONFLICT (object_id) DO NOTHING;

-- ═══════════════════════════════════════════════════════
--  bop_dependencies
-- ═══════════════════════════════════════════════════════

INSERT INTO bop_dependencies (from_id, to_id, dep_type)
VALUES
  ('ci_benchmark',       'ci_daily_product',    'reads'),
  ('ci_benchmark',       'ci_daily_sales',      'reads'),
  ('ci_benchmark',       'ci_daily_traffic',    'reads'),
  ('ci_score_result',    'ci_benchmark',         'reads'),
  ('ci_score_result',    'ci_score_def',         'reads'),
  ('ci_score_result',    'ci_score_component',   'reads'),
  ('ci_score_component', 'ci_score_def',         'child')
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════
--  Seed default score definitions
-- ═══════════════════════════════════════════════════════

-- Product Performance Score v1
INSERT INTO ci_score_def (tenant_id, score_key, version, label, description)
VALUES (400, 'product_performance', 1,
  '{"en":"Product Performance","nl":"Productprestatie","de":"Produktleistung","fr":"Performance Produit","tr":"Ürün Performansı"}',
  'Composite score: conversion, margin, traffic, return rate, inventory turn')
ON CONFLICT (tenant_id, score_key, version) DO NOTHING;

-- Content & Fitment Score v1
INSERT INTO ci_score_def (tenant_id, score_key, version, label, description)
VALUES (400, 'content_fitment', 1,
  '{"en":"Content & Fitment","nl":"Content & Fitment","de":"Inhalt & Passform","fr":"Contenu & Ajustement","tr":"İçerik & Uyum"}',
  'Content completeness, fitment coverage, image quality')
ON CONFLICT (tenant_id, score_key, version) DO NOTHING;

-- Customer Value Score v1
INSERT INTO ci_score_def (tenant_id, score_key, version, label, description)
VALUES (400, 'customer_value', 1,
  '{"en":"Customer Value","nl":"Klantwaarde","de":"Kundenwert","fr":"Valeur Client","tr":"Müşteri Değeri"}',
  'Revenue, frequency, margin, return rate per customer')
ON CONFLICT (tenant_id, score_key, version) DO NOTHING;

-- ═══════════════════════════════════════════════════════
--  Seed Product Performance components (spec §6)
-- ═══════════════════════════════════════════════════════

DO $$
DECLARE
  def_id bigint;
BEGIN
  SELECT id INTO def_id FROM ci_score_def
    WHERE tenant_id = 400 AND score_key = 'product_performance' AND version = 1;
  IF def_id IS NOT NULL THEN
    INSERT INTO ci_score_component (score_def_id, component_key, weight, direction, metric, shrinkage_key, sort_order)
    VALUES
      (def_id, 'cvr',          0.30, 'higher_better', 'cvr_view_to_order', 'cvr_view_to_order', 1),
      (def_id, 'margin',       0.25, 'higher_better', 'contribution_pct',  NULL,                 2),
      (def_id, 'traffic',      0.20, 'higher_better', 'page_views',        NULL,                 3),
      (def_id, 'return_rate',  0.15, 'lower_better',  'return_rate',       'return_rate',         4),
      (def_id, 'inventory_turn',0.10,'higher_better', 'inventory_turn',    NULL,                  5)
    ON CONFLICT (score_def_id, component_key) DO NOTHING;
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════
--  Seed Customer Value components
-- ═══════════════════════════════════════════════════════

DO $$
DECLARE
  def_id bigint;
BEGIN
  SELECT id INTO def_id FROM ci_score_def
    WHERE tenant_id = 400 AND score_key = 'customer_value' AND version = 1;
  IF def_id IS NOT NULL THEN
    INSERT INTO ci_score_component (score_def_id, component_key, weight, direction, metric, shrinkage_key, sort_order)
    VALUES
      (def_id, 'revenue',      0.35, 'higher_better', 'customer_revenue',   NULL, 1),
      (def_id, 'frequency',    0.25, 'higher_better', 'order_count',        NULL, 2),
      (def_id, 'margin',       0.25, 'higher_better', 'customer_margin_pct',NULL, 3),
      (def_id, 'return_rate',  0.15, 'lower_better',  'customer_return_rate','return_rate', 4)
    ON CONFLICT (score_def_id, component_key) DO NOTHING;
  END IF;
END $$;

-- ROLLBACK:
-- DROP TABLE IF EXISTS ci_score_result;
-- DROP TABLE IF EXISTS ci_score_component;
-- DROP TABLE IF EXISTS ci_score_def;
-- DROP TABLE IF EXISTS ci_benchmark;
-- DELETE FROM bop_objects WHERE object_id IN ('ci_benchmark','ci_score_def','ci_score_component','ci_score_result');
-- DELETE FROM bop_dependencies WHERE from_id IN ('ci_benchmark','ci_score_result','ci_score_component');

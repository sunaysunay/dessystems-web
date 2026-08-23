-- ============================================================
-- CI001 — Commerce Intelligence: Cost Model
-- Task: CI-T01
-- Spec: §2.1
-- ============================================================

-- ── 1. shop_product_cost ──
-- Landed cost, valid-from versioned. One row per (variant, valid_from).

CREATE TABLE IF NOT EXISTS shop_product_cost (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          integer NOT NULL,
  variant_id         uuid NOT NULL REFERENCES shop_variants(id),
  valid_from         date NOT NULL,
  currency           char(3) NOT NULL DEFAULT 'EUR',
  purchase_price_net numeric(12,4) NOT NULL,
  inbound_freight    numeric(12,4) NOT NULL DEFAULT 0,
  customs_duty       numeric(12,4) NOT NULL DEFAULT 0,
  fx_adjustment      numeric(12,4) NOT NULL DEFAULT 0,
  supplier_fee       numeric(12,4) NOT NULL DEFAULT 0,
  landed_unit_cost   numeric(12,4) GENERATED ALWAYS AS (
                       purchase_price_net + inbound_freight + customs_duty
                       + fx_adjustment + supplier_fee
                     ) STORED,
  source             text NOT NULL CHECK (source IN ('po','manual','import','estimate')),
  notes              text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, variant_id, valid_from)
);

CREATE INDEX IF NOT EXISTS idx_spc_tenant_variant
  ON shop_product_cost(tenant_id, variant_id, valid_from DESC);

-- ── 2. shop_cost_parameter ──
-- Channel/percentage cost parameters (Mollie fees, pick-pack rate, etc.)

CREATE TABLE IF NOT EXISTS shop_cost_parameter (
  tenant_id      integer NOT NULL,
  param_key      text NOT NULL,
  valid_from     date NOT NULL,
  numeric_value  numeric(12,5) NOT NULL,
  description    text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, param_key, valid_from)
);

-- ── 3. RLS policies ──

ALTER TABLE shop_product_cost ENABLE ROW LEVEL SECURITY;

CREATE POLICY shop_product_cost_tenant_isolation ON shop_product_cost
  USING (tenant_id = current_setting('app.tenant_id', true)::integer)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::integer);

ALTER TABLE shop_cost_parameter ENABLE ROW LEVEL SECURITY;

CREATE POLICY shop_cost_parameter_tenant_isolation ON shop_cost_parameter
  USING (tenant_id = current_setting('app.tenant_id', true)::integer)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::integer);

-- ── 4. Register in bop_objects ──

INSERT INTO bop_objects (object_id, type, module, name, status, description)
VALUES
  ('table:shop_product_cost', 'table', 'SHP', 'shop_product_cost', 'active',
   'Landed cost per variant, valid-from versioned. L4 protection — financial data.'),
  ('table:shop_cost_parameter', 'table', 'SHP', 'shop_cost_parameter', 'active',
   'Cost parameters (Mollie fees, pick-pack rates, return costs). L4 protection.')
ON CONFLICT (object_id) DO NOTHING;

-- ── 5. Seed cost parameters with defaults ──
-- DESShop tenant_id = 400
-- Values are industry-reasonable defaults — review and adjust with real data

INSERT INTO shop_cost_parameter (tenant_id, param_key, valid_from, numeric_value, description)
VALUES
  (400, 'mollie.ideal.fixed',       '2024-01-01', 0.29,    'iDEAL fixed fee per transaction (EUR)'),
  (400, 'mollie.card.pct',          '2024-01-01', 0.018,   'Credit card percentage fee (1.8%)'),
  (400, 'mollie.card.fixed',        '2024-01-01', 0.25,    'Credit card fixed fee per transaction (EUR)'),
  (400, 'mollie.paypal.pct',        '2024-01-01', 0.029,   'PayPal percentage fee (2.9%)'),
  (400, 'mollie.paypal.fixed',      '2024-01-01', 0.35,    'PayPal fixed fee per transaction (EUR)'),
  (400, 'pickpack.per_line',        '2024-01-01', 0.85,    'Pick-pack cost per order line (EUR)'),
  (400, 'pickpack.per_unit',        '2024-01-01', 0.15,    'Pick-pack cost per unit (EUR)'),
  (400, 'return.handling_cost',     '2024-01-01', 5.00,    'Return handling cost per return (EUR)'),
  (400, 'return.restock_loss_pct',  '2024-01-01', 0.05,    'Restock loss percentage (5%)')
ON CONFLICT (tenant_id, param_key, valid_from) DO NOTHING;


-- ── ROLLBACK ──
-- DROP POLICY IF EXISTS shop_cost_parameter_tenant_isolation ON shop_cost_parameter;
-- DROP POLICY IF EXISTS shop_product_cost_tenant_isolation ON shop_product_cost;
-- DELETE FROM bop_objects WHERE object_id IN ('table:shop_product_cost', 'table:shop_cost_parameter');
-- DELETE FROM shop_cost_parameter WHERE tenant_id = 400;
-- DROP TABLE IF EXISTS shop_cost_parameter;
-- DROP TABLE IF EXISTS shop_product_cost;

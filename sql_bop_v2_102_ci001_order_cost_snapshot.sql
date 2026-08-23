-- ============================================================
-- CI001 — Commerce Intelligence: Order Line Cost Snapshot
-- Task: CI-T02
-- Spec: §2.1, §13.1
-- ============================================================

-- Cost snapshot per order line — frozen at time of order/settlement.
-- All monetary values are integers (cents) to avoid float arithmetic.

CREATE TABLE IF NOT EXISTS ci_order_line_cost (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             integer NOT NULL,
  order_id              uuid NOT NULL,
  order_line_id         uuid NOT NULL,
  variant_id            uuid NOT NULL,
  order_date            date NOT NULL,
  settled               boolean NOT NULL DEFAULT false,
  settled_at            timestamptz,

  -- Revenue
  qty_ordered           integer NOT NULL,
  qty_returned          integer NOT NULL DEFAULT 0,
  qty_settled           integer GENERATED ALWAYS AS (qty_ordered - qty_returned) STORED,
  unit_net_cents        integer NOT NULL,
  line_net_cents        integer NOT NULL,
  discount_net_cents    integer NOT NULL DEFAULT 0,
  return_net_cents      integer NOT NULL DEFAULT 0,
  net_revenue_cents     integer GENERATED ALWAYS AS (line_net_cents - discount_net_cents - return_net_cents) STORED,

  -- Cost
  landed_unit_cost_cents integer NOT NULL DEFAULT 0,
  cost_source           text NOT NULL DEFAULT 'missing' CHECK (cost_source IN ('po','manual','import','estimate','missing')),
  cogs_cents            integer GENERATED ALWAYS AS (landed_unit_cost_cents * (qty_ordered - qty_returned)) STORED,

  -- Shipping allocation (order-level, spread to lines by revenue share)
  shipping_charged_cents integer NOT NULL DEFAULT 0,
  shipping_actual_cents  integer NOT NULL DEFAULT 0,
  shipping_delta_cents   integer GENERATED ALWAYS AS (shipping_charged_cents - shipping_actual_cents) STORED,

  -- Payment fee allocation (from actual provider_fee_cents or estimate)
  payment_fee_cents     integer NOT NULL DEFAULT 0,
  payment_fee_source    text NOT NULL DEFAULT 'estimate' CHECK (payment_fee_source IN ('actual','estimate')),

  -- Pick-pack
  pickpack_cents        integer NOT NULL DEFAULT 0,

  -- Return cost (handling + restock loss on returned units)
  return_cost_cents     integer NOT NULL DEFAULT 0,

  -- Final contribution (return_cost tracked separately, not in waterfall)
  contribution_cents    integer GENERATED ALWAYS AS (
    (line_net_cents - discount_net_cents - return_net_cents)
    - (landed_unit_cost_cents * (qty_ordered - qty_returned))
    + (shipping_charged_cents - shipping_actual_cents)
    - payment_fee_cents
    - pickpack_cents
  ) STORED,

  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, order_line_id)
);

CREATE INDEX IF NOT EXISTS idx_ci_olc_order ON ci_order_line_cost(tenant_id, order_id);
CREATE INDEX IF NOT EXISTS idx_ci_olc_variant ON ci_order_line_cost(tenant_id, variant_id, order_date);
CREATE INDEX IF NOT EXISTS idx_ci_olc_date ON ci_order_line_cost(tenant_id, order_date);

-- ── RLS ──
ALTER TABLE ci_order_line_cost ENABLE ROW LEVEL SECURITY;

CREATE POLICY ci_order_line_cost_tenant_isolation ON ci_order_line_cost
  USING (tenant_id = current_setting('app.tenant_id', true)::integer)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::integer);

-- ── bop_objects ──
INSERT INTO bop_objects (object_id, type, module, name, status, description)
VALUES
  ('table:ci_order_line_cost', 'table', 'SHP', 'ci_order_line_cost', 'active',
   'Cost snapshot per order line with contribution waterfall. L4 — financial data.')
ON CONFLICT (object_id) DO NOTHING;

-- ── ROLLBACK ──
-- DROP POLICY IF EXISTS ci_order_line_cost_tenant_isolation ON ci_order_line_cost;
-- DELETE FROM bop_objects WHERE object_id = 'table:ci_order_line_cost';
-- DROP TABLE IF EXISTS ci_order_line_cost;

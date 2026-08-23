-- ============================================================================
-- CI-T09: Daily fact tables (12 aggregates)
-- ============================================================================
-- Plane A facts derive from shop_* tables (source of truth).
-- Plane B facts derive from ci_sessions and ci_events.
-- All tables: RLS on tenant_id, registered in bop_objects.
-- Aggregation logic lives in lib/ci/aggregate.ts.
-- ============================================================================

-- ── 1. ci_daily_sales ── (Plane A)
CREATE TABLE IF NOT EXISTS ci_daily_sales (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id       integer NOT NULL,
  fact_date       date NOT NULL,
  partial         boolean NOT NULL DEFAULT false,

  orders          integer NOT NULL DEFAULT 0,
  net_sales_cents bigint  NOT NULL DEFAULT 0,
  gross_sales_cents bigint NOT NULL DEFAULT 0,
  tax_cents       bigint  NOT NULL DEFAULT 0,
  shipping_cents  bigint  NOT NULL DEFAULT 0,
  discount_cents  bigint  NOT NULL DEFAULT 0,
  refund_cents    bigint  NOT NULL DEFAULT 0,
  cogs_cents      bigint  NOT NULL DEFAULT 0,
  contribution_cents bigint NOT NULL DEFAULT 0,
  payment_fee_cents bigint NOT NULL DEFAULT 0,
  avg_order_value_cents bigint NOT NULL DEFAULT 0,
  items_sold      integer NOT NULL DEFAULT 0,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, fact_date)
);

ALTER TABLE ci_daily_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY ci_daily_sales_tenant_isolation ON ci_daily_sales
  USING (tenant_id = current_setting('app.tenant_id', true)::integer)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::integer);

-- ── 2. ci_daily_product ── (Plane A+B)
CREATE TABLE IF NOT EXISTS ci_daily_product (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id       integer NOT NULL,
  fact_date       date NOT NULL,
  variant_id      uuid NOT NULL,
  product_id      uuid,
  partial         boolean NOT NULL DEFAULT false,

  units_sold      integer NOT NULL DEFAULT 0,
  net_sales_cents bigint  NOT NULL DEFAULT 0,
  cogs_cents      bigint  NOT NULL DEFAULT 0,
  contribution_cents bigint NOT NULL DEFAULT 0,
  returns_qty     integer NOT NULL DEFAULT 0,
  return_value_cents bigint NOT NULL DEFAULT 0,

  page_views      integer NOT NULL DEFAULT 0,
  cart_adds       integer NOT NULL DEFAULT 0,
  orders          integer NOT NULL DEFAULT 0,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, fact_date, variant_id)
);

ALTER TABLE ci_daily_product ENABLE ROW LEVEL SECURITY;
CREATE POLICY ci_daily_product_tenant_isolation ON ci_daily_product
  USING (tenant_id = current_setting('app.tenant_id', true)::integer)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::integer);

-- ── 3. ci_daily_category ── (Plane A+B)
CREATE TABLE IF NOT EXISTS ci_daily_category (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id       integer NOT NULL,
  fact_date       date NOT NULL,
  category_id     uuid NOT NULL,
  partial         boolean NOT NULL DEFAULT false,

  units_sold      integer NOT NULL DEFAULT 0,
  net_sales_cents bigint  NOT NULL DEFAULT 0,
  cogs_cents      bigint  NOT NULL DEFAULT 0,
  contribution_cents bigint NOT NULL DEFAULT 0,
  page_views      integer NOT NULL DEFAULT 0,
  cart_adds       integer NOT NULL DEFAULT 0,
  orders          integer NOT NULL DEFAULT 0,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, fact_date, category_id)
);

ALTER TABLE ci_daily_category ENABLE ROW LEVEL SECURITY;
CREATE POLICY ci_daily_category_tenant_isolation ON ci_daily_category
  USING (tenant_id = current_setting('app.tenant_id', true)::integer)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::integer);

-- ── 4. ci_daily_traffic ── (Plane B)
CREATE TABLE IF NOT EXISTS ci_daily_traffic (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id       integer NOT NULL,
  fact_date       date NOT NULL,
  partial         boolean NOT NULL DEFAULT false,

  sessions        integer NOT NULL DEFAULT 0,
  unique_visitors integer NOT NULL DEFAULT 0,
  page_views      integer NOT NULL DEFAULT 0,
  bounces         integer NOT NULL DEFAULT 0,
  engaged         integer NOT NULL DEFAULT 0,
  avg_duration_s  integer NOT NULL DEFAULT 0,
  bot_sessions    integer NOT NULL DEFAULT 0,
  consent_sessions integer NOT NULL DEFAULT 0,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, fact_date)
);

ALTER TABLE ci_daily_traffic ENABLE ROW LEVEL SECURITY;
CREATE POLICY ci_daily_traffic_tenant_isolation ON ci_daily_traffic
  USING (tenant_id = current_setting('app.tenant_id', true)::integer)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::integer);

-- ── 5. ci_daily_funnel ── (Plane B)
CREATE TABLE IF NOT EXISTS ci_daily_funnel (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id       integer NOT NULL,
  fact_date       date NOT NULL,
  partial         boolean NOT NULL DEFAULT false,

  sessions_total  integer NOT NULL DEFAULT 0,
  sessions_product_view integer NOT NULL DEFAULT 0,
  sessions_cart_add integer NOT NULL DEFAULT 0,
  sessions_checkout integer NOT NULL DEFAULT 0,
  sessions_payment integer NOT NULL DEFAULT 0,
  sessions_order  integer NOT NULL DEFAULT 0,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, fact_date)
);

ALTER TABLE ci_daily_funnel ENABLE ROW LEVEL SECURITY;
CREATE POLICY ci_daily_funnel_tenant_isolation ON ci_daily_funnel
  USING (tenant_id = current_setting('app.tenant_id', true)::integer)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::integer);

-- ── 6. ci_daily_cart ── (Plane B)
CREATE TABLE IF NOT EXISTS ci_daily_cart (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id       integer NOT NULL,
  fact_date       date NOT NULL,
  partial         boolean NOT NULL DEFAULT false,

  cart_creates    integer NOT NULL DEFAULT 0,
  cart_adds       integer NOT NULL DEFAULT 0,
  cart_removes    integer NOT NULL DEFAULT 0,
  cart_views      integer NOT NULL DEFAULT 0,
  carts_abandoned integer NOT NULL DEFAULT 0,
  carts_converted integer NOT NULL DEFAULT 0,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, fact_date)
);

ALTER TABLE ci_daily_cart ENABLE ROW LEVEL SECURITY;
CREATE POLICY ci_daily_cart_tenant_isolation ON ci_daily_cart
  USING (tenant_id = current_setting('app.tenant_id', true)::integer)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::integer);

-- ── 7. ci_daily_checkout ── (Plane A+B)
CREATE TABLE IF NOT EXISTS ci_daily_checkout (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id       integer NOT NULL,
  fact_date       date NOT NULL,
  partial         boolean NOT NULL DEFAULT false,

  checkouts_started integer NOT NULL DEFAULT 0,
  checkouts_completed integer NOT NULL DEFAULT 0,
  payment_attempts integer NOT NULL DEFAULT 0,
  payment_failures integer NOT NULL DEFAULT 0,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, fact_date)
);

ALTER TABLE ci_daily_checkout ENABLE ROW LEVEL SECURITY;
CREATE POLICY ci_daily_checkout_tenant_isolation ON ci_daily_checkout
  USING (tenant_id = current_setting('app.tenant_id', true)::integer)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::integer);

-- ── 8. ci_daily_campaign ── (Plane A+B)
CREATE TABLE IF NOT EXISTS ci_daily_campaign (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id       integer NOT NULL,
  fact_date       date NOT NULL,
  utm_source      text NOT NULL,
  utm_medium      text,
  utm_campaign    text,
  partial         boolean NOT NULL DEFAULT false,

  sessions        integer NOT NULL DEFAULT 0,
  page_views      integer NOT NULL DEFAULT 0,
  orders          integer NOT NULL DEFAULT 0,
  net_sales_cents bigint  NOT NULL DEFAULT 0,
  contribution_cents bigint NOT NULL DEFAULT 0,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, fact_date, utm_source, utm_medium, utm_campaign)
);

ALTER TABLE ci_daily_campaign ENABLE ROW LEVEL SECURITY;
CREATE POLICY ci_daily_campaign_tenant_isolation ON ci_daily_campaign
  USING (tenant_id = current_setting('app.tenant_id', true)::integer)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::integer);

-- ── 9. ci_daily_customer ── (Plane A, sparse)
CREATE TABLE IF NOT EXISTS ci_daily_customer (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id       integer NOT NULL,
  fact_date       date NOT NULL,
  partial         boolean NOT NULL DEFAULT false,

  new_customers   integer NOT NULL DEFAULT 0,
  repeat_customers integer NOT NULL DEFAULT 0,
  total_customers integer NOT NULL DEFAULT 0,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, fact_date)
);

ALTER TABLE ci_daily_customer ENABLE ROW LEVEL SECURITY;
CREATE POLICY ci_daily_customer_tenant_isolation ON ci_daily_customer
  USING (tenant_id = current_setting('app.tenant_id', true)::integer)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::integer);

-- ── 10. ci_daily_search ── (Plane B)
CREATE TABLE IF NOT EXISTS ci_daily_search (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id       integer NOT NULL,
  fact_date       date NOT NULL,
  partial         boolean NOT NULL DEFAULT false,

  searches        integer NOT NULL DEFAULT 0,
  unique_searchers integer NOT NULL DEFAULT 0,
  zero_result_searches integer NOT NULL DEFAULT 0,
  search_exits    integer NOT NULL DEFAULT 0,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, fact_date)
);

ALTER TABLE ci_daily_search ENABLE ROW LEVEL SECURITY;
CREATE POLICY ci_daily_search_tenant_isolation ON ci_daily_search
  USING (tenant_id = current_setting('app.tenant_id', true)::integer)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::integer);

-- ── 11. ci_daily_inventory ── (Plane A, snapshot)
CREATE TABLE IF NOT EXISTS ci_daily_inventory (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id       integer NOT NULL,
  fact_date       date NOT NULL,
  partial         boolean NOT NULL DEFAULT false,

  total_variants  integer NOT NULL DEFAULT 0,
  in_stock        integer NOT NULL DEFAULT 0,
  out_of_stock    integer NOT NULL DEFAULT 0,
  low_stock       integer NOT NULL DEFAULT 0,
  total_on_hand   integer NOT NULL DEFAULT 0,
  total_reserved  integer NOT NULL DEFAULT 0,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, fact_date)
);

ALTER TABLE ci_daily_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY ci_daily_inventory_tenant_isolation ON ci_daily_inventory
  USING (tenant_id = current_setting('app.tenant_id', true)::integer)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::integer);

-- ── 12. ci_daily_fulfilment ── (Plane A)
CREATE TABLE IF NOT EXISTS ci_daily_fulfilment (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id       integer NOT NULL,
  fact_date       date NOT NULL,
  partial         boolean NOT NULL DEFAULT false,

  shipments       integer NOT NULL DEFAULT 0,
  returns_requested integer NOT NULL DEFAULT 0,
  returns_approved integer NOT NULL DEFAULT 0,
  returns_rejected integer NOT NULL DEFAULT 0,
  refunds_issued  integer NOT NULL DEFAULT 0,
  refund_cents    bigint  NOT NULL DEFAULT 0,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, fact_date)
);

ALTER TABLE ci_daily_fulfilment ENABLE ROW LEVEL SECURITY;
CREATE POLICY ci_daily_fulfilment_tenant_isolation ON ci_daily_fulfilment
  USING (tenant_id = current_setting('app.tenant_id', true)::integer)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::integer);

-- ── Indexes ──

CREATE INDEX IF NOT EXISTS idx_ci_daily_sales_date ON ci_daily_sales (tenant_id, fact_date);
CREATE INDEX IF NOT EXISTS idx_ci_daily_product_date ON ci_daily_product (tenant_id, fact_date);
CREATE INDEX IF NOT EXISTS idx_ci_daily_product_variant ON ci_daily_product (tenant_id, variant_id, fact_date);
CREATE INDEX IF NOT EXISTS idx_ci_daily_category_date ON ci_daily_category (tenant_id, fact_date);
CREATE INDEX IF NOT EXISTS idx_ci_daily_traffic_date ON ci_daily_traffic (tenant_id, fact_date);
CREATE INDEX IF NOT EXISTS idx_ci_daily_funnel_date ON ci_daily_funnel (tenant_id, fact_date);
CREATE INDEX IF NOT EXISTS idx_ci_daily_cart_date ON ci_daily_cart (tenant_id, fact_date);
CREATE INDEX IF NOT EXISTS idx_ci_daily_checkout_date ON ci_daily_checkout (tenant_id, fact_date);
CREATE INDEX IF NOT EXISTS idx_ci_daily_campaign_date ON ci_daily_campaign (tenant_id, fact_date);
CREATE INDEX IF NOT EXISTS idx_ci_daily_customer_date ON ci_daily_customer (tenant_id, fact_date);
CREATE INDEX IF NOT EXISTS idx_ci_daily_search_date ON ci_daily_search (tenant_id, fact_date);
CREATE INDEX IF NOT EXISTS idx_ci_daily_inventory_date ON ci_daily_inventory (tenant_id, fact_date);
CREATE INDEX IF NOT EXISTS idx_ci_daily_fulfilment_date ON ci_daily_fulfilment (tenant_id, fact_date);

-- ── bop_objects registration (L2 — financial aggregates) ──

INSERT INTO bop_objects (object_id, type, module, name, status, description)
VALUES
  ('table:ci_daily_sales', 'table', 'SHP', 'ci_daily_sales', 'active',
   'L2 — Daily sales aggregate'),
  ('table:ci_daily_product', 'table', 'SHP', 'ci_daily_product', 'active',
   'L2 — Daily product-level aggregate'),
  ('table:ci_daily_category', 'table', 'SHP', 'ci_daily_category', 'active',
   'L2 — Daily category-level aggregate'),
  ('table:ci_daily_traffic', 'table', 'SHP', 'ci_daily_traffic', 'active',
   'L2 — Daily traffic aggregate'),
  ('table:ci_daily_funnel', 'table', 'SHP', 'ci_daily_funnel', 'active',
   'L2 — Daily funnel aggregate'),
  ('table:ci_daily_cart', 'table', 'SHP', 'ci_daily_cart', 'active',
   'L2 — Daily cart aggregate'),
  ('table:ci_daily_checkout', 'table', 'SHP', 'ci_daily_checkout', 'active',
   'L2 — Daily checkout aggregate'),
  ('table:ci_daily_campaign', 'table', 'SHP', 'ci_daily_campaign', 'active',
   'L2 — Daily campaign aggregate'),
  ('table:ci_daily_customer', 'table', 'SHP', 'ci_daily_customer', 'active',
   'L2 — Daily customer aggregate'),
  ('table:ci_daily_search', 'table', 'SHP', 'ci_daily_search', 'active',
   'L2 — Daily search aggregate'),
  ('table:ci_daily_inventory', 'table', 'SHP', 'ci_daily_inventory', 'active',
   'L2 — Daily inventory snapshot'),
  ('table:ci_daily_fulfilment', 'table', 'SHP', 'ci_daily_fulfilment', 'active',
   'L2 — Daily fulfilment aggregate')
ON CONFLICT (object_id) DO UPDATE SET
  description = EXCLUDED.description,
  status = 'active';

-- ROLLBACK:
-- DELETE FROM bop_objects WHERE object_id IN (
--   'table:ci_daily_sales','table:ci_daily_product','table:ci_daily_category',
--   'table:ci_daily_traffic','table:ci_daily_funnel','table:ci_daily_cart',
--   'table:ci_daily_checkout','table:ci_daily_campaign','table:ci_daily_customer',
--   'table:ci_daily_search','table:ci_daily_inventory','table:ci_daily_fulfilment'
-- );
-- DROP TABLE IF EXISTS ci_daily_fulfilment, ci_daily_inventory, ci_daily_search,
--   ci_daily_customer, ci_daily_campaign, ci_daily_checkout, ci_daily_cart,
--   ci_daily_funnel, ci_daily_traffic, ci_daily_category, ci_daily_product,
--   ci_daily_sales;

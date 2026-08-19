-- SCM-V4 T3.1: Wire stock ledger to checkout
-- T3.2: Fulfilment table family
-- T3.3: Demand requirements schema
-- T3.7: Stock management config

-- Stock ledger for double-entry inventory tracking
CREATE TABLE IF NOT EXISTS shop_stock_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES shop_products(id),
  variant_id uuid,
  sku text,
  movement_type text NOT NULL CHECK (movement_type IN ('receipt','sale','adjustment','return','transfer','count')),
  qty integer NOT NULL,
  reference_type text,
  reference_id uuid,
  location text DEFAULT 'main',
  notes text,
  created_at timestamptz DEFAULT now(),
  created_by text
);

-- T3.2: Fulfilment tables
CREATE TABLE IF NOT EXISTS shop_fulfilment_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES shop_orders(id),
  status text DEFAULT 'pending' CHECK (status IN ('pending','picking','packed','shipped','delivered','cancelled')),
  assigned_to text,
  picked_at timestamptz,
  packed_at timestamptz,
  shipped_at timestamptz,
  tracking_code text,
  tracking_url text,
  carrier text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shop_fulfilment_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fulfilment_id uuid REFERENCES shop_fulfilment_orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES shop_products(id),
  variant_id uuid,
  sku text,
  qty_ordered integer NOT NULL,
  qty_picked integer DEFAULT 0,
  qty_packed integer DEFAULT 0,
  location text
);

-- T3.3: Demand requirements
CREATE TABLE IF NOT EXISTS shop_demand_forecast (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES shop_products(id),
  variant_id uuid,
  sku text,
  period_start date NOT NULL,
  period_end date NOT NULL,
  forecast_qty integer NOT NULL,
  actual_qty integer DEFAULT 0,
  method text DEFAULT 'moving_avg',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(product_id, variant_id, period_start)
);

-- T3.7: Stock config
CREATE TABLE IF NOT EXISTS shop_stock_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES shop_products(id),
  variant_id uuid,
  sku text,
  reorder_point integer DEFAULT 5,
  reorder_qty integer DEFAULT 20,
  safety_stock integer DEFAULT 2,
  lead_time_days integer DEFAULT 14,
  auto_reorder boolean DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(product_id, variant_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_stock_ledger_product ON shop_stock_ledger(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_type ON shop_stock_ledger(movement_type);
CREATE INDEX IF NOT EXISTS idx_fulfilment_order ON shop_fulfilment_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_demand_product ON shop_demand_forecast(product_id);

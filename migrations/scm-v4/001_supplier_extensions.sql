-- SCM-V4 T2.1: Extend supplier schema
-- T2.2: Supplier variants & price breaks
-- T2.3: Product identity extension

-- Ensure shop_suppliers has full SCM fields
ALTER TABLE shop_suppliers ADD COLUMN IF NOT EXISTS lead_time_days integer DEFAULT 14;
ALTER TABLE shop_suppliers ADD COLUMN IF NOT EXISTS min_order_value numeric(12,2);
ALTER TABLE shop_suppliers ADD COLUMN IF NOT EXISTS payment_terms text DEFAULT 'net30';
ALTER TABLE shop_suppliers ADD COLUMN IF NOT EXISTS currency text DEFAULT 'EUR';
ALTER TABLE shop_suppliers ADD COLUMN IF NOT EXISTS score numeric(5,2);
ALTER TABLE shop_suppliers ADD COLUMN IF NOT EXISTS score_updated_at timestamptz;
ALTER TABLE shop_suppliers ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE shop_suppliers ADD COLUMN IF NOT EXISTS contact_name text;
ALTER TABLE shop_suppliers ADD COLUMN IF NOT EXISTS contact_email text;
ALTER TABLE shop_suppliers ADD COLUMN IF NOT EXISTS contact_phone text;

-- T2.2: Supplier price breaks
CREATE TABLE IF NOT EXISTS shop_supplier_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid REFERENCES shop_suppliers(id) ON DELETE CASCADE,
  product_id uuid REFERENCES shop_products(id) ON DELETE CASCADE,
  variant_id uuid,
  sku text,
  cost_price numeric(12,2) NOT NULL,
  min_qty integer DEFAULT 1,
  max_qty integer,
  currency text DEFAULT 'EUR',
  valid_from date,
  valid_until date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(supplier_id, product_id, variant_id, min_qty)
);

-- T2.3: Product identity extension
ALTER TABLE shop_products ADD COLUMN IF NOT EXISTS ean text;
ALTER TABLE shop_products ADD COLUMN IF NOT EXISTS mpn text;
ALTER TABLE shop_products ADD COLUMN IF NOT EXISTS hs_code text;
ALTER TABLE shop_products ADD COLUMN IF NOT EXISTS country_of_origin text;
ALTER TABLE shop_products ADD COLUMN IF NOT EXISTS weight_kg numeric(8,3);
ALTER TABLE shop_products ADD COLUMN IF NOT EXISTS dimensions jsonb;

-- Index for price lookups
CREATE INDEX IF NOT EXISTS idx_supplier_prices_product ON shop_supplier_prices(product_id);
CREATE INDEX IF NOT EXISTS idx_supplier_prices_supplier ON shop_supplier_prices(supplier_id);

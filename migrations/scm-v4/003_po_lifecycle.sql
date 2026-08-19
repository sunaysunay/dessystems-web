-- SCM-V4 T4.1: Extend PO schema
-- T4.5: PO confirmation
-- T5.1: Goods receipt schema
-- T5.4: Supplier invoices & 3-way match

-- PO extensions
ALTER TABLE shop_purchase_orders ADD COLUMN IF NOT EXISTS supplier_ref text;
ALTER TABLE shop_purchase_orders ADD COLUMN IF NOT EXISTS payment_terms text;
ALTER TABLE shop_purchase_orders ADD COLUMN IF NOT EXISTS expected_delivery date;
ALTER TABLE shop_purchase_orders ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;
ALTER TABLE shop_purchase_orders ADD COLUMN IF NOT EXISTS confirmed_by text;
ALTER TABLE shop_purchase_orders ADD COLUMN IF NOT EXISTS pdf_url text;

-- Goods receipt
CREATE TABLE IF NOT EXISTS shop_goods_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id uuid,
  supplier_id uuid,
  receipt_number text,
  status text DEFAULT 'draft' CHECK (status IN ('draft','partial','complete','disputed')),
  received_at timestamptz DEFAULT now(),
  received_by text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shop_goods_receipt_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id uuid REFERENCES shop_goods_receipts(id) ON DELETE CASCADE,
  product_id uuid,
  variant_id uuid,
  sku text,
  qty_expected integer,
  qty_received integer NOT NULL,
  qty_damaged integer DEFAULT 0,
  unit_cost numeric(12,2),
  notes text
);

-- Supplier invoices for 3-way match (PO ↔ Receipt ↔ Invoice)
CREATE TABLE IF NOT EXISTS shop_supplier_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid,
  po_id uuid,
  receipt_id uuid REFERENCES shop_goods_receipts(id),
  invoice_number text NOT NULL,
  invoice_date date,
  due_date date,
  currency text DEFAULT 'EUR',
  net_amount numeric(12,2),
  tax_amount numeric(12,2),
  total_amount numeric(12,2),
  status text DEFAULT 'pending' CHECK (status IN ('pending','matched','disputed','paid','cancelled')),
  match_status text DEFAULT 'unmatched' CHECK (match_status IN ('unmatched','partial','full','exception')),
  pdf_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- T5.5: Landed cost tracking
CREATE TABLE IF NOT EXISTS shop_landed_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id uuid REFERENCES shop_goods_receipts(id),
  cost_type text NOT NULL CHECK (cost_type IN ('freight','customs','insurance','handling','other')),
  amount numeric(12,2) NOT NULL,
  currency text DEFAULT 'EUR',
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_goods_receipts_po ON shop_goods_receipts(po_id);
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_po ON shop_supplier_invoices(po_id);
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_receipt ON shop_supplier_invoices(receipt_id);
CREATE INDEX IF NOT EXISTS idx_landed_costs_receipt ON shop_landed_costs(receipt_id);

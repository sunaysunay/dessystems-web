-- T0.5: bop_conversion_rules + bop_copy_control + seed data

CREATE TABLE IF NOT EXISTS bop_conversion_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  src_object TEXT NOT NULL,
  src_status TEXT NOT NULL,
  tgt_object TEXT NOT NULL,
  relation TEXT NOT NULL DEFAULT 'converted' CHECK (relation IN (
    'converted', 'reversed', 'partial', 'replaced', 'spawned'
  )),
  allowed BOOLEAN NOT NULL DEFAULT true,
  requires_approval BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (src_object, src_status, tgt_object, relation)
);

CREATE TABLE IF NOT EXISTS bop_copy_control (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES bop_conversion_rules(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  copy_mode TEXT NOT NULL CHECK (copy_mode IN ('copy', 'derived', 'require_input', 'skip')),
  default_value TEXT,
  transform_fn TEXT,
  seq INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (rule_id, field_name)
);

ALTER TABLE bop_conversion_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE bop_copy_control ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_conversion_rules_updated_at ON bop_conversion_rules;
CREATE TRIGGER trg_conversion_rules_updated_at
  BEFORE UPDATE ON bop_conversion_rules
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Seed: vehicle trade flow rules
INSERT INTO bop_conversion_rules (src_object, src_status, tgt_object, relation, notes) VALUES
  ('quotation', 'accepted', 'sales_order', 'converted', 'Customer accepts quotation → sales order'),
  ('sales_order', 'confirmed', 'invoice', 'converted', 'Confirmed SO → invoice'),
  ('sales_order', 'confirmed', 'delivery_note', 'converted', 'Confirmed SO → delivery note'),
  ('invoice', 'paid', 'receipt', 'converted', 'Paid invoice → receipt'),
  ('purchase_order', 'confirmed', 'goods_receipt', 'converted', 'Confirmed PO → goods receipt'),
  ('quotation', 'rejected', 'quotation', 'replaced', 'Revise rejected quotation'),
  ('invoice', 'posted', 'credit_note', 'reversed', 'Reverse posted invoice'),
  ('sales_order', 'confirmed', 'purchase_order', 'spawned', 'SO spawns PO for sourcing')
ON CONFLICT (src_object, src_status, tgt_object, relation) DO NOTHING;

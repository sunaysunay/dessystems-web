-- T0.1: bop_cases table + case_number sequence

CREATE SEQUENCE IF NOT EXISTS bop_case_number_seq START 1;

CREATE TABLE IF NOT EXISTS bop_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number TEXT NOT NULL UNIQUE,
  business_line TEXT NOT NULL CHECK (business_line IN (
    'vehicle_sale', 'camper_conversion', 'rental', 'ecommerce', 'sourcing'
  )),
  partner_id UUID REFERENCES mdm_business_partners(id),
  title TEXT,
  notes TEXT,
  assigned_to UUID,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- case_number trigger: CASE-YYYY-NNNNN
CREATE OR REPLACE FUNCTION generate_case_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.case_number IS NULL OR NEW.case_number = '' THEN
    NEW.case_number := 'CASE-' || to_char(now(), 'YYYY') || '-' ||
      lpad(nextval('bop_case_number_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_case_number ON bop_cases;
CREATE TRIGGER trg_case_number
  BEFORE INSERT ON bop_cases
  FOR EACH ROW EXECUTE FUNCTION generate_case_number();

-- updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cases_updated_at ON bop_cases;
CREATE TRIGGER trg_cases_updated_at
  BEFORE UPDATE ON bop_cases
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE bop_cases ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_bop_cases_partner ON bop_cases(partner_id);
CREATE INDEX IF NOT EXISTS idx_bop_cases_business_line ON bop_cases(business_line);
CREATE INDEX IF NOT EXISTS idx_bop_cases_created_at ON bop_cases(created_at DESC);

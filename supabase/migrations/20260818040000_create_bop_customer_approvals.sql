-- T0.4: bop_customer_approvals (token-based gates)

CREATE TABLE IF NOT EXISTS bop_customer_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  object_type TEXT NOT NULL,
  object_id UUID NOT NULL,
  case_id UUID REFERENCES bop_cases(id),
  token TEXT NOT NULL UNIQUE,
  method TEXT NOT NULL CHECK (method IN ('link', 'in_person', 'email_reply')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'approved', 'rejected', 'expired', 'revoked'
  )),
  expires_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ,
  response_ip INET,
  response_ua TEXT,
  signature_data JSONB,
  notes TEXT,
  requested_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_approvals_updated_at ON bop_customer_approvals;
CREATE TRIGGER trg_approvals_updated_at
  BEFORE UPDATE ON bop_customer_approvals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE bop_customer_approvals ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_approvals_token ON bop_customer_approvals(token);
CREATE INDEX IF NOT EXISTS idx_approvals_object ON bop_customer_approvals(object_type, object_id);
CREATE INDEX IF NOT EXISTS idx_approvals_case ON bop_customer_approvals(case_id);

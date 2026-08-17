-- T0.2: bop_doc_flow table (document chain)

CREATE TABLE IF NOT EXISTS bop_doc_flow (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES bop_cases(id),
  src_object TEXT NOT NULL,
  src_id UUID NOT NULL,
  tgt_object TEXT NOT NULL,
  tgt_id UUID NOT NULL,
  relation TEXT NOT NULL CHECK (relation IN (
    'converted', 'reversed', 'partial', 'replaced', 'spawned'
  )),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE bop_doc_flow ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_doc_flow_case ON bop_doc_flow(case_id);
CREATE INDEX IF NOT EXISTS idx_doc_flow_src ON bop_doc_flow(src_object, src_id);
CREATE INDEX IF NOT EXISTS idx_doc_flow_tgt ON bop_doc_flow(tgt_object, tgt_id);

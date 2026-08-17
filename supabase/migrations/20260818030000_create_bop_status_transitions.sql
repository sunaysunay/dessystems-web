-- T0.3: bop_status_transitions audit trail

CREATE TABLE IF NOT EXISTS bop_status_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  object_type TEXT NOT NULL,
  object_id UUID NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('staff', 'customer', 'system')),
  actor_id UUID,
  approval_id UUID,
  reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE bop_status_transitions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_status_trans_object ON bop_status_transitions(object_type, object_id);
CREATE INDEX IF NOT EXISTS idx_status_trans_created ON bop_status_transitions(created_at DESC);

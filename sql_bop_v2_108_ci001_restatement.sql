-- ============================================================================
-- CI-T10: Restatement audit log for settled figure changes
-- ============================================================================

CREATE TABLE IF NOT EXISTS ci_restatement (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id       integer NOT NULL,
  fact_date       date NOT NULL,
  target_table    text NOT NULL,
  entity_id       text,
  field_name      text NOT NULL,
  old_value       bigint NOT NULL,
  new_value       bigint NOT NULL,
  delta           bigint GENERATED ALWAYS AS (new_value - old_value) STORED,
  reason          text NOT NULL,
  source_id       text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ci_restatement_date
  ON ci_restatement (tenant_id, fact_date);

CREATE INDEX IF NOT EXISTS idx_ci_restatement_table
  ON ci_restatement (tenant_id, target_table, fact_date);

ALTER TABLE ci_restatement ENABLE ROW LEVEL SECURITY;

CREATE POLICY ci_restatement_tenant_isolation ON ci_restatement
  USING (tenant_id = current_setting('app.tenant_id', true)::integer)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::integer);

INSERT INTO bop_objects (object_id, type, module, name, status, description)
VALUES
  ('table:ci_restatement', 'table', 'SHP', 'ci_restatement', 'active',
   'L2 — Audit log for settled figure changes (returns rebooking)')
ON CONFLICT (object_id) DO UPDATE SET
  description = EXCLUDED.description,
  status = 'active';

-- ROLLBACK:
-- DELETE FROM bop_objects WHERE object_id = 'table:ci_restatement';
-- DROP POLICY IF EXISTS ci_restatement_tenant_isolation ON ci_restatement;
-- DROP TABLE IF EXISTS ci_restatement;

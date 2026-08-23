-- ============================================================================
-- CI-T12: Data health checks
-- ============================================================================

CREATE TABLE IF NOT EXISTS ci_data_health (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id       integer NOT NULL,
  check_name      text NOT NULL,
  status          text NOT NULL DEFAULT 'green',
  threshold       text,
  actual_value    text,
  message         text,
  checked_at      timestamptz NOT NULL DEFAULT now(),
  alert_sent      boolean NOT NULL DEFAULT false,
  alert_sent_at   timestamptz,

  UNIQUE (tenant_id, check_name),
  CHECK (status IN ('green', 'amber', 'red'))
);

CREATE INDEX IF NOT EXISTS idx_ci_data_health_tenant
  ON ci_data_health (tenant_id);

CREATE INDEX IF NOT EXISTS idx_ci_data_health_status
  ON ci_data_health (tenant_id, status)
  WHERE status != 'green';

ALTER TABLE ci_data_health ENABLE ROW LEVEL SECURITY;

CREATE POLICY ci_data_health_tenant_isolation ON ci_data_health
  USING (tenant_id = current_setting('app.tenant_id', true)::integer)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::integer);

INSERT INTO bop_objects (object_id, type, module, name, status, description)
VALUES
  ('table:ci_data_health', 'table', 'SHP', 'ci_data_health', 'active',
   'L2 — Data quality health checks for CI module')
ON CONFLICT (object_id) DO UPDATE SET
  description = EXCLUDED.description,
  status = 'active';

-- ROLLBACK:
-- DELETE FROM bop_objects WHERE object_id = 'table:ci_data_health';
-- DROP POLICY IF EXISTS ci_data_health_tenant_isolation ON ci_data_health;
-- DROP TABLE IF EXISTS ci_data_health;

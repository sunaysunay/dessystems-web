-- DB001 Phase 0: Query history / audit log table

CREATE TABLE IF NOT EXISTS bop_db_query_log (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  executed_at   timestamptz NOT NULL DEFAULT now(),
  user_id       uuid NOT NULL,
  user_email    text,
  tenant_id     uuid,
  statement_class text NOT NULL CHECK (statement_class IN ('select','insert','update','delete','ddl','other')),
  sql_hash      text NOT NULL,
  sql_text      text NOT NULL,
  execution_ms  integer,
  rows_affected bigint,
  was_dry_run   boolean NOT NULL DEFAULT false,
  was_committed boolean NOT NULL DEFAULT false,
  error_message text,
  pg_role_used  text NOT NULL,
  client_ip     inet,
  user_agent    text
);

CREATE INDEX idx_query_log_user ON bop_db_query_log (user_id, executed_at DESC);
CREATE INDEX idx_query_log_time ON bop_db_query_log (executed_at DESC);
CREATE INDEX idx_query_log_hash ON bop_db_query_log (sql_hash);

COMMENT ON TABLE bop_db_query_log IS 'Audit trail for all SQL executed through the BOP Database Console';

ALTER TABLE bop_db_query_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_full_access" ON bop_db_query_log
  FOR ALL
  USING (
    (SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('super_admin','platform_admin')
  );

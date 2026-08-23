-- ============================================================
-- CI001 — Commerce Intelligence: Event Store + Job Run Log
-- Task: CI-T04
-- Spec: §5.1, §9
-- ============================================================

-- ── 1. ci_events — partitioned by month ──
-- Raw event store. Both Plane A (server-side) and Plane B (browser, consent-gated).
-- Retention: 14 months, then partition drop.

CREATE TABLE IF NOT EXISTS ci_events (
  id             uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id      integer NOT NULL,
  event_ts       timestamptz NOT NULL,
  event_date     date NOT NULL,
  event_type     text NOT NULL,
  plane          char(1) NOT NULL CHECK (plane IN ('A','B')),
  dedupe_key     text NOT NULL,

  -- Identity (pseudonymised for Plane B)
  anonymous_id   text,
  customer_id    uuid,
  session_id     uuid,

  -- Context
  variant_id     uuid,
  product_id     uuid,
  category_id    uuid,
  order_id       uuid,
  order_line_id  uuid,

  -- UTM / attribution
  utm_source     text,
  utm_medium     text,
  utm_campaign   text,
  utm_content    text,
  utm_term       text,
  referrer       text,

  -- Device
  device_type    text,
  user_agent     text,

  -- Flexible payload
  payload        jsonb NOT NULL DEFAULT '{}',

  created_at     timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (event_date, id)
) PARTITION BY RANGE (event_date);

-- Dedupe constraint (enforced per partition)
CREATE UNIQUE INDEX IF NOT EXISTS idx_ci_events_dedupe
  ON ci_events (tenant_id, dedupe_key, event_date);

CREATE INDEX IF NOT EXISTS idx_ci_events_type_date
  ON ci_events (tenant_id, event_type, event_date);

CREATE INDEX IF NOT EXISTS idx_ci_events_session
  ON ci_events (tenant_id, session_id, event_ts)
  WHERE session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ci_events_variant
  ON ci_events (tenant_id, variant_id, event_date)
  WHERE variant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ci_events_order
  ON ci_events (tenant_id, order_id, event_date)
  WHERE order_id IS NOT NULL;

-- RLS (L4)
ALTER TABLE ci_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY ci_events_tenant_isolation ON ci_events
  USING (tenant_id = current_setting('app.tenant_id', true)::integer)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::integer);

-- ── 2. Initial partitions: current month ± 3 months ──
-- Future partitions created by ci-partition.mjs weekly job.

DO $$
DECLARE
  m date;
  part_name text;
  start_date date;
  end_date date;
BEGIN
  FOR m IN
    SELECT generate_series(
      date_trunc('month', CURRENT_DATE - interval '3 months')::date,
      date_trunc('month', CURRENT_DATE + interval '3 months')::date,
      interval '1 month'
    )::date
  LOOP
    part_name := 'ci_events_' || to_char(m, 'YYYY_MM');
    start_date := m;
    end_date := (m + interval '1 month')::date;

    IF NOT EXISTS (
      SELECT 1 FROM pg_class WHERE relname = part_name
    ) THEN
      EXECUTE format(
        'CREATE TABLE %I PARTITION OF ci_events FOR VALUES FROM (%L) TO (%L)',
        part_name, start_date, end_date
      );
    END IF;
  END LOOP;
END $$;

-- ── 3. ci_job_run — execution log for all CI cron jobs ──

CREATE TABLE IF NOT EXISTS ci_job_run (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    integer NOT NULL,
  job_id       text NOT NULL,
  run_date     date NOT NULL,
  status       text NOT NULL CHECK (status IN ('running','success','failed','skipped')),
  started_at   timestamptz NOT NULL DEFAULT now(),
  finished_at  timestamptz,
  rows_in      integer,
  rows_out     integer,
  duration_ms  integer,
  error        text,
  metadata     jsonb,
  UNIQUE (tenant_id, job_id, run_date, started_at)
);

CREATE INDEX IF NOT EXISTS idx_ci_job_run_status
  ON ci_job_run (tenant_id, job_id, run_date DESC);

-- RLS (L2)
ALTER TABLE ci_job_run ENABLE ROW LEVEL SECURITY;

CREATE POLICY ci_job_run_tenant_isolation ON ci_job_run
  USING (tenant_id = current_setting('app.tenant_id', true)::integer)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::integer);

-- ── 4. bop_objects registration ──

INSERT INTO bop_objects (object_id, type, module, name, status, description)
VALUES
  ('table:ci_events', 'table', 'SHP', 'ci_events', 'active',
   'Raw event store, partitioned by month. L4 — behavioural + transactional events.'),
  ('table:ci_job_run', 'table', 'SHP', 'ci_job_run', 'active',
   'Job execution log for all CI cron jobs. L2.')
ON CONFLICT (object_id) DO NOTHING;

-- ── 5. Helper function: create partition for a given month ──

CREATE OR REPLACE FUNCTION ci_ensure_partition(target_month date)
RETURNS text
LANGUAGE plpgsql AS $$
DECLARE
  m date := date_trunc('month', target_month)::date;
  part_name text := 'ci_events_' || to_char(m, 'YYYY_MM');
  end_date date := (m + interval '1 month')::date;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = part_name) THEN
    EXECUTE format(
      'CREATE TABLE %I PARTITION OF ci_events FOR VALUES FROM (%L) TO (%L)',
      part_name, m, end_date
    );
  END IF;
  RETURN part_name;
END $$;

-- ── ROLLBACK ──
-- DROP FUNCTION IF EXISTS ci_ensure_partition(date);
-- DELETE FROM bop_objects WHERE object_id IN ('table:ci_events', 'table:ci_job_run');
-- DROP POLICY IF EXISTS ci_job_run_tenant_isolation ON ci_job_run;
-- DROP POLICY IF EXISTS ci_events_tenant_isolation ON ci_events;
-- DROP TABLE IF EXISTS ci_job_run;
-- DROP TABLE IF EXISTS ci_events;

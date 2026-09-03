-- BOP v2.126 — Database Health Monitoring
-- Creates bop_db_health_log table for storing periodic health snapshots,
-- a pg function to capture health data, and pg_cron jobs for automation.
-- Run via Supabase SQL Editor (requires superuser for cron.schedule).

-- 1. Health log table
CREATE TABLE IF NOT EXISTS public.bop_db_health_log (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  captured_at   timestamptz NOT NULL DEFAULT now(),
  run_type      text NOT NULL DEFAULT 'scheduled',   -- 'scheduled' | 'manual' | 'startup'
  total_tables  int NOT NULL DEFAULT 0,
  urgent_count  int NOT NULL DEFAULT 0,
  monitor_count int NOT NULL DEFAULT 0,
  in_range_count int NOT NULL DEFAULT 0,
  findings      jsonb NOT NULL DEFAULT '[]'::jsonb,   -- array of {table_name, status, dead_pct, xid_age, days_since_vacuum, issues[]}
  summary       text,                                  -- human-readable one-liner
  duration_ms   int
);

CREATE INDEX IF NOT EXISTS idx_bop_db_health_log_captured
  ON bop_db_health_log (captured_at DESC);

ALTER TABLE bop_db_health_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_health_log" ON bop_db_health_log
  FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE bop_db_health_log IS 'Periodic database health audit snapshots for trend tracking (DB009)';

-- 2. Health snapshot function
CREATE OR REPLACE FUNCTION public.bop_capture_health_snapshot(p_run_type text DEFAULT 'scheduled')
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_start    timestamptz := clock_timestamp();
  v_findings jsonb := '[]'::jsonb;
  v_urgent   int := 0;
  v_monitor  int := 0;
  v_in_range int := 0;
  v_total    int := 0;
  v_id       bigint;
  r          record;
BEGIN
  FOR r IN
    SELECT
      s.schemaname,
      s.relname AS table_name,
      s.n_live_tup AS live_tuples,
      s.n_dead_tup AS dead_tuples,
      CASE WHEN s.n_live_tup + s.n_dead_tup > 0
        THEN round((s.n_dead_tup::numeric / (s.n_live_tup + s.n_dead_tup)) * 100, 1)
        ELSE 0
      END AS dead_pct,
      age(c.relfrozenxid) AS xid_age,
      s.last_autovacuum,
      s.last_vacuum,
      pg_total_relation_size(c.oid) AS total_bytes
    FROM pg_stat_user_tables s
    JOIN pg_class c ON c.relname = s.relname
    JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = s.schemaname
    WHERE s.schemaname = 'public'
    ORDER BY s.relname
  LOOP
    v_total := v_total + 1;

    DECLARE
      v_dead_pct   numeric := r.dead_pct;
      v_xid        bigint  := r.xid_age;
      v_last_vac   timestamptz := COALESCE(r.last_autovacuum, r.last_vacuum);
      v_days_vac   int     := CASE WHEN v_last_vac IS NOT NULL
                                THEN EXTRACT(DAY FROM now() - v_last_vac)::int
                                ELSE NULL END;
      v_status     text    := 'in_range';
      v_issues     text[]  := '{}';
    BEGIN
      -- Dead tuple check
      IF v_dead_pct >= 15 THEN
        v_status := 'urgent';
        v_issues := array_append(v_issues, 'dead_tuples_high');
      ELSIF v_dead_pct >= 5 THEN
        IF v_status = 'in_range' THEN v_status := 'monitor'; END IF;
        v_issues := array_append(v_issues, 'dead_tuples_elevated');
      END IF;

      -- XID age check
      IF v_xid >= 500000000 THEN
        v_status := 'urgent';
        v_issues := array_append(v_issues, 'xid_wraparound_risk');
      ELSIF v_xid >= 100000000 THEN
        IF v_status != 'urgent' THEN v_status := 'monitor'; END IF;
        v_issues := array_append(v_issues, 'xid_age_elevated');
      END IF;

      -- Vacuum age check
      IF v_days_vac IS NULL THEN
        IF v_status != 'urgent' THEN v_status := 'monitor'; END IF;
        v_issues := array_append(v_issues, 'never_vacuumed');
      ELSIF v_days_vac >= 30 THEN
        v_status := 'urgent';
        v_issues := array_append(v_issues, 'vacuum_overdue');
      ELSIF v_days_vac >= 7 THEN
        IF v_status != 'urgent' THEN v_status := 'monitor'; END IF;
        v_issues := array_append(v_issues, 'vacuum_aging');
      END IF;

      -- Only log non-healthy tables in findings
      IF v_status != 'in_range' THEN
        v_findings := v_findings || jsonb_build_object(
          'table_name', r.table_name,
          'status', v_status,
          'dead_pct', v_dead_pct,
          'xid_age', v_xid,
          'days_since_vacuum', v_days_vac,
          'total_bytes', r.total_bytes,
          'issues', to_jsonb(v_issues)
        );
      END IF;

      CASE v_status
        WHEN 'urgent'   THEN v_urgent  := v_urgent + 1;
        WHEN 'monitor'  THEN v_monitor := v_monitor + 1;
        ELSE                 v_in_range := v_in_range + 1;
      END CASE;
    END;
  END LOOP;

  INSERT INTO bop_db_health_log (
    run_type, total_tables, urgent_count, monitor_count, in_range_count,
    findings, summary, duration_ms
  ) VALUES (
    p_run_type, v_total, v_urgent, v_monitor, v_in_range,
    v_findings,
    format('%s tables: %s urgent, %s monitor, %s healthy',
           v_total, v_urgent, v_monitor, v_in_range),
    EXTRACT(MILLISECOND FROM clock_timestamp() - v_start)::int
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

COMMENT ON FUNCTION bop_capture_health_snapshot IS 'Captures a point-in-time health snapshot of all public tables into bop_db_health_log';

-- 3. Grant access to console roles
GRANT SELECT ON bop_db_health_log TO bop_console_read;
GRANT SELECT, INSERT ON bop_db_health_log TO bop_console_write;
GRANT EXECUTE ON FUNCTION bop_capture_health_snapshot TO bop_console_write;

-- 4. pg_cron: daily health snapshot at 05:00 UTC
SELECT cron.schedule(
  'bop-daily-health-snapshot',
  '0 5 * * *',
  $$SELECT bop_capture_health_snapshot('scheduled')$$
);

-- 5. pg_cron: weekly vacuum of high-churn tables at 03:00 UTC on Sundays
SELECT cron.schedule(
  'bop-weekly-vacuum',
  '0 3 * * 0',
  $$
    VACUUM ANALYZE activity_log;
    VACUUM ANALYZE activity_log2;
    VACUUM ANALYZE bop_listings;
    VACUUM ANALYZE bop_user_profiles;
    VACUUM ANALYZE bop_user_tenants;
    VACUUM ANALYZE session_events;
    VACUUM ANALYZE sessions;
  $$
);

-- 6. Run an initial snapshot now
SELECT bop_capture_health_snapshot('startup');

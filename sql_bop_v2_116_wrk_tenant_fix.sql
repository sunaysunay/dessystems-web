-- ============================================================
-- WRK-P0 fix: tenant_id uuid → integer to match platform convention
-- Migration: sql_bop_v2_116_wrk_tenant_fix.sql
-- ============================================================

-- Drop existing RLS policies (they reference uuid cast)
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'wrk_technicians','wrk_orders','wrk_order_lines','wrk_inspections',
    'wrk_labour_rates','wrk_service_packages','wrk_apk_reminders',
    'wrk_approvals','wrk_efficiency_metrics','wrk_planning_slots'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_tenant', t);
  END LOOP;
END $$;

-- Drop uuid defaults first (can't auto-cast to integer)
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'wrk_technicians','wrk_orders','wrk_order_lines','wrk_inspections',
    'wrk_labour_rates','wrk_service_packages','wrk_apk_reminders',
    'wrk_approvals','wrk_efficiency_metrics','wrk_planning_slots'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ALTER COLUMN tenant_id DROP DEFAULT', t);
  END LOOP;
END $$;

-- Alter tenant_id from uuid to integer on all WRK tables
ALTER TABLE wrk_planning_slots ALTER COLUMN tenant_id TYPE integer USING 300;
ALTER TABLE wrk_efficiency_metrics ALTER COLUMN tenant_id TYPE integer USING 300;
ALTER TABLE wrk_approvals ALTER COLUMN tenant_id TYPE integer USING 300;
ALTER TABLE wrk_apk_reminders ALTER COLUMN tenant_id TYPE integer USING 300;
ALTER TABLE wrk_service_packages ALTER COLUMN tenant_id TYPE integer USING 300;
ALTER TABLE wrk_labour_rates ALTER COLUMN tenant_id TYPE integer USING 300;
ALTER TABLE wrk_inspections ALTER COLUMN tenant_id TYPE integer USING 300;
ALTER TABLE wrk_order_lines ALTER COLUMN tenant_id TYPE integer USING 300;
ALTER TABLE wrk_orders ALTER COLUMN tenant_id TYPE integer USING 300;
ALTER TABLE wrk_technicians ALTER COLUMN tenant_id TYPE integer USING 300;

-- Set proper defaults (matching platform pattern)
ALTER TABLE wrk_technicians ALTER COLUMN tenant_id SET DEFAULT 300;
ALTER TABLE wrk_orders ALTER COLUMN tenant_id SET DEFAULT 300;
ALTER TABLE wrk_order_lines ALTER COLUMN tenant_id SET DEFAULT 300;
ALTER TABLE wrk_inspections ALTER COLUMN tenant_id SET DEFAULT 300;
ALTER TABLE wrk_labour_rates ALTER COLUMN tenant_id SET DEFAULT 300;
ALTER TABLE wrk_service_packages ALTER COLUMN tenant_id SET DEFAULT 300;
ALTER TABLE wrk_apk_reminders ALTER COLUMN tenant_id SET DEFAULT 300;
ALTER TABLE wrk_approvals ALTER COLUMN tenant_id SET DEFAULT 300;
ALTER TABLE wrk_efficiency_metrics ALTER COLUMN tenant_id SET DEFAULT 300;
ALTER TABLE wrk_planning_slots ALTER COLUMN tenant_id SET DEFAULT 300;

-- Re-create RLS policies with integer comparison
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'wrk_technicians','wrk_orders','wrk_order_lines','wrk_inspections',
    'wrk_labour_rates','wrk_service_packages','wrk_apk_reminders',
    'wrk_approvals','wrk_efficiency_metrics','wrk_planning_slots'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    BEGIN
      EXECUTE format(
        'CREATE POLICY %I ON %I USING (tenant_id = current_setting(''app.tenant_id'', true)::integer)',
        t || '_tenant', t
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END LOOP;
END $$;

-- ============================================================
-- Done. All WRK tables now use integer tenant_id (default 300).
-- ============================================================

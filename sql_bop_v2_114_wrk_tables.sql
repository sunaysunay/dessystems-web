-- ============================================================
-- WRK-P0  Workshop Intelligence — Core Tables
-- Migration: sql_bop_v2_114_wrk_tables.sql
-- Tables: wrk_technicians, wrk_orders, wrk_order_lines,
--         wrk_inspections, wrk_labour_rates, wrk_service_packages,
--         wrk_apk_reminders, wrk_approvals, wrk_efficiency_metrics,
--         wrk_planning_slots
-- ============================================================


-- ── 1. ENUM: technician grade ──

DO $$ BEGIN
  CREATE TYPE wrk_tech_grade AS ENUM (
    'leerling', 'monteur', 'senior_monteur', 'meester', 'specialist'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── 2. wrk_technicians ──

CREATE TABLE IF NOT EXISTS wrk_technicians (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           uuid,
  tenant_id         integer NOT NULL DEFAULT 300,
  display_name      text NOT NULL,
  grade             wrk_tech_grade NOT NULL DEFAULT 'monteur',
  specializations   text[] DEFAULT '{}',
  bay_preference    text,
  hourly_capacity   numeric(4,1) DEFAULT 8.0 NOT NULL,
  active            boolean DEFAULT true NOT NULL,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wrk_technicians_tenant
  ON wrk_technicians (tenant_id) WHERE active = true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_wrk_technicians_user
  ON wrk_technicians (tenant_id, user_id) WHERE user_id IS NOT NULL;


-- ── 3. wrk_orders ──

CREATE TABLE IF NOT EXISTS wrk_orders (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id           integer NOT NULL DEFAULT 300,
  wo_number           text,

  -- References
  vehicle_id          uuid,
  customer_id         uuid,
  technician_id       uuid REFERENCES wrk_technicians(id),
  bay_id              text,

  -- Status machine
  status              text NOT NULL DEFAULT 'draft',
  type                text NOT NULL DEFAULT 'repair',

  -- Time
  estimated_hours     numeric(6,2),
  actual_hours        numeric(6,2),
  standard_hours      numeric(6,2),
  estimated_completion timestamptz,
  completed_at        timestamptz,

  -- Vehicle snapshot
  mileage_at_intake   integer,

  -- Warranty link
  warranty_claim_id   uuid,

  -- Notes
  notes               text,
  internal_notes      text,

  -- Soft-delete
  deleted_at          timestamptz,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

ALTER TABLE wrk_orders DROP CONSTRAINT IF EXISTS wrk_orders_status_check;
ALTER TABLE wrk_orders ADD CONSTRAINT wrk_orders_status_check
  CHECK (status IN ('draft','scheduled','in_progress','waiting_parts','waiting_approval','completed','invoiced','cancelled'));

ALTER TABLE wrk_orders DROP CONSTRAINT IF EXISTS wrk_orders_type_check;
ALTER TABLE wrk_orders ADD CONSTRAINT wrk_orders_type_check
  CHECK (type IN ('repair','maintenance','apk','warranty_repair','bodywork','diagnostic','other'));

CREATE INDEX IF NOT EXISTS idx_wrk_orders_tenant_status
  ON wrk_orders (tenant_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_wrk_orders_tenant_vehicle
  ON wrk_orders (tenant_id, vehicle_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_wrk_orders_tenant_customer
  ON wrk_orders (tenant_id, customer_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_wrk_orders_tenant_technician
  ON wrk_orders (tenant_id, technician_id)
  WHERE deleted_at IS NULL;

-- Auto-number trigger: WO-YYYYMM-00001
CREATE OR REPLACE FUNCTION wrk_order_number_trigger()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_prefix text;
  v_count  bigint;
BEGIN
  IF NEW.wo_number IS NULL THEN
    v_prefix := 'WO-' || to_char(now(), 'YYYYMM');
    SELECT count(*) INTO v_count FROM wrk_orders WHERE wo_number LIKE v_prefix || '%';
    NEW.wo_number := v_prefix || '-' || lpad((v_count + 1)::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_wrk_order_number ON wrk_orders;
CREATE TRIGGER trg_wrk_order_number
  BEFORE INSERT ON wrk_orders
  FOR EACH ROW EXECUTE FUNCTION wrk_order_number_trigger();

-- updated_at trigger
CREATE OR REPLACE FUNCTION wrk_orders_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_wrk_orders_updated_at ON wrk_orders;
CREATE TRIGGER trg_wrk_orders_updated_at
  BEFORE UPDATE ON wrk_orders
  FOR EACH ROW EXECUTE FUNCTION wrk_orders_updated_at();


-- ── 4. wrk_order_lines ──

CREATE TABLE IF NOT EXISTS wrk_order_lines (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id      uuid NOT NULL REFERENCES wrk_orders(id) ON DELETE CASCADE,
  tenant_id     integer NOT NULL DEFAULT 300,
  line_type     text NOT NULL DEFAULT 'labour',
  sort_order    integer DEFAULT 0,

  description   text NOT NULL,
  hours         numeric(6,2),
  rate          numeric(10,2),
  part_id       uuid,
  quantity      numeric(10,3) DEFAULT 1,
  unit_price    numeric(10,2),
  discount_pct  numeric(5,2) DEFAULT 0,
  total         numeric(12,2) GENERATED ALWAYS AS (
    CASE
      WHEN line_type = 'labour' THEN COALESCE(hours, 0) * COALESCE(rate, 0) * (1 - COALESCE(discount_pct, 0) / 100)
      ELSE COALESCE(quantity, 0) * COALESCE(unit_price, 0) * (1 - COALESCE(discount_pct, 0) / 100)
    END
  ) STORED,

  created_at    timestamptz DEFAULT now()
);

ALTER TABLE wrk_order_lines DROP CONSTRAINT IF EXISTS wrk_order_lines_type_check;
ALTER TABLE wrk_order_lines ADD CONSTRAINT wrk_order_lines_type_check
  CHECK (line_type IN ('labour','parts','sublet','sundry'));

CREATE INDEX IF NOT EXISTS idx_wrk_order_lines_order
  ON wrk_order_lines (order_id);


-- ── 5. wrk_inspections ──

CREATE TABLE IF NOT EXISTS wrk_inspections (
  id                    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id             integer NOT NULL DEFAULT 300,
  vehicle_id            uuid,
  work_order_id         uuid REFERENCES wrk_orders(id),
  inspector_id          uuid REFERENCES wrk_technicians(id),

  checklist             jsonb DEFAULT '[]'::jsonb,
  photos                text[] DEFAULT '{}',
  condition_grade       text,
  summary               text,

  customer_report_token uuid DEFAULT gen_random_uuid(),
  report_viewed_at      timestamptz,

  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

ALTER TABLE wrk_inspections DROP CONSTRAINT IF EXISTS wrk_inspections_grade_check;
ALTER TABLE wrk_inspections ADD CONSTRAINT wrk_inspections_grade_check
  CHECK (condition_grade IS NULL OR condition_grade IN ('good','fair','poor','critical'));

CREATE INDEX IF NOT EXISTS idx_wrk_inspections_tenant
  ON wrk_inspections (tenant_id);

CREATE INDEX IF NOT EXISTS idx_wrk_inspections_wo
  ON wrk_inspections (work_order_id);


-- ── 6. wrk_labour_rates ──

CREATE TABLE IF NOT EXISTS wrk_labour_rates (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       integer NOT NULL DEFAULT 300,
  grade           wrk_tech_grade NOT NULL,
  hourly_rate     numeric(10,2) NOT NULL,
  cost_rate       numeric(10,2),
  revenue_group   text DEFAULT 'workshop',
  effective_from  date NOT NULL DEFAULT CURRENT_DATE,
  effective_to    date,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wrk_labour_rates_tenant_grade
  ON wrk_labour_rates (tenant_id, grade, effective_from);


-- ── 7. wrk_service_packages ──

CREATE TABLE IF NOT EXISTS wrk_service_packages (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       integer NOT NULL DEFAULT 300,
  name            text NOT NULL,
  description     text,
  parts           jsonb DEFAULT '[]'::jsonb,
  labour_minutes  integer NOT NULL DEFAULT 0,
  fixed_price     numeric(10,2),
  category        text DEFAULT 'service',
  active          boolean DEFAULT true NOT NULL,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wrk_service_packages_tenant
  ON wrk_service_packages (tenant_id) WHERE active = true;


-- ── 8. wrk_apk_reminders ──

CREATE TABLE IF NOT EXISTS wrk_apk_reminders (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       integer NOT NULL DEFAULT 300,
  vehicle_id      uuid NOT NULL,
  customer_id     uuid,
  apk_expiry      date NOT NULL,
  reminder_sent_at timestamptz,
  campaign_id     uuid,
  channel         text DEFAULT 'email',
  status          text DEFAULT 'pending',
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE wrk_apk_reminders DROP CONSTRAINT IF EXISTS wrk_apk_reminders_status_check;
ALTER TABLE wrk_apk_reminders ADD CONSTRAINT wrk_apk_reminders_status_check
  CHECK (status IN ('pending','sent','booked','expired','cancelled'));

CREATE INDEX IF NOT EXISTS idx_wrk_apk_reminders_tenant_expiry
  ON wrk_apk_reminders (tenant_id, apk_expiry);


-- ── 9. wrk_approvals ──

CREATE TABLE IF NOT EXISTS wrk_approvals (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id         integer NOT NULL DEFAULT 300,
  work_order_id     uuid NOT NULL REFERENCES wrk_orders(id),
  token             uuid DEFAULT gen_random_uuid() NOT NULL,
  status            text DEFAULT 'pending' NOT NULL,
  items             jsonb DEFAULT '[]'::jsonb,
  total_amount      numeric(12,2),
  customer_response text,
  signature_data    text,
  responded_at      timestamptz,
  expires_at        timestamptz,
  ip_address        inet,
  user_agent        text,
  created_at        timestamptz DEFAULT now()
);

ALTER TABLE wrk_approvals DROP CONSTRAINT IF EXISTS wrk_approvals_status_check;
ALTER TABLE wrk_approvals ADD CONSTRAINT wrk_approvals_status_check
  CHECK (status IN ('pending','approved','partially_approved','rejected','expired'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_wrk_approvals_token
  ON wrk_approvals (token);

CREATE INDEX IF NOT EXISTS idx_wrk_approvals_wo
  ON wrk_approvals (work_order_id);


-- ── 10. wrk_efficiency_metrics ──

CREATE TABLE IF NOT EXISTS wrk_efficiency_metrics (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       integer NOT NULL DEFAULT 300,
  date            date NOT NULL,
  technician_id   uuid REFERENCES wrk_technicians(id),
  standard_hours  numeric(6,2) NOT NULL DEFAULT 0,
  present_hours   numeric(6,2) NOT NULL DEFAULT 0,
  efficiency_pct  numeric(5,1) GENERATED ALWAYS AS (
    CASE WHEN present_hours > 0 THEN (standard_hours / present_hours) * 100 ELSE 0 END
  ) STORED,
  revenue_group   text DEFAULT 'workshop',
  created_at      timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_wrk_efficiency_tenant_date_tech
  ON wrk_efficiency_metrics (tenant_id, date, technician_id);


-- ── 11. wrk_planning_slots ──

CREATE TABLE IF NOT EXISTS wrk_planning_slots (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       integer NOT NULL DEFAULT 300,
  technician_id   uuid NOT NULL REFERENCES wrk_technicians(id),
  bay_id          text,
  start_at        timestamptz NOT NULL,
  end_at          timestamptz NOT NULL,
  work_order_id   uuid REFERENCES wrk_orders(id),
  slot_type       text DEFAULT 'work_order',
  notes           text,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE wrk_planning_slots DROP CONSTRAINT IF EXISTS wrk_planning_slots_type_check;
ALTER TABLE wrk_planning_slots ADD CONSTRAINT wrk_planning_slots_type_check
  CHECK (slot_type IN ('work_order','break','meeting','training','absence'));

ALTER TABLE wrk_planning_slots DROP CONSTRAINT IF EXISTS wrk_planning_slots_time_check;
ALTER TABLE wrk_planning_slots ADD CONSTRAINT wrk_planning_slots_time_check
  CHECK (end_at > start_at);

CREATE INDEX IF NOT EXISTS idx_wrk_planning_slots_tenant_range
  ON wrk_planning_slots (tenant_id, start_at, end_at);

CREATE INDEX IF NOT EXISTS idx_wrk_planning_slots_technician
  ON wrk_planning_slots (technician_id, start_at);


-- ── 12. RLS on ALL tables ──

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


-- ── 13. updated_at triggers for tables that have the column ──

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'wrk_technicians','wrk_inspections','wrk_service_packages'
  ] LOOP
    EXECUTE format('
      CREATE OR REPLACE FUNCTION %I() RETURNS trigger LANGUAGE plpgsql AS $t$
      BEGIN NEW.updated_at := now(); RETURN NEW; END; $t$', t || '_updated_at');
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON %I', t, t);
    EXECUTE format('
      CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON %I
      FOR EACH ROW EXECUTE FUNCTION %I()', t, t, t || '_updated_at');
  END LOOP;
END $$;


-- ============================================================
-- Done. 10 WRK tables created with RLS + triggers.
-- ============================================================

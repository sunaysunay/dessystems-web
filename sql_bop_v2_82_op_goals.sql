-- ============================================================
-- STR-P1  Strategy Cockpit — Core Tables
-- Migration: sql_bop_v2_82_op_goals.sql
-- Tables: op_goals, op_goal_key_results,
--         op_goal_kr_snapshots, op_goal_checkins
-- ============================================================

-- ── 1. Entity ENUM helper ──────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'op_entity_scope') THEN
    CREATE TYPE op_entity_scope AS ENUM (
      'des_mobil','des_campers','des_shop','des_systems','des_group'
    );
  END IF;
END $$;

-- ── 2. CREATE op_goals ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS op_goals (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id         uuid NOT NULL DEFAULT current_setting('app.tenant_id', true)::uuid,
  goal_number       text,

  -- Hierarchy: Goal → Objective → KR is modelled by parent_goal_id
  parent_goal_id    uuid REFERENCES op_goals(id) ON DELETE SET NULL,
  level             integer DEFAULT 0 NOT NULL,

  -- Core
  title             text NOT NULL,
  description       text,
  vision_text       text,
  entity            text,

  -- Period
  period_type       text DEFAULT 'quarterly',
  period_start      date,
  period_end        date,

  -- Status & Health
  status            text DEFAULT 'active' NOT NULL,
  health            text DEFAULT 'on_track' NOT NULL,
  health_override   text,
  progress_pct      numeric(5,2) DEFAULT 0,

  -- Ownership
  owner_id          uuid,
  budget            numeric(12,2),

  -- Soft-delete
  deleted_at        timestamptz,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

-- 2b. Constraints
ALTER TABLE op_goals DROP CONSTRAINT IF EXISTS op_goals_status_check;
ALTER TABLE op_goals ADD CONSTRAINT op_goals_status_check
  CHECK (status IN ('active','achieved','semi_achieved','paused','closed'));

ALTER TABLE op_goals DROP CONSTRAINT IF EXISTS op_goals_health_check;
ALTER TABLE op_goals ADD CONSTRAINT op_goals_health_check
  CHECK (health IN ('on_track','at_risk','off_track'));

ALTER TABLE op_goals DROP CONSTRAINT IF EXISTS op_goals_level_check;
ALTER TABLE op_goals ADD CONSTRAINT op_goals_level_check
  CHECK (level >= 0 AND level <= 2);

ALTER TABLE op_goals DROP CONSTRAINT IF EXISTS op_goals_period_type_check;
ALTER TABLE op_goals ADD CONSTRAINT op_goals_period_type_check
  CHECK (period_type IN ('quarterly','semi_annual','annual','custom'));

-- 2c. Indexes
CREATE INDEX IF NOT EXISTS idx_op_goals_tenant_entity_status
  ON op_goals (tenant_id, entity, status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_op_goals_parent
  ON op_goals (parent_goal_id)
  WHERE deleted_at IS NULL;

-- 2d. Auto goal_number sequence
CREATE SEQUENCE IF NOT EXISTS op_goals_number_seq START 1;

CREATE OR REPLACE FUNCTION op_goals_set_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.goal_number IS NULL THEN
    NEW.goal_number := 'G-' || lpad(nextval('op_goals_number_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_op_goals_number ON op_goals;
CREATE TRIGGER trg_op_goals_number
  BEFORE INSERT ON op_goals
  FOR EACH ROW EXECUTE FUNCTION op_goals_set_number();

-- 2e. RLS
ALTER TABLE op_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS op_goals_tenant_isolation ON op_goals;
CREATE POLICY op_goals_tenant_isolation ON op_goals
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ── 3. CREATE op_goal_key_results ──────────────────────────

CREATE TABLE IF NOT EXISTS op_goal_key_results (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id         uuid NOT NULL DEFAULT current_setting('app.tenant_id', true)::uuid,
  goal_id           uuid NOT NULL REFERENCES op_goals(id) ON DELETE CASCADE,
  kr_number         text,

  -- Core
  title             text NOT NULL,
  description       text,

  -- Metric
  metric_type       text DEFAULT 'manual' NOT NULL,
  direction         text DEFAULT 'increase' NOT NULL,
  baseline          numeric(14,2) DEFAULT 0,
  target            numeric(14,2) NOT NULL,
  current_value     numeric(14,2) DEFAULT 0,
  unit_label        text DEFAULT '%',
  weight            numeric(5,2) DEFAULT 1,

  -- Auto-compute (STR-P2)
  metric_source     text,

  -- Computed
  progress_pct      numeric(5,2) DEFAULT 0,
  pace_delta        numeric(5,2) DEFAULT 0,

  -- Soft-delete
  deleted_at        timestamptz,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

-- 3b. Constraints
ALTER TABLE op_goal_key_results DROP CONSTRAINT IF EXISTS op_goal_kr_metric_type_check;
ALTER TABLE op_goal_key_results ADD CONSTRAINT op_goal_kr_metric_type_check
  CHECK (metric_type IN ('count','sum','avg','ratio','manual'));

ALTER TABLE op_goal_key_results DROP CONSTRAINT IF EXISTS op_goal_kr_direction_check;
ALTER TABLE op_goal_key_results ADD CONSTRAINT op_goal_kr_direction_check
  CHECK (direction IN ('increase','decrease'));

-- 3c. Indexes
CREATE INDEX IF NOT EXISTS idx_op_goal_kr_goal
  ON op_goal_key_results (goal_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_op_goal_kr_tenant
  ON op_goal_key_results (tenant_id)
  WHERE deleted_at IS NULL;

-- 3d. Auto kr_number sequence
CREATE SEQUENCE IF NOT EXISTS op_goal_kr_number_seq START 1;

CREATE OR REPLACE FUNCTION op_goal_kr_set_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.kr_number IS NULL THEN
    NEW.kr_number := 'KR-' || lpad(nextval('op_goal_kr_number_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_op_goal_kr_number ON op_goal_key_results;
CREATE TRIGGER trg_op_goal_kr_number
  BEFORE INSERT ON op_goal_key_results
  FOR EACH ROW EXECUTE FUNCTION op_goal_kr_set_number();

-- 3e. RLS
ALTER TABLE op_goal_key_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS op_goal_kr_tenant_isolation ON op_goal_key_results;
CREATE POLICY op_goal_kr_tenant_isolation ON op_goal_key_results
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ── 4. CREATE op_goal_kr_snapshots ─────────────────────────

CREATE TABLE IF NOT EXISTS op_goal_kr_snapshots (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  kr_id             uuid NOT NULL REFERENCES op_goal_key_results(id) ON DELETE CASCADE,
  snapshot_date     date NOT NULL DEFAULT CURRENT_DATE,
  value             numeric(14,2) NOT NULL,
  progress_pct      numeric(5,2) DEFAULT 0,
  pace_delta        numeric(5,2) DEFAULT 0,
  created_at        timestamptz DEFAULT now()
);

ALTER TABLE op_goal_kr_snapshots DROP CONSTRAINT IF EXISTS op_goal_kr_snapshots_unique;
ALTER TABLE op_goal_kr_snapshots ADD CONSTRAINT op_goal_kr_snapshots_unique
  UNIQUE (kr_id, snapshot_date);

CREATE INDEX IF NOT EXISTS idx_op_goal_kr_snapshots_kr_date
  ON op_goal_kr_snapshots (kr_id, snapshot_date DESC);

-- ── 5. CREATE op_goal_checkins ─────────────────────────────

CREATE TABLE IF NOT EXISTS op_goal_checkins (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id           uuid NOT NULL REFERENCES op_goals(id) ON DELETE CASCADE,
  author_id         uuid,
  confidence        integer DEFAULT 3 NOT NULL,
  note              text,
  blockers          text,
  created_at        timestamptz DEFAULT now()
);

ALTER TABLE op_goal_checkins DROP CONSTRAINT IF EXISTS op_goal_checkins_confidence_check;
ALTER TABLE op_goal_checkins ADD CONSTRAINT op_goal_checkins_confidence_check
  CHECK (confidence >= 1 AND confidence <= 5);

CREATE INDEX IF NOT EXISTS idx_op_goal_checkins_goal
  ON op_goal_checkins (goal_id, created_at DESC);

-- ── 6. updated_at trigger for op_goals + op_goal_key_results ──

CREATE OR REPLACE FUNCTION op_goals_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_op_goals_updated ON op_goals;
CREATE TRIGGER trg_op_goals_updated
  BEFORE UPDATE ON op_goals
  FOR EACH ROW EXECUTE FUNCTION op_goals_updated_at();

DROP TRIGGER IF EXISTS trg_op_goal_kr_updated ON op_goal_key_results;
CREATE TRIGGER trg_op_goal_kr_updated
  BEFORE UPDATE ON op_goal_key_results
  FOR EACH ROW EXECUTE FUNCTION op_goals_updated_at();

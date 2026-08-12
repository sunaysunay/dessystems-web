-- ============================================================
-- STR-P2  Strategy Cockpit — Metrics & Snapshots
-- Migration: sql_bop_v2_89_op_goals_metrics.sql
-- Adds: monthly period type, data_source on KRs,
--        op_goal_snapshots table for measurement history
-- ============================================================

-- ── 1. Extend period_type constraint to include 'monthly' ──

ALTER TABLE op_goals DROP CONSTRAINT IF EXISTS op_goals_period_type_check;
ALTER TABLE op_goals ADD CONSTRAINT op_goals_period_type_check
  CHECK (period_type IN ('monthly','quarterly','semi_annual','annual','custom'));

-- ── 2. Add data_source to key results ──────────────────────

ALTER TABLE op_goal_key_results
  ADD COLUMN IF NOT EXISTS data_source text;

-- ── 3. Append-only snapshots (measurement history) ─────────

CREATE TABLE IF NOT EXISTS op_goal_snapshots (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL DEFAULT current_setting('app.tenant_id')::uuid,
  goal_id       uuid NOT NULL REFERENCES op_goals(id) ON DELETE CASCADE,
  kr_id         uuid REFERENCES op_goal_key_results(id) ON DELETE SET NULL,
  current_value numeric NOT NULL DEFAULT 0,
  source        text NOT NULL DEFAULT 'manual'
                CHECK (source IN ('manual','auto')),
  note          text,
  measured_at   timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_op_goal_snapshots_goal
  ON op_goal_snapshots (goal_id, measured_at DESC);

CREATE INDEX IF NOT EXISTS idx_op_goal_snapshots_kr
  ON op_goal_snapshots (kr_id, measured_at DESC)
  WHERE kr_id IS NOT NULL;

-- RLS
ALTER TABLE op_goal_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS op_goal_snapshots_tenant ON op_goal_snapshots;
CREATE POLICY op_goal_snapshots_tenant ON op_goal_snapshots
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

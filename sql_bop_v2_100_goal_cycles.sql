-- ============================================================
-- Migration: sql_bop_v2_100_goal_cycles.sql
-- Phase 4: Goal Cycle closed-loop layer
-- Creates op_goal_cycles table for review cycle tracking
-- Adds next_review_at / last_review_at clock columns if missing
-- ============================================================

-- ── 1. Create op_goal_cycles table ──

CREATE TABLE IF NOT EXISTS op_goal_cycles (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         INTEGER NOT NULL,
  goal_id           UUID NOT NULL REFERENCES op_goals(id) ON DELETE CASCADE,
  cycle_number      INT NOT NULL,
  started_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at          TIMESTAMPTZ,
  status            TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  expected_progress NUMERIC(5,2),
  actual_progress   NUMERIC(5,2),
  gap_pct           NUMERIC(5,2),
  health_at_review  TEXT,
  bottleneck_kr_id  UUID REFERENCES op_goal_key_results(id) ON DELETE SET NULL,
  look_summary      TEXT,
  root_cause        TEXT,
  decision          TEXT CHECK (decision IS NULL OR decision IN (
    'continue','adjust_tasks','adjust_krs','rebaseline','close'
  )),
  decision_note     TEXT,
  learning          TEXT,
  created_by        UUID,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(goal_id, cycle_number)
);

CREATE INDEX IF NOT EXISTS idx_goal_cycles_tenant ON op_goal_cycles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_goal_cycles_goal   ON op_goal_cycles(goal_id, cycle_number);

-- ── 2. Clock columns on op_goals (idempotent) ──

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'op_goals' AND column_name = 'next_review_at'
  ) THEN
    ALTER TABLE op_goals ADD COLUMN next_review_at TIMESTAMPTZ;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'op_goals' AND column_name = 'last_review_at'
  ) THEN
    ALTER TABLE op_goals ADD COLUMN last_review_at TIMESTAMPTZ;
  END IF;
END $$;

-- ── 3. Set initial next_review_at for active goals that don't have one ──

UPDATE op_goals
SET next_review_at = CASE checkin_frequency
  WHEN 'daily'    THEN now() + INTERVAL '1 day'
  WHEN 'weekly'   THEN now() + INTERVAL '7 days'
  WHEN 'biweekly' THEN now() + INTERVAL '14 days'
  WHEN 'monthly'  THEN now() + INTERVAL '30 days'
  ELSE now() + INTERVAL '7 days'
END
WHERE status = 'active'
  AND next_review_at IS NULL
  AND deleted_at IS NULL;

-- ── 4. Register in bop_objects ──

INSERT INTO bop_objects (object_id, type, module, name, status, description)
VALUES (
  'table:op_goal_cycles', 'table', 'OPS', 'op_goal_cycles', 'active',
  'Goal review cycles — one row per closed-loop turn (look, diagnose, decide, act, learn)'
)
ON CONFLICT (object_id) DO NOTHING;

-- ── 5. RLS policy ──

ALTER TABLE op_goal_cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY op_goal_cycles_tenant_isolation ON op_goal_cycles
  USING (true)
  WITH CHECK (true);

-- Done.

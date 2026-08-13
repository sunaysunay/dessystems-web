-- BOP V2 Migration 94 — Period Ledger for Goal Close-out
-- Stores frozen snapshots of goals + KRs at period close,
-- enabling historical comparison across periods.

-- 1. Period ledger table
CREATE TABLE IF NOT EXISTS op_goal_period_ledger (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     INTEGER NOT NULL REFERENCES bop_tenants(tenant_id),
  goal_id       UUID NOT NULL REFERENCES op_goals(id),
  period_type   TEXT NOT NULL,
  period_start  DATE NOT NULL,
  period_end    DATE NOT NULL,
  entity        TEXT,
  closed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_by     UUID,
  final_status  TEXT NOT NULL,
  final_health  TEXT NOT NULL,
  final_progress_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  budget        NUMERIC(12,2),
  budget_actual NUMERIC(12,2),
  vision_text   TEXT,
  goal_title    TEXT NOT NULL,
  goal_number   TEXT,
  level         SMALLINT NOT NULL DEFAULT 0,
  kr_snapshot   JSONB NOT NULL DEFAULT '[]'::JSONB,
  checkin_count INTEGER NOT NULL DEFAULT 0,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_period_ledger_tenant ON op_goal_period_ledger(tenant_id, entity, period_end DESC);
CREATE INDEX idx_period_ledger_goal   ON op_goal_period_ledger(goal_id, period_end DESC);

ALTER TABLE op_goal_period_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON op_goal_period_ledger
  USING (tenant_id::TEXT = current_setting('app.tenant_id', true));

-- 2. Add closed_at + closed_by to op_goals for tracking
ALTER TABLE op_goals ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
ALTER TABLE op_goals ADD COLUMN IF NOT EXISTS closed_by UUID;

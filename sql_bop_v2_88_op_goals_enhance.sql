-- ============================================================
-- STR-P1  Strategy Cockpit — Enterprise Enhancements
-- Migration: sql_bop_v2_88_op_goals_enhance.sql
-- Adds: priority, goal_type, visibility, tags, contributors,
--        strategic_pillar, close-out fields, checkin_frequency
-- ============================================================

-- ── 1. Add enterprise columns to op_goals ─────────────────

ALTER TABLE op_goals ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium';
ALTER TABLE op_goals ADD COLUMN IF NOT EXISTS goal_type text DEFAULT 'committed';
ALTER TABLE op_goals ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'public';
ALTER TABLE op_goals ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
ALTER TABLE op_goals ADD COLUMN IF NOT EXISTS contributor_ids uuid[] DEFAULT '{}';
ALTER TABLE op_goals ADD COLUMN IF NOT EXISTS strategic_pillar text;
ALTER TABLE op_goals ADD COLUMN IF NOT EXISTS checkin_frequency text DEFAULT 'weekly';
ALTER TABLE op_goals ADD COLUMN IF NOT EXISTS closed_at timestamptz;
ALTER TABLE op_goals ADD COLUMN IF NOT EXISTS closed_by uuid;
ALTER TABLE op_goals ADD COLUMN IF NOT EXISTS closing_note text;

-- ── 2. Constraints ────────────────────────────────────────

ALTER TABLE op_goals DROP CONSTRAINT IF EXISTS op_goals_priority_check;
ALTER TABLE op_goals ADD CONSTRAINT op_goals_priority_check
  CHECK (priority IN ('critical','high','medium','low'));

ALTER TABLE op_goals DROP CONSTRAINT IF EXISTS op_goals_goal_type_check;
ALTER TABLE op_goals ADD CONSTRAINT op_goals_goal_type_check
  CHECK (goal_type IN ('committed','aspirational'));

ALTER TABLE op_goals DROP CONSTRAINT IF EXISTS op_goals_visibility_check;
ALTER TABLE op_goals ADD CONSTRAINT op_goals_visibility_check
  CHECK (visibility IN ('public','entity','private'));

ALTER TABLE op_goals DROP CONSTRAINT IF EXISTS op_goals_checkin_frequency_check;
ALTER TABLE op_goals ADD CONSTRAINT op_goals_checkin_frequency_check
  CHECK (checkin_frequency IN ('daily','weekly','biweekly','monthly'));

-- Fix period_type: add 'semi_annual' which was in the constraint
-- but missing from the form, and remove 'rolling' which the form
-- offered but the constraint never accepted.
ALTER TABLE op_goals DROP CONSTRAINT IF EXISTS op_goals_period_type_check;
ALTER TABLE op_goals ADD CONSTRAINT op_goals_period_type_check
  CHECK (period_type IN ('quarterly','semi_annual','annual','custom'));

-- ── 3. Indexes for new columns ────────────────────────────

CREATE INDEX IF NOT EXISTS idx_op_goals_priority
  ON op_goals (tenant_id, priority)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_op_goals_tags
  ON op_goals USING gin (tags)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_op_goals_strategic_pillar
  ON op_goals (tenant_id, strategic_pillar)
  WHERE deleted_at IS NULL AND strategic_pillar IS NOT NULL;

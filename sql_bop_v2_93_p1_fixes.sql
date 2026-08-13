-- ============================================================================
-- BOP V2 Migration v2_93 — Phase 1 Fixes
-- ============================================================================
-- 1. Add 'no_data' to health CHECK constraint
-- 2. Consolidate snapshots: migrate op_goal_snapshots → op_goal_kr_snapshots
-- 3. Add next_review_at / last_review_at clock columns (for Phase 4)
-- 4. Drop old op_goal_snapshots table after migration
-- ============================================================================

-- ── 1. Expand health CHECK to include 'no_data' ────────────────────────────

ALTER TABLE op_goals DROP CONSTRAINT IF EXISTS op_goals_health_check;
ALTER TABLE op_goals ADD CONSTRAINT op_goals_health_check
  CHECK (health IN ('on_track','at_risk','off_track','no_data'));

-- ── 2. Snapshot consolidation ───────────────────────────────────────────────
-- op_goal_kr_snapshots (created in v2_82) has the right shape:
--   (id, kr_id, snapshot_date, value, progress_pct) with UNIQUE(kr_id, snapshot_date)
-- op_goal_snapshots (created in v2_89) has:
--   (id, goal_id, kr_id, current_value, source, note, measured_at, created_at)
--
-- Migrate any rows from op_goal_snapshots that have a kr_id and don't conflict.

INSERT INTO op_goal_kr_snapshots (kr_id, snapshot_date, value, progress_pct)
SELECT
  s.kr_id,
  s.measured_at::date AS snapshot_date,
  s.current_value AS value,
  COALESCE(kr.progress_pct, 0) AS progress_pct
FROM op_goal_snapshots s
JOIN op_goal_key_results kr ON kr.id = s.kr_id
WHERE s.kr_id IS NOT NULL
ON CONFLICT (kr_id, snapshot_date) DO NOTHING;

-- ── 3. Review clock columns (prep for Phase 4 Goal Cycle) ──────────────────

ALTER TABLE op_goals ADD COLUMN IF NOT EXISTS next_review_at TIMESTAMPTZ;
ALTER TABLE op_goals ADD COLUMN IF NOT EXISTS last_review_at TIMESTAMPTZ;

-- Set initial next_review_at for active goals based on checkin_frequency
UPDATE op_goals
SET next_review_at = CASE checkin_frequency
  WHEN 'daily'    THEN now() + INTERVAL '1 day'
  WHEN 'weekly'   THEN now() + INTERVAL '7 days'
  WHEN 'biweekly' THEN now() + INTERVAL '14 days'
  WHEN 'monthly'  THEN now() + INTERVAL '30 days'
  ELSE now() + INTERVAL '7 days'
END
WHERE status = 'active'
  AND next_review_at IS NULL;

-- ── 4. Drop old snapshot table ──────────────────────────────────────────────
-- NOTE: Run this AFTER confirming the migration above succeeded.
-- Uncomment when ready:

-- DROP TABLE IF EXISTS op_goal_snapshots;

-- ============================================================
-- BOP V2 Migration 90 — op_tasks.goal_kr_id FK bridge
-- STR-P2 T4.4: Link tasks to key results bidirectionally
-- ============================================================

BEGIN;

-- Add goal_kr_id column to op_tasks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'op_tasks' AND column_name = 'goal_kr_id'
  ) THEN
    ALTER TABLE op_tasks
      ADD COLUMN goal_kr_id UUID REFERENCES op_goal_key_results(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Index for looking up tasks linked to a KR
CREATE INDEX IF NOT EXISTS idx_op_tasks_goal_kr_id
  ON op_tasks (goal_kr_id)
  WHERE goal_kr_id IS NOT NULL;

COMMIT;

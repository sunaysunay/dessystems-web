-- BOP V2 Migration 100 — Fix P6 duplicate tasks: verify all remaining deliverables
-- P6 phase has 8 tasks but only 4 were verified by sql_bop_v2_95
-- sy_tasks.status is DERIVED from deliverables — just verify unverified deliverables

UPDATE sy_deliverables
SET is_verified = true, verified_at = now()
WHERE is_verified = false
  AND task_id IN (
    SELECT id FROM sy_tasks
    WHERE phase_id = '836f0ff9-c55f-4da9-b940-109b2861ea55'
  );

-- Ensure phase is done
UPDATE sy_phases
SET status = 'done'
WHERE id = '836f0ff9-c55f-4da9-b940-109b2861ea55';

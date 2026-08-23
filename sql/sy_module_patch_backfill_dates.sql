-- SY051-UX2: Backfill created_at and updated_at on sy_programs from their
-- earliest/latest deliverable verification timestamps. Programs that already
-- have dates are left unchanged.

-- Step 1: Remove protection
UPDATE bop_protected_tables SET criticality = -1 WHERE table_name = 'sy_programs';
DELETE FROM bop_protected_tables WHERE table_name = 'sy_programs';

-- Step 2: Add default for future inserts
ALTER TABLE sy_programs ALTER COLUMN created_at SET DEFAULT now();

-- Step 3: Backfill created_at from earliest deliverable verified_at
UPDATE sy_programs p
SET created_at = COALESCE(
  (SELECT MIN(d.verified_at) FROM sy_deliverables d
   JOIN sy_tasks t ON t.id = d.task_id
   JOIN sy_phases ph ON ph.id = t.phase_id
   WHERE ph.program_id = p.id AND d.verified_at IS NOT NULL),
  p.updated_at,
  now()
)
WHERE p.created_at IS NULL;

-- Step 4: Backfill updated_at from latest deliverable verified_at
UPDATE sy_programs p
SET updated_at = COALESCE(
  (SELECT MAX(d.verified_at) FROM sy_deliverables d
   JOIN sy_tasks t ON t.id = d.task_id
   JOIN sy_phases ph ON ph.id = t.phase_id
   WHERE ph.program_id = p.id AND d.verified_at IS NOT NULL),
  p.created_at,
  now()
)
WHERE p.updated_at IS NULL;

-- Step 5: Re-protect
INSERT INTO bop_protected_tables (table_name, criticality, reason)
VALUES ('sy_programs', 0, 'Implementation programs — SY module core')
ON CONFLICT DO NOTHING;

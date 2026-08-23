-- SY051-UX2: completed date for implementation programs.
-- sy_programs is DDL-guarded (bop_guard_ddl) — unprotect, alter, re-protect,
-- same pattern as sy_module_patch_status_note.sql.

-- Step 1: Remove protection on sy_programs (stage with criticality -1, then delete)
UPDATE bop_protected_tables SET criticality = -1 WHERE table_name = 'sy_programs';
DELETE FROM bop_protected_tables WHERE table_name = 'sy_programs';

-- Step 2: Add column
ALTER TABLE sy_programs ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- Step 3: Re-protect
INSERT INTO bop_protected_tables (table_name, criticality, reason)
VALUES ('sy_programs', 0, 'Implementation programs — SY module core')
ON CONFLICT DO NOTHING;

-- Step 4: Backfill — existing done programs get completed_at = updated_at
UPDATE sy_programs SET completed_at = updated_at WHERE status = 'done' AND completed_at IS NULL;

-- ROLLBACK:
-- UPDATE bop_protected_tables SET criticality = -1 WHERE table_name = 'sy_programs';
-- DELETE FROM bop_protected_tables WHERE table_name = 'sy_programs';
-- ALTER TABLE sy_programs DROP COLUMN IF EXISTS completed_at;
-- INSERT INTO bop_protected_tables (table_name, criticality, reason)
--   VALUES ('sy_programs', 0, 'Implementation programs — SY module core') ON CONFLICT DO NOTHING;

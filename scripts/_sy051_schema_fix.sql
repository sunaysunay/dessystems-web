-- SY051 schema constraint fixes
-- Aligns DB CHECK constraints with the UI constants in page.tsx
-- Run with: bash /root/scripts/des-sql.sh --commit < scripts/_sy051_schema_fix.sql
--
-- Uses bop_protected_tables unprotect/re-protect pattern
-- (same as sy_module_patch_completed_at.sql)

BEGIN;

-- ========== sy_programs: add 'test' to status CHECK ==========

-- Step 1: Unprotect sy_programs
UPDATE bop_protected_tables SET criticality = -1 WHERE table_name = 'sy_programs';
DELETE FROM bop_protected_tables WHERE table_name = 'sy_programs';

-- Step 2: Replace CHECK constraint
ALTER TABLE sy_programs DROP CONSTRAINT IF EXISTS sy_programs_status_check;
ALTER TABLE sy_programs ADD CONSTRAINT sy_programs_status_check
  CHECK (status IN ('draft','active','test','paused','done','cancelled'));

-- Step 3: Re-protect sy_programs
INSERT INTO bop_protected_tables (table_name, criticality, reason)
VALUES ('sy_programs', 0, 'Implementation programs — SY module core')
ON CONFLICT DO NOTHING;

-- ========== sy_deliverables: add 'SOURCE_FILE' to kind CHECK ==========

-- Step 1: Unprotect sy_deliverables
UPDATE bop_protected_tables SET criticality = -1 WHERE table_name = 'sy_deliverables';
DELETE FROM bop_protected_tables WHERE table_name = 'sy_deliverables';

-- Step 2: Replace CHECK constraint
ALTER TABLE sy_deliverables DROP CONSTRAINT IF EXISTS sy_deliverables_kind_check;
ALTER TABLE sy_deliverables ADD CONSTRAINT sy_deliverables_kind_check
  CHECK (kind IN (
    'SCREEN','MENU_NODE','DB_TABLE','RLS_POLICY',
    'API_ROUTE','PERMISSION','I18N_KEY','HELP_DOC',
    'SOURCE_FILE','EMAIL_TEMPLATE','TELEGRAM_ALERT','TEST',
    'MIGRATION','SMOKE_CHECK','CUSTOM'
  ));

-- Step 3: Re-protect sy_deliverables
INSERT INTO bop_protected_tables (table_name, criticality, reason)
VALUES ('sy_deliverables', 0, 'Implementation deliverables — SY module core')
ON CONFLICT DO NOTHING;

COMMIT;

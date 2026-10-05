-- SY051 schema constraint fixes
-- Aligns DB CHECK constraints with the UI constants in page.tsx
-- Run with: bash /root/scripts/des-sql.sh --commit < scripts/_sy051_schema_fix.sql

BEGIN;

-- 1. Add 'test' to sy_programs.status CHECK constraint
--    UI has: ['draft', 'active', 'test', 'paused', 'done', 'cancelled']
--    DB has: ('draft','active','paused','done','cancelled')
ALTER TABLE sy_programs DROP CONSTRAINT IF EXISTS sy_programs_status_check;
ALTER TABLE sy_programs ADD CONSTRAINT sy_programs_status_check
  CHECK (status IN ('draft','active','test','paused','done','cancelled'));

-- 2. Add 'SOURCE_FILE' to sy_deliverables.kind CHECK constraint
--    UI has: [..., 'SOURCE_FILE', ...]
--    DB has: 14 kinds without SOURCE_FILE
ALTER TABLE sy_deliverables DROP CONSTRAINT IF EXISTS sy_deliverables_kind_check;
ALTER TABLE sy_deliverables ADD CONSTRAINT sy_deliverables_kind_check
  CHECK (kind IN (
    'SCREEN','MENU_NODE','DB_TABLE','RLS_POLICY',
    'API_ROUTE','PERMISSION','I18N_KEY','HELP_DOC',
    'SOURCE_FILE','EMAIL_TEMPLATE','TELEGRAM_ALERT','TEST',
    'MIGRATION','SMOKE_CHECK','CUSTOM'
  ));

COMMIT;

-- ============================================================
-- DBA — Grant extensions schema access to console roles
-- Required for: supabase inspect db (cache-hit, outliers, etc.)
-- These commands query pg_stat_statements in the extensions schema
-- ============================================================

-- Schema access
GRANT USAGE ON SCHEMA extensions TO bop_console_read, bop_console_write, bop_console_ddl;

-- pg_stat_statements view (used by outliers, calls, cache-hit)
GRANT SELECT ON ALL TABLES IN SCHEMA extensions TO bop_console_read;
ALTER DEFAULT PRIVILEGES IN SCHEMA extensions GRANT SELECT ON TABLES TO bop_console_read;

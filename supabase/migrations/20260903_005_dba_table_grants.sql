-- ============================================================
-- DBA-P2  Database Console — Table Access Grants
-- Grants bop_console_read/write/ddl access to public schema
-- ============================================================

-- ── 1. Schema usage ──
GRANT USAGE ON SCHEMA public TO bop_console_read, bop_console_write, bop_console_ddl;

-- ── 2. bop_console_read — SELECT on all current + future tables/views/sequences ──
GRANT SELECT ON ALL TABLES IN SCHEMA public TO bop_console_read;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO bop_console_read;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO bop_console_read;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON SEQUENCES TO bop_console_read;

-- ── 3. bop_console_write — SELECT + INSERT/UPDATE/DELETE on all tables ──
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO bop_console_write;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO bop_console_write;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO bop_console_write;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO bop_console_write;

-- ── 4. bop_console_ddl — full table access + CREATE ──
GRANT ALL ON ALL TABLES IN SCHEMA public TO bop_console_ddl;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO bop_console_ddl;
GRANT CREATE ON SCHEMA public TO bop_console_ddl;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO bop_console_ddl;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO bop_console_ddl;

-- ── 5. Allow read role to bypass RLS (needed for DBA data browsing) ──
-- Note: Only superuser can ALTER ROLE ... BYPASSRLS. If this fails, the
-- data route will show rows for tables without RLS, and empty for RLS tables.
-- In that case, the bop_meta functions (SECURITY DEFINER) still work fine.
DO $$
BEGIN
  EXECUTE 'ALTER ROLE bop_console_read BYPASSRLS';
  EXECUTE 'ALTER ROLE bop_console_write BYPASSRLS';
  EXECUTE 'ALTER ROLE bop_console_ddl BYPASSRLS';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'Cannot grant BYPASSRLS — RLS-protected tables will show empty in data browser';
END $$;

-- DB001 Phase 0: Console database roles
-- Three login roles with escalating privileges, GUC defaults as security boundary
-- Passwords are auto-generated and printed via RAISE NOTICE — copy them to env vars.

DO $$
DECLARE
  pw_read  text := replace(gen_random_uuid()::text, '-', '');
  pw_write text := replace(gen_random_uuid()::text, '-', '');
  pw_ddl   text := replace(gen_random_uuid()::text, '-', '');
BEGIN
  -- Read-only role
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'bop_console_read') THEN
    EXECUTE format('CREATE ROLE bop_console_read LOGIN PASSWORD %L', pw_read);
    RAISE NOTICE '── DBA_PG_READ_PASSWORD=%', pw_read;
  ELSE
    RAISE NOTICE 'bop_console_read already exists — password unchanged';
  END IF;

  -- Write role
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'bop_console_write') THEN
    EXECUTE format('CREATE ROLE bop_console_write LOGIN PASSWORD %L', pw_write);
    RAISE NOTICE '── DBA_PG_WRITE_PASSWORD=%', pw_write;
  ELSE
    RAISE NOTICE 'bop_console_write already exists — password unchanged';
  END IF;

  -- DDL role
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'bop_console_ddl') THEN
    EXECUTE format('CREATE ROLE bop_console_ddl LOGIN PASSWORD %L', pw_ddl);
    RAISE NOTICE '── DBA_PG_DDL_PASSWORD=%', pw_ddl;
  ELSE
    RAISE NOTICE 'bop_console_ddl already exists — password unchanged';
  END IF;
END $$;

-- Read role: locked to read-only at the role level
ALTER ROLE bop_console_read SET statement_timeout = '30s';
ALTER ROLE bop_console_read SET lock_timeout = '5s';
ALTER ROLE bop_console_read SET idle_in_transaction_session_timeout = '60s';
ALTER ROLE bop_console_read SET default_transaction_read_only = on;

GRANT USAGE ON SCHEMA public TO bop_console_read;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO bop_console_read;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO bop_console_read;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO bop_console_read;

-- Write role: DML but no DDL or TRUNCATE
ALTER ROLE bop_console_write SET statement_timeout = '60s';
ALTER ROLE bop_console_write SET lock_timeout = '10s';
ALTER ROLE bop_console_write SET idle_in_transaction_session_timeout = '120s';

GRANT USAGE ON SCHEMA public TO bop_console_write;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO bop_console_write;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO bop_console_write;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO bop_console_write;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO bop_console_write;

-- DDL role: full privileges
ALTER ROLE bop_console_ddl SET statement_timeout = '120s';
ALTER ROLE bop_console_ddl SET lock_timeout = '30s';
ALTER ROLE bop_console_ddl SET idle_in_transaction_session_timeout = '300s';

GRANT ALL PRIVILEGES ON SCHEMA public TO bop_console_ddl;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO bop_console_ddl;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO bop_console_ddl;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO bop_console_ddl;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO bop_console_ddl;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO bop_console_ddl;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO bop_console_ddl;

-- Grant bop_meta schema access to all console roles (created in next migration)

-- DB001 Phase 0: bop_meta introspection schema
-- SECURITY DEFINER functions over pg_catalog for safe schema browsing via PostgREST

CREATE SCHEMA IF NOT EXISTS bop_meta;

-- List all schemas with table/function counts
CREATE OR REPLACE FUNCTION bop_meta.list_schemas()
RETURNS TABLE(
  schema_name text,
  table_count bigint,
  view_count bigint,
  function_count bigint,
  is_system boolean
) LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT
    n.nspname::text AS schema_name,
    count(DISTINCT c.oid) FILTER (WHERE c.relkind = 'r') AS table_count,
    count(DISTINCT c.oid) FILTER (WHERE c.relkind = 'v') AS view_count,
    count(DISTINCT p.oid) AS function_count,
    n.nspname IN ('pg_catalog','information_schema','pg_toast','pg_temp_1','pg_toast_temp_1') AS is_system
  FROM pg_namespace n
  LEFT JOIN pg_class c ON c.relnamespace = n.oid AND c.relkind IN ('r','v')
  LEFT JOIN pg_proc p ON p.pronamespace = n.oid
  WHERE n.nspname NOT LIKE 'pg_temp_%'
    AND n.nspname NOT LIKE 'pg_toast_temp_%'
  GROUP BY n.nspname
  ORDER BY is_system, schema_name;
$$;

-- List tables in a schema with row estimates and sizes
CREATE OR REPLACE FUNCTION bop_meta.list_tables(p_schema text DEFAULT 'public')
RETURNS TABLE(
  table_name text,
  table_type text,
  row_estimate bigint,
  total_size text,
  index_count bigint,
  has_rls boolean,
  rls_forced boolean,
  description text
) LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT
    c.relname::text AS table_name,
    CASE c.relkind WHEN 'r' THEN 'table' WHEN 'v' THEN 'view' WHEN 'm' THEN 'materialized_view' ELSE c.relkind::text END AS table_type,
    c.reltuples::bigint AS row_estimate,
    pg_size_pretty(pg_total_relation_size(c.oid)) AS total_size,
    (SELECT count(*) FROM pg_index i WHERE i.indrelid = c.oid) AS index_count,
    c.relrowsecurity AS has_rls,
    c.relforcerowsecurity AS rls_forced,
    obj_description(c.oid, 'pg_class') AS description
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = p_schema
    AND c.relkind IN ('r','v','m')
  ORDER BY c.relname;
$$;

-- List columns for a specific table
CREATE OR REPLACE FUNCTION bop_meta.list_columns(p_schema text, p_table text)
RETURNS TABLE(
  ordinal int,
  column_name text,
  data_type text,
  is_nullable boolean,
  column_default text,
  is_primary_key boolean,
  is_unique boolean,
  fk_target text,
  description text
) LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT
    a.attnum::int AS ordinal,
    a.attname::text AS column_name,
    pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type,
    NOT a.attnotnull AS is_nullable,
    pg_get_expr(d.adbin, d.adrelid)::text AS column_default,
    EXISTS (
      SELECT 1 FROM pg_index i
      WHERE i.indrelid = c.oid AND i.indisprimary AND a.attnum = ANY(i.indkey)
    ) AS is_primary_key,
    EXISTS (
      SELECT 1 FROM pg_index i
      WHERE i.indrelid = c.oid AND i.indisunique AND NOT i.indisprimary
        AND array_length(i.indkey, 1) = 1 AND a.attnum = ANY(i.indkey)
    ) AS is_unique,
    (
      SELECT tc.confrelid::regclass::text || '.' || ta.attname
      FROM pg_constraint tc
      JOIN pg_attribute ta ON ta.attrelid = tc.confrelid AND ta.attnum = tc.confkey[1]
      WHERE tc.conrelid = c.oid AND tc.contype = 'f'
        AND a.attnum = ANY(tc.conkey)
      LIMIT 1
    ) AS fk_target,
    col_description(c.oid, a.attnum) AS description
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
  LEFT JOIN pg_attrdef d ON d.adrelid = c.oid AND d.adnum = a.attnum
  WHERE n.nspname = p_schema AND c.relname = p_table
  ORDER BY a.attnum;
$$;

-- List indexes for a table
CREATE OR REPLACE FUNCTION bop_meta.list_indexes(p_schema text, p_table text)
RETURNS TABLE(
  index_name text,
  is_unique boolean,
  is_primary boolean,
  columns text[],
  index_size text,
  definition text
) LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT
    ic.relname::text AS index_name,
    i.indisunique AS is_unique,
    i.indisprimary AS is_primary,
    array_agg(a.attname::text ORDER BY k.ord) AS columns,
    pg_size_pretty(pg_relation_size(ic.oid)) AS index_size,
    pg_get_indexdef(i.indexrelid) AS definition
  FROM pg_index i
  JOIN pg_class c ON c.oid = i.indrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN pg_class ic ON ic.oid = i.indexrelid
  CROSS JOIN LATERAL unnest(i.indkey) WITH ORDINALITY AS k(attnum, ord)
  JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = k.attnum
  WHERE n.nspname = p_schema AND c.relname = p_table
  GROUP BY ic.relname, i.indisunique, i.indisprimary, ic.oid, i.indexrelid
  ORDER BY i.indisprimary DESC, ic.relname;
$$;

-- List foreign keys for a table (both outbound and inbound)
CREATE OR REPLACE FUNCTION bop_meta.list_foreign_keys(p_schema text, p_table text)
RETURNS TABLE(
  constraint_name text,
  direction text,
  source_table text,
  source_columns text[],
  target_table text,
  target_columns text[],
  on_delete text,
  on_update text
) LANGUAGE sql SECURITY DEFINER STABLE AS $$
  -- Outbound FKs (this table references others)
  SELECT
    con.conname::text,
    'outbound'::text,
    (con.conrelid::regclass)::text,
    array_agg(DISTINCT sa.attname::text),
    (con.confrelid::regclass)::text,
    array_agg(DISTINCT ta.attname::text),
    CASE con.confdeltype WHEN 'a' THEN 'NO ACTION' WHEN 'r' THEN 'RESTRICT' WHEN 'c' THEN 'CASCADE' WHEN 'n' THEN 'SET NULL' WHEN 'd' THEN 'SET DEFAULT' END,
    CASE con.confupdtype WHEN 'a' THEN 'NO ACTION' WHEN 'r' THEN 'RESTRICT' WHEN 'c' THEN 'CASCADE' WHEN 'n' THEN 'SET NULL' WHEN 'd' THEN 'SET DEFAULT' END
  FROM pg_constraint con
  JOIN pg_class c ON c.oid = con.conrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  CROSS JOIN LATERAL unnest(con.conkey) WITH ORDINALITY AS sk(attnum, ord)
  JOIN pg_attribute sa ON sa.attrelid = con.conrelid AND sa.attnum = sk.attnum
  CROSS JOIN LATERAL unnest(con.confkey) WITH ORDINALITY AS tk(attnum, ord)
  JOIN pg_attribute ta ON ta.attrelid = con.confrelid AND ta.attnum = tk.attnum
  WHERE con.contype = 'f' AND n.nspname = p_schema AND c.relname = p_table
    AND sk.ord = tk.ord
  GROUP BY con.conname, con.conrelid, con.confrelid, con.confdeltype, con.confupdtype

  UNION ALL

  -- Inbound FKs (other tables reference this one)
  SELECT
    con.conname::text,
    'inbound'::text,
    (con.conrelid::regclass)::text,
    array_agg(DISTINCT sa.attname::text),
    (con.confrelid::regclass)::text,
    array_agg(DISTINCT ta.attname::text),
    CASE con.confdeltype WHEN 'a' THEN 'NO ACTION' WHEN 'r' THEN 'RESTRICT' WHEN 'c' THEN 'CASCADE' WHEN 'n' THEN 'SET NULL' WHEN 'd' THEN 'SET DEFAULT' END,
    CASE con.confupdtype WHEN 'a' THEN 'NO ACTION' WHEN 'r' THEN 'RESTRICT' WHEN 'c' THEN 'CASCADE' WHEN 'n' THEN 'SET NULL' WHEN 'd' THEN 'SET DEFAULT' END
  FROM pg_constraint con
  JOIN pg_class c ON c.oid = con.confrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  CROSS JOIN LATERAL unnest(con.conkey) WITH ORDINALITY AS sk(attnum, ord)
  JOIN pg_attribute sa ON sa.attrelid = con.conrelid AND sa.attnum = sk.attnum
  CROSS JOIN LATERAL unnest(con.confkey) WITH ORDINALITY AS tk(attnum, ord)
  JOIN pg_attribute ta ON ta.attrelid = con.confrelid AND ta.attnum = tk.attnum
  WHERE con.contype = 'f' AND n.nspname = p_schema AND c.relname = p_table
    AND sk.ord = tk.ord
  GROUP BY con.conname, con.conrelid, con.confrelid, con.confdeltype, con.confupdtype
  ORDER BY 2, 1;
$$;

-- List functions/procedures
CREATE OR REPLACE FUNCTION bop_meta.list_functions(p_schema text DEFAULT 'public')
RETURNS TABLE(
  function_name text,
  result_type text,
  argument_types text,
  function_type text,
  volatility text,
  security text,
  language text,
  description text
) LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT
    p.proname::text AS function_name,
    pg_get_function_result(p.oid) AS result_type,
    pg_get_function_arguments(p.oid) AS argument_types,
    CASE p.prokind WHEN 'f' THEN 'function' WHEN 'p' THEN 'procedure' WHEN 'a' THEN 'aggregate' WHEN 'w' THEN 'window' END AS function_type,
    CASE p.provolatile WHEN 'i' THEN 'immutable' WHEN 's' THEN 'stable' WHEN 'v' THEN 'volatile' END AS volatility,
    CASE WHEN p.prosecdef THEN 'definer' ELSE 'invoker' END AS security,
    l.lanname::text AS language,
    obj_description(p.oid, 'pg_proc') AS description
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  JOIN pg_language l ON l.oid = p.prolang
  WHERE n.nspname = p_schema
  ORDER BY p.proname;
$$;

-- Get function source code
CREATE OR REPLACE FUNCTION bop_meta.get_function_source(p_schema text, p_name text)
RETURNS TABLE(
  function_name text,
  definition text,
  argument_types text,
  result_type text
) LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT
    p.proname::text,
    pg_get_functiondef(p.oid),
    pg_get_function_arguments(p.oid),
    pg_get_function_result(p.oid)
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = p_schema AND p.proname = p_name;
$$;

-- Database-level overview stats
CREATE OR REPLACE FUNCTION bop_meta.database_overview()
RETURNS TABLE(
  db_name text,
  db_size text,
  total_tables bigint,
  total_views bigint,
  total_functions bigint,
  total_indexes bigint,
  active_connections bigint,
  max_connections int,
  uptime interval,
  pg_version text
) LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT
    current_database()::text,
    pg_size_pretty(pg_database_size(current_database())),
    (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relkind = 'r' AND n.nspname NOT IN ('pg_catalog','information_schema','pg_toast')),
    (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relkind = 'v' AND n.nspname NOT IN ('pg_catalog','information_schema','pg_toast')),
    (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname NOT IN ('pg_catalog','information_schema')),
    (SELECT count(*) FROM pg_indexes WHERE schemaname NOT IN ('pg_catalog','pg_toast')),
    (SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()),
    current_setting('max_connections')::int,
    now() - pg_postmaster_start_time(),
    version()::text;
$$;

-- RLS policies for a table
CREATE OR REPLACE FUNCTION bop_meta.list_policies(p_schema text, p_table text)
RETURNS TABLE(
  policy_name text,
  command text,
  permissive text,
  roles text[],
  qual text,
  with_check text
) LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT
    pol.polname::text,
    CASE pol.polcmd WHEN 'r' THEN 'SELECT' WHEN 'a' THEN 'INSERT' WHEN 'w' THEN 'UPDATE' WHEN 'd' THEN 'DELETE' WHEN '*' THEN 'ALL' END,
    CASE WHEN pol.polpermissive THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
    ARRAY(SELECT rolname::text FROM pg_roles WHERE oid = ANY(pol.polroles)),
    pg_get_expr(pol.polqual, pol.polrelid)::text,
    pg_get_expr(pol.polwithcheck, pol.polrelid)::text
  FROM pg_policy pol
  JOIN pg_class c ON c.oid = pol.polrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = p_schema AND c.relname = p_table
  ORDER BY pol.polname;
$$;

-- List triggers for a table
CREATE OR REPLACE FUNCTION bop_meta.list_triggers(p_schema text, p_table text)
RETURNS TABLE(
  trigger_name text,
  event text,
  timing text,
  orientation text,
  definition text
) LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT
    t.tgname::text,
    CASE
      WHEN t.tgtype & 4 > 0 AND t.tgtype & 8 > 0 AND t.tgtype & 16 > 0 THEN 'INSERT OR UPDATE OR DELETE'
      WHEN t.tgtype & 4 > 0 AND t.tgtype & 8 > 0 THEN 'INSERT OR DELETE'
      WHEN t.tgtype & 4 > 0 AND t.tgtype & 16 > 0 THEN 'INSERT OR UPDATE'
      WHEN t.tgtype & 8 > 0 AND t.tgtype & 16 > 0 THEN 'DELETE OR UPDATE'
      WHEN t.tgtype & 4 > 0 THEN 'INSERT'
      WHEN t.tgtype & 8 > 0 THEN 'DELETE'
      WHEN t.tgtype & 16 > 0 THEN 'UPDATE'
      ELSE 'UNKNOWN'
    END,
    CASE WHEN t.tgtype & 2 > 0 THEN 'BEFORE' WHEN t.tgtype & 64 > 0 THEN 'INSTEAD OF' ELSE 'AFTER' END,
    CASE WHEN t.tgtype & 1 > 0 THEN 'ROW' ELSE 'STATEMENT' END,
    pg_get_triggerdef(t.oid)
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = p_schema AND c.relname = p_table
    AND NOT t.tgisinternal
  ORDER BY t.tgname;
$$;

-- List enums
CREATE OR REPLACE FUNCTION bop_meta.list_enums(p_schema text DEFAULT 'public')
RETURNS TABLE(
  enum_name text,
  enum_values text[]
) LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT
    t.typname::text,
    array_agg(e.enumlabel::text ORDER BY e.enumsortorder)
  FROM pg_type t
  JOIN pg_namespace n ON n.oid = t.typnamespace
  JOIN pg_enum e ON e.enumtypid = t.oid
  WHERE n.nspname = p_schema
  GROUP BY t.typname
  ORDER BY t.typname;
$$;

-- List extensions
CREATE OR REPLACE FUNCTION bop_meta.list_extensions()
RETURNS TABLE(
  ext_name text,
  ext_version text,
  ext_schema text,
  description text
) LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT
    e.extname::text,
    e.extversion::text,
    n.nspname::text,
    c.description
  FROM pg_extension e
  JOIN pg_namespace n ON n.oid = e.extnamespace
  LEFT JOIN pg_description c ON c.objoid = e.oid AND c.classoid = 'pg_extension'::regclass
  ORDER BY e.extname;
$$;

-- Grant bop_meta usage to console roles
GRANT USAGE ON SCHEMA bop_meta TO bop_console_read, bop_console_write, bop_console_ddl;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA bop_meta TO bop_console_read, bop_console_write, bop_console_ddl;
ALTER DEFAULT PRIVILEGES IN SCHEMA bop_meta GRANT EXECUTE ON FUNCTIONS TO bop_console_read, bop_console_write, bop_console_ddl;

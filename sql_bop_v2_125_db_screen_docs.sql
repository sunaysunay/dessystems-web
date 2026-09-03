-- ============================================================================
-- Help/Manual content for DB001-DB008 (DBA Module) screens
-- Inserts into bop_documentation with doc_types: overview, steps, faq, reference
-- Generated: 2026-09-03
-- ============================================================================

-- ─── DB001: Database Overview ─────────────────────────────────────────────────

INSERT INTO bop_documentation (target_type, target_id, doc_type, seq, title, body_md, status, locale, module)
VALUES
('screen', 'DB001', 'overview', 0, 'Database Overview',
'The Database Overview is the main dashboard of the DBA module. It displays key metrics about your Supabase PostgreSQL database: total tables, views, functions, indexes, active connections, and database size. Use it as a health check starting point before diving into specific screens.',
'active', 'en', 'DBA'),

('screen', 'DB001', 'steps', 1, 'Review database statistics',
'Open DB001 to see a summary of your database objects. The overview card shows counts for tables, views, materialized views, functions, and extensions in the `public` schema. Row estimates and total sizes give a quick sense of database scale.',
'active', 'en', 'DBA'),

('screen', 'DB001', 'steps', 2, 'Navigate to detail screens',
'Click any metric card to jump directly to the relevant detail screen: tables go to DB002 Schema Explorer, data browsing goes to DB003, functions go to DB005, and query history goes to DB007.',
'active', 'en', 'DBA'),

('screen', 'DB001', 'faq', 1, 'Why are row counts approximate?',
'Row estimates come from `pg_class.reltuples`, which PostgreSQL updates during `ANALYZE` and `VACUUM`. They are fast but not exact. For precise counts, query the table directly in DB004 SQL Runner.',
'active', 'en', 'DBA'),

('screen', 'DB001', 'reference', 1, 'API & data',
'**API:** `GET /api/bop/dba/overview` — returns database-level statistics from `bop_meta` schema functions.

**Tables used:** `bop_meta` (schema functions)',
'active', 'en', 'DBA');

-- ─── DB002: Schema Explorer ──────────────────────────────────────────────────

INSERT INTO bop_documentation (target_type, target_id, doc_type, seq, title, body_md, status, locale, module)
VALUES
('screen', 'DB002', 'overview', 0, 'Schema Explorer',
'The Schema Explorer lets you browse the full structure of your database: tables, columns, indexes, foreign keys, RLS policies, triggers, and inter-table relationships. It supports multi-token smart search, module badges from `bop_table_docs`, and an interactive force-directed graph visualization of FK relationships.',
'active', 'en', 'DBA'),

('screen', 'DB002', 'steps', 1, 'Select a schema and table',
'Choose a schema from the dropdown (default: `public`). Use the filter box to search tables. The smart filter supports space-separated tokens with AND logic — type `wrk order` to find tables matching both "wrk" and "order". Prefix a token with `@` to search by column name: `@tenant_id` finds all tables with a `tenant_id` column.',
'active', 'en', 'DBA'),

('screen', 'DB002', 'steps', 2, 'Explore table structure',
'Click a table to see its details. Use the tabs:
- **Columns** — column names, types, nullability, defaults, PK/UQ flags, FK links (click to navigate)
- **Indexes** — index names, columns, uniqueness; click to expand the full CREATE INDEX definition
- **Foreign Keys** — inbound and outbound FK constraints with source/target columns
- **RLS Policies** — row-level security policies with USING and WITH CHECK expressions
- **Triggers** — trigger definitions and timing',
'active', 'en', 'DBA'),

('screen', 'DB002', 'steps', 3, 'Use the Screens tab',
'The **Screens** tab shows which BOP console screens reference this table. **1-hop (Direct)** shows screens that directly use the table. **2-hop (Related via FK)** shows screens using FK-linked neighbor tables. Click any screen card to open it.',
'active', 'en', 'DBA'),

('screen', 'DB002', 'steps', 4, 'Visualize relationships with the Relations graph',
'The **Relations** tab renders an interactive force-directed graph of FK relationships. Set depth to 1, 2, or 3 hops. Nodes with green badges have mapped transaction codes. Click a node to see its TC screens, double-click to navigate to that table, drag to rearrange.',
'active', 'en', 'DBA'),

('screen', 'DB002', 'steps', 5, 'Browse data or view description',
'Click **Browse Data** to jump to DB003 with the selected table pre-loaded. The description bar under the table name shows the auto-generated documentation from `bop_table_docs`, including module badge and tags (timestamped, multi-tenant, audit, etc.).',
'active', 'en', 'DBA'),

('screen', 'DB002', 'faq', 1, 'What does the @ prefix do in search?',
'Typing `@column_name` in the filter searches column names instead of table names. For example, `@tenant_id` returns all tables that have a column containing "tenant_id". You can combine: `wrk @status` finds WRK tables that have a "status" column.',
'active', 'en', 'DBA'),

('screen', 'DB002', 'faq', 2, 'Why does a table show no Screens?',
'Screen mappings come from `bop_screen_meta.db_tables`. If a table is not referenced by any screen''s `db_tables` array, the Screens tab shows empty. The 2-hop section checks FK neighbors as a fallback.',
'active', 'en', 'DBA'),

('screen', 'DB002', 'reference', 1, 'API & data',
'**API:** `GET /api/bop/dba/schema` — actions: `schemas`, `tables`, `columns`, `indexes`, `fkeys`, `policies`, `triggers`, `enums`, `extensions`, `table_detail`, `all_fkeys`, `table_screens`, `all_screens`

**API:** `GET /api/bop/dba/docs` — actions: `list`, `table`, `search`, `columns_index`

**Tables used:** `bop_meta` functions, `bop_screen_meta`, `bop_screens`, `bop_table_docs`, `pg_catalog`',
'active', 'en', 'DBA');

-- ─── DB003: Table Data ───────────────────────────────────────────────────────

INSERT INTO bop_documentation (target_type, target_id, doc_type, seq, title, body_md, status, locale, module)
VALUES
('screen', 'DB003', 'overview', 0, 'Table Data',
'Table Data is a spreadsheet-like data browser for any database table. Browse, search, sort, paginate, and edit data directly. Supports inline cell editing, row insertion, row deletion, and data export to CSV, TSV, JSON, and SQL formats. Tables without a primary key are read-only.',
'active', 'en', 'DBA'),

('screen', 'DB003', 'steps', 1, 'Browse and filter data',
'Select a table from the sidebar. Data loads with 50 rows per page. Click column headers to sort (ascending/descending). Use the search box to filter across all text columns with ILIKE matching. The filter applies server-side across all pages.',
'active', 'en', 'DBA'),

('screen', 'DB003', 'steps', 2, 'Edit data inline',
'Double-click any cell to edit it (PK columns cannot be edited). Press Enter to save or Escape to cancel. Changes are applied immediately via UPDATE. Tables without a primary key show a "No PK — read only" badge.',
'active', 'en', 'DBA'),

('screen', 'DB003', 'steps', 3, 'Insert and delete rows',
'Click **+ Insert** to open the insert form. Fill in column values (leave blank for NULL) and click Insert. To delete, click the ✕ button on a row and confirm. Both operations require a primary key on the table.',
'active', 'en', 'DBA'),

('screen', 'DB003', 'steps', 4, 'Export data',
'Click the **Export** dropdown to download the current dataset:
- **CSV** — comma-separated values, opens in Excel/Sheets
- **TSV** — tab-separated, direct paste into spreadsheets
- **JSON** — array of objects, ideal for APIs and scripts
- **SQL** — INSERT statements, for migration/backup

Exports include up to 10,000 rows with the current sort and filter applied.',
'active', 'en', 'DBA'),

('screen', 'DB003', 'faq', 1, 'Why is the table read-only?',
'Tables without a primary key cannot be edited or deleted because there is no reliable way to identify a specific row. The badge "No PK — read only" appears. You can still browse and export data.',
'active', 'en', 'DBA'),

('screen', 'DB003', 'faq', 2, 'What is the export row limit?',
'Exports are capped at 10,000 rows for performance. If your table has more rows, apply a filter first to narrow the dataset, or use DB004 SQL Runner for custom queries.',
'active', 'en', 'DBA'),

('screen', 'DB003', 'reference', 1, 'API & data',
'**API:** `GET /api/bop/dba/data` — actions: `rows` (paginated browse), `pk` (primary key columns), `export` (full download in CSV/JSON/SQL/TSV)

**POST /api/bop/dba/data** — actions: `insert`, `update`, `delete`

**Tables used:** Dynamic (any table in the selected schema)',
'active', 'en', 'DBA');

-- ─── DB004: SQL Runner ───────────────────────────────────────────────────────

INSERT INTO bop_documentation (target_type, target_id, doc_type, seq, title, body_md, status, locale, module)
VALUES
('screen', 'DB004', 'overview', 0, 'SQL Runner',
'The SQL Runner lets you execute ad-hoc SQL queries against the database. Statements are classified (SELECT, DML, DDL) and routed to the appropriate role-based connection pool. Dangerous operations (DROP DATABASE, COPY, SET ROLE) are blocked. All executions are logged to `bop_db_query_log`.',
'active', 'en', 'DBA'),

('screen', 'DB004', 'steps', 1, 'Write and execute a query',
'Type your SQL in the editor. Click **Run** or press Ctrl+Enter to execute. SELECT queries use the read-only pool (`bop_console_read`). INSERT/UPDATE/DELETE use the write pool. DDL statements use the DDL pool.',
'active', 'en', 'DBA'),

('screen', 'DB004', 'steps', 2, 'Review results',
'Query results appear in a table below the editor. Column names, row counts, and execution time are displayed. For DML statements, the affected row count is shown.',
'active', 'en', 'DBA'),

('screen', 'DB004', 'steps', 3, 'Use the CLI alternative',
'For scripting and automation, use `des-sql.sh` from the command line:
- `des-sql.sh "SELECT count(*) FROM bop_screens"` — execute a query
- `des-sql.sh --dry-run "UPDATE ..."` — test DML without committing
- `des-sql.sh --classify "DROP TABLE foo"` — check if a statement is blocked
- `des-sql.sh --file migration.sql --commit` — execute a SQL file',
'active', 'en', 'DBA'),

('screen', 'DB004', 'faq', 1, 'Which statements are blocked?',
'`COPY`, `LOAD DATA`, `CREATE DATABASE`, `DROP DATABASE`, `DO` blocks, and `SET ROLE` / `SET SESSION AUTHORIZATION` are blocked for safety. Use Supabase dashboard for these operations.',
'active', 'en', 'DBA'),

('screen', 'DB004', 'faq', 2, 'Are queries logged?',
'Yes. Every execution (web UI and CLI) is logged to `bop_db_query_log` with the user, SQL hash, execution time, role used, row count, and whether it was a dry-run or committed.',
'active', 'en', 'DBA'),

('screen', 'DB004', 'reference', 1, 'API & data',
'**Roles:**
- `bop_console_read` — SELECT queries
- `bop_console_write` — INSERT, UPDATE, DELETE
- `bop_console_ddl` — CREATE, ALTER, DROP, GRANT

**CLI:** `des-sql.sh` at `/root/scripts/des-sql.sh`

**Log table:** `bop_db_query_log`',
'active', 'en', 'DBA');

-- ─── DB005: Functions & RPC ──────────────────────────────────────────────────

INSERT INTO bop_documentation (target_type, target_id, doc_type, seq, title, body_md, status, locale, module)
VALUES
('screen', 'DB005', 'overview', 0, 'Functions & RPC',
'Browse all PostgreSQL functions and stored procedures in your database. View function signatures, return types, volatility, and source code. Functions in the `bop_meta` schema are the internal catalog functions used by the DBA module itself.',
'active', 'en', 'DBA'),

('screen', 'DB005', 'steps', 1, 'Browse functions',
'Select a schema to see all functions. Each function shows its name, argument types, return type, and volatility (IMMUTABLE, STABLE, VOLATILE). Click a function to expand its full source code.',
'active', 'en', 'DBA'),

('screen', 'DB005', 'steps', 2, 'Understand the bop_meta functions',
'The `bop_meta` schema contains helper functions used by the DBA module: `list_schemas()`, `list_tables()`, `list_columns()`, `list_indexes()`, `list_foreign_keys()`, `list_policies()`, `list_triggers()`, `list_enums()`, `list_extensions()`. These are the building blocks of DB002.',
'active', 'en', 'DBA'),

('screen', 'DB005', 'faq', 1, 'Can I create functions here?',
'Not directly. Use DB004 SQL Runner or the CLI (`des-sql.sh`) to execute CREATE FUNCTION statements. This screen is read-only for browsing existing functions.',
'active', 'en', 'DBA'),

('screen', 'DB005', 'reference', 1, 'API & data',
'**API:** `GET /api/bop/dba/functions` — lists all functions with their source code, arguments, and metadata from `pg_proc` and `pg_namespace`.',
'active', 'en', 'DBA');

-- ─── DB006: Database Actions ─────────────────────────────────────────────────

INSERT INTO bop_documentation (target_type, target_id, doc_type, seq, title, body_md, status, locale, module)
VALUES
('screen', 'DB006', 'overview', 0, 'Database Actions',
'Database Actions provides operational tools for database maintenance: running ANALYZE, VACUUM, checking table bloat, reindexing, and executing maintenance scripts. These actions use the DDL role and are logged.',
'active', 'en', 'DBA'),

('screen', 'DB006', 'steps', 1, 'Run maintenance actions',
'Select a maintenance action from the available options. Each action shows what it does and which tables it affects. Confirm before executing — most actions cannot be undone.',
'active', 'en', 'DBA'),

('screen', 'DB006', 'faq', 1, 'When should I run VACUUM?',
'PostgreSQL auto-vacuums by default. Manual VACUUM is needed after large bulk deletes or updates, or when you notice table bloat. Check DB001 overview metrics for signs of bloat.',
'active', 'en', 'DBA'),

('screen', 'DB006', 'reference', 1, 'API & data',
'**API:** `GET /api/bop/dba/actions` — lists available maintenance actions and their status.',
'active', 'en', 'DBA');

-- ─── DB007: Query History ────────────────────────────────────────────────────

INSERT INTO bop_documentation (target_type, target_id, doc_type, seq, title, body_md, status, locale, module)
VALUES
('screen', 'DB007', 'overview', 0, 'Query History',
'Query History shows all SQL executions logged to `bop_db_query_log`. Browse past queries by user, statement class, execution time, and status. Replay queries in the SQL Runner, or analyze slow-query patterns.',
'active', 'en', 'DBA'),

('screen', 'DB007', 'steps', 1, 'Browse query log',
'The history table shows recent executions sorted by timestamp. Each entry includes: user, SQL hash, statement class (select/insert/update/delete/ddl), execution time in ms, row count, dry-run flag, commit status, and error messages if any.',
'active', 'en', 'DBA'),

('screen', 'DB007', 'steps', 2, 'Filter and analyze',
'Filter by date range, user, or statement class to find specific queries. Sort by execution_ms to identify slow queries. The SQL hash links back to the original query text.',
'active', 'en', 'DBA'),

('screen', 'DB007', 'faq', 1, 'What gets logged?',
'Every SQL execution from both the web UI (DB004) and CLI (`des-sql.sh`) is logged. Queries include: the full SQL text (truncated at 50 lines), execution time, affected rows, which PG role was used, and whether it was a dry-run.',
'active', 'en', 'DBA'),

('screen', 'DB007', 'reference', 1, 'API & data',
'**Table:** `bop_db_query_log` — columns: `id`, `user_id`, `user_email`, `statement_class`, `sql_hash`, `sql_text`, `execution_ms`, `rows_affected`, `was_dry_run`, `was_committed`, `error_message`, `pg_role_used`, `client_ip`, `created_at`',
'active', 'en', 'DBA');

-- ─── DB008: Migrations ───────────────────────────────────────────────────────

INSERT INTO bop_documentation (target_type, target_id, doc_type, seq, title, body_md, status, locale, module)
VALUES
('screen', 'DB008', 'overview', 0, 'Migrations',
'The Migrations screen tracks database schema changes over time. View applied migrations, pending changes, and schema drift status. Integrates with `des-db-drift.sh` for fingerprint-based drift detection.',
'active', 'en', 'DBA'),

('screen', 'DB008', 'steps', 1, 'Check migration status',
'The screen shows which SQL migration files have been applied and which are pending. Each migration shows its filename, applied timestamp, and status.',
'active', 'en', 'DBA'),

('screen', 'DB008', 'steps', 2, 'Detect schema drift',
'Schema drift detection compares the current database fingerprint against the last snapshot. If objects were added, modified, or removed outside the migration pipeline, drift is flagged. Use `des-db-drift.sh --check` from CLI or view the status here.',
'active', 'en', 'DBA'),

('screen', 'DB008', 'faq', 1, 'What is schema drift?',
'Schema drift occurs when the database schema changes without going through the migration pipeline — for example, a manual ALTER TABLE in Supabase dashboard. The drift detector hashes all schema objects and compares against the last known baseline.',
'active', 'en', 'DBA'),

('screen', 'DB008', 'faq', 2, 'How do I accept drift?',
'Run `des-db-drift.sh --snapshot` to save the current schema as the new baseline. This resets the fingerprint so future checks start from the new state.',
'active', 'en', 'DBA'),

('screen', 'DB008', 'reference', 1, 'API & data',
'**CLI tools:**
- `des-db-drift.sh --snapshot` — save current schema as baseline
- `des-db-drift.sh --check` — compare against baseline
- `des-db-drift.sh --diff` — show actual differences

**Fingerprint storage:** `/root/.des/db-fingerprints/`',
'active', 'en', 'DBA');

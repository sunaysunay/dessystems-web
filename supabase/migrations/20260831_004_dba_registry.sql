-- ============================================================
-- DBA-P0  Database Console — DB Registry
-- Registers: bop_modules, bop_screens, bop_screen_roles
-- ============================================================

-- ── 1. bop_modules — register DBA ──

INSERT INTO bop_modules (module_id, code, name, description, layer, layer_name, phase, status)
VALUES ('DBA', 'DB', 'Database Console', 'SQL runner, schema explorer, table editor, migrations, query audit', 0, 'Foundation', 0, 'in_progress')
ON CONFLICT (module_id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  status = EXCLUDED.status,
  updated_at = now();

-- ── 2. bop_screens — 8 DBA screens ──

INSERT INTO bop_screens (screen_id, module, func_type, sequence, title, description, route, status, nav_group, nav_subgroup, nav_order, nav_visible, lifecycle_state)
VALUES
  ('DB001', 'DBA', 'dashboard',   '001', 'Database Overview',   'Database stats, schema summary, connection health',                    '/console/dba',           'active', 'system', 'databaseConsole', 10, true, 'dev'),
  ('DB002', 'DBA', 'display',     '002', 'Schema Explorer',     'Browse schemas, tables, columns, indexes, FK, RLS policies',           '/console/dba/schema',    'active', 'system', 'databaseConsole', 20, true, 'dev'),
  ('DB003', 'DBA', 'transaction', '003', 'Table Data',          'View and edit table data with type-aware cells and protection levels', '/console/dba/data',      'active', 'system', 'databaseConsole', 30, true, 'dev'),
  ('DB004', 'DBA', 'transaction', '004', 'SQL Runner',          'Execute SQL with AST classification and dry-run safety',               '/console/dba/sql',       'active', 'system', 'databaseConsole', 40, true, 'dev'),
  ('DB005', 'DBA', 'display',     '005', 'Functions & RPC',     'Browse and test Postgres functions and procedures',                    '/console/dba/functions', 'active', 'system', 'databaseConsole', 50, true, 'dev'),
  ('DB006', 'DBA', 'transaction', '006', 'Database Actions',    'Named, audited database maintenance operations',                      '/console/dba/actions',   'active', 'system', 'databaseConsole', 60, true, 'dev'),
  ('DB007', 'DBA', 'report',      '007', 'Query History',       'Full audit trail of all queries executed via console',                 '/console/dba/history',   'active', 'system', 'databaseConsole', 70, true, 'dev'),
  ('DB008', 'DBA', 'transaction', '008', 'Migrations',          'Track and apply schema migrations with drift detection',              '/console/dba/migrations','active', 'system', 'databaseConsole', 80, true, 'dev')
ON CONFLICT (screen_id) DO UPDATE SET
  module = EXCLUDED.module,
  func_type = EXCLUDED.func_type,
  sequence = EXCLUDED.sequence,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  route = EXCLUDED.route,
  status = EXCLUDED.status,
  nav_group = EXCLUDED.nav_group,
  nav_subgroup = EXCLUDED.nav_subgroup,
  nav_order = EXCLUDED.nav_order,
  nav_visible = EXCLUDED.nav_visible,
  lifecycle_state = EXCLUDED.lifecycle_state;

-- ── 3. bop_screen_roles — assign access ──

INSERT INTO bop_screen_roles (screen_id, role, can_read, can_write, can_delete)
VALUES
  ('DB001', 'super_admin', true, true, true),
  ('DB002', 'super_admin', true, true, true),
  ('DB003', 'super_admin', true, true, true),
  ('DB004', 'super_admin', true, true, true),
  ('DB005', 'super_admin', true, true, true),
  ('DB006', 'super_admin', true, true, true),
  ('DB007', 'super_admin', true, true, true),
  ('DB008', 'super_admin', true, true, true),
  ('DB001', 'platform_admin', true, true, false),
  ('DB002', 'platform_admin', true, true, false),
  ('DB003', 'platform_admin', true, true, false),
  ('DB004', 'platform_admin', true, true, false),
  ('DB005', 'platform_admin', true, true, false),
  ('DB006', 'platform_admin', true, true, false),
  ('DB007', 'platform_admin', true, true, false),
  ('DB008', 'platform_admin', true, true, false)
ON CONFLICT (screen_id, role) DO UPDATE SET
  can_read = EXCLUDED.can_read,
  can_write = EXCLUDED.can_write,
  can_delete = EXCLUDED.can_delete;

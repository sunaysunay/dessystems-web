-- BOP V2 Patch 92 — Register OP012 Exec Dashboard screen + PBAC grants
-- Run in Supabase SQL Editor

-- 1. Register screen in bop_screens
INSERT INTO bop_screens (screen_id, title, module, route, func_type, status, sequence, nav_group, nav_subgroup, nav_order, nav_visible)
VALUES ('OP012', 'Exec Dashboard', 'OPS', '/console/ops/goals/dashboard', 'transaction', 'active', 12, 'operations', 'goals', 25, true)
ON CONFLICT (screen_id) DO UPDATE SET
  title = EXCLUDED.title,
  module = EXCLUDED.module,
  route = EXCLUDED.route,
  func_type = EXCLUDED.func_type,
  status = EXCLUDED.status,
  sequence = EXCLUDED.sequence,
  nav_group = EXCLUDED.nav_group,
  nav_subgroup = EXCLUDED.nav_subgroup,
  nav_order = EXCLUDED.nav_order,
  nav_visible = EXCLUDED.nav_visible;

-- 2. Grant access to roles that already have OP002 (Strategy Cockpit)
INSERT INTO bop_screen_roles (screen_id, role, can_read, can_write, can_delete)
SELECT 'OP012', role, can_read, can_write, can_delete
FROM bop_screen_roles
WHERE screen_id = 'OP002'
ON CONFLICT (screen_id, role) DO UPDATE SET
  can_read = EXCLUDED.can_read,
  can_write = EXCLUDED.can_write,
  can_delete = EXCLUDED.can_delete;

-- 3. Register in bop_objects
INSERT INTO bop_objects (object_id, type, module, name, route, status, lifecycle_state)
VALUES
  ('table:op_goal_metrics_catalog', 'table', 'OPS', 'Metrics Catalog', NULL, 'active', 'active'),
  ('screen:OP012', 'screen', 'OPS', 'Exec Dashboard', '/console/ops/goals/dashboard', 'active', 'active')
ON CONFLICT (object_id) DO NOTHING;

-- 4. Register dependencies
INSERT INTO bop_dependencies (from_id, to_id, dep_type) VALUES
  ('screen:OP012', 'api:ops/goals:GET', 'calls'),
  ('screen:OP012', 'component:ScreenHeader', 'renders'),
  ('api:ops/goals:GET', 'table:op_goal_metrics_catalog', 'reads'),
  ('api:ops/goals:GET', 'table:op_goal_kr_snapshots', 'reads')
ON CONFLICT DO NOTHING;

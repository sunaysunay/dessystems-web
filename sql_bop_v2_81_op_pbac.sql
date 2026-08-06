-- ============================================================
-- BOP V2 — Phase 81: OP001/OP002 PBAC permissions
-- Registers OPS screens in bop_screens + grants to roles
-- ============================================================

-- ── T81.1  Register OP001 + OP002 in bop_screens ───────────
INSERT INTO bop_screens (screen_id, title, module, route, func_type, status, nav_group, nav_subgroup, nav_order, nav_visible)
VALUES
  ('OP001', 'Operations Cockpit', 'OPS', '/console/ops/tasks', 'transaction', 'active', 'operations', 'tasks', 10, true),
  ('OP002', 'Strategy Cockpit', 'OPS', '/console/ops/goals', 'transaction', 'planned', 'operations', 'goals', 20, false)
ON CONFLICT (screen_id) DO UPDATE SET
  title = EXCLUDED.title,
  module = EXCLUDED.module,
  route = EXCLUDED.route,
  func_type = EXCLUDED.func_type,
  status = EXCLUDED.status,
  nav_group = EXCLUDED.nav_group,
  nav_subgroup = EXCLUDED.nav_subgroup,
  nav_order = EXCLUDED.nav_order,
  nav_visible = EXCLUDED.nav_visible;

-- ── T81.2  Grant PBAC permissions to roles ─────────────────
-- super_admin: full access
INSERT INTO bop_screen_roles (screen_id, role, can_read, can_write, can_delete)
VALUES
  ('OP001', 'super_admin', true, true, true),
  ('OP001', 'platform_admin', true, true, true),
  ('OP001', 'tenant_manager', true, true, false),
  ('OP001', 'editor', true, true, false),
  ('OP001', 'viewer', true, false, false)
ON CONFLICT (screen_id, role) DO UPDATE SET
  can_read = EXCLUDED.can_read,
  can_write = EXCLUDED.can_write,
  can_delete = EXCLUDED.can_delete;

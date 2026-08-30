-- ============================================================
-- WRK-P0  Workshop Intelligence — DB Registry
-- Migration: sql_bop_v2_115_wrk_registry.sql
-- Registers: bop_modules, bop_screens, bop_screen_roles
-- ============================================================


-- ── 1. bop_modules — register WRK ──

UPDATE bop_modules SET
  name = 'Workshop Intelligence',
  description = 'Work orders, inspections, planning, efficiency, APK reminders, customer approvals',
  phase = 2,
  status = 'in_progress',
  updated_at = now()
WHERE module_id = 'WRK';


-- ── 2. bop_screens — 12 WRK screens ──

INSERT INTO bop_screens (screen_id, module, func_type, sequence, title, description, route, status, nav_group, nav_order, nav_visible, lifecycle_state)
VALUES
  ('WK001', 'WRK', 'dashboard',   '001', 'Workshop Dashboard',      'Intelligence overview with KPIs, alerts, and daily briefing',           '/console/wrk/dashboard',       'active', 'workshop', 10, true,  'dev'),
  ('WK002', 'WRK', 'transaction', '002', 'Work Orders',             'Create, manage, and track workshop work orders',                        '/console/wrk/orders',          'active', 'workshop', 20, true,  'dev'),
  ('WK003', 'WRK', 'transaction', '003', 'Planning Board',          'Technician and bay scheduling with drag-and-drop',                      '/console/wrk/planning',        'active', 'workshop', 30, true,  'dev'),
  ('WK004', 'WRK', 'report',      '004', 'Efficiency KPI',          'Workshop efficiency gauges, trends, and breakdowns',                    '/console/wrk/efficiency',      'active', 'workshop', 40, true,  'dev'),
  ('WK005', 'WRK', 'transaction', '005', 'Inspection Checklist',    'Digital vehicle inspection with photo capture and customer report',     '/console/wrk/inspections',     'active', 'workshop', 50, true,  'dev'),
  ('WK006', 'WRK', 'transaction', '006', 'APK Reminders',           'APK expiry tracking and automated reminder campaigns',                  '/console/wrk/apk-reminders',   'active', 'workshop', 60, true,  'dev'),
  ('WK007', 'WRK', 'transaction', '007', 'Customer Approvals',      'Token-based customer approval flow for additional work',                '/console/wrk/approvals',       'active', 'workshop', 70, true,  'dev'),
  ('WK008', 'WRK', 'display',     '008', 'Customer Status',         'Public-facing live work order progress page',                           '/console/wrk/status',          'active', 'workshop', 80, false, 'dev'),
  ('WK009', 'WRK', 'report',      '009', 'Daily Briefing',          'Morning briefing with today schedule, overdue, and alerts',             '/console/wrk/briefing',        'active', 'workshop', 90, true,  'dev'),
  ('WK010', 'WRK', 'report',      '010', 'Repair Recommendations',  'AI-assisted repair suggestions based on vehicle history',               '/console/wrk/recommendations', 'active', 'workshop', 100, true, 'dev'),
  ('WK011', 'WRK', 'master',      '011', 'Labour Rates',            'Rate-per-grade pricing with effective date ranges',                     '/console/wrk/rates',           'active', 'workshop', 110, true, 'dev'),
  ('WK012', 'WRK', 'master',      '012', 'Service Packages',        'Recipe-based service packages with parts and labour',                   '/console/wrk/packages',        'active', 'workshop', 120, true, 'dev')
ON CONFLICT (screen_id) DO UPDATE SET
  module = EXCLUDED.module,
  func_type = EXCLUDED.func_type,
  sequence = EXCLUDED.sequence,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  route = EXCLUDED.route,
  status = EXCLUDED.status,
  nav_group = EXCLUDED.nav_group,
  nav_order = EXCLUDED.nav_order,
  nav_visible = EXCLUDED.nav_visible,
  lifecycle_state = EXCLUDED.lifecycle_state;


-- ── 3. bop_screen_roles — assign access ──

INSERT INTO bop_screen_roles (screen_id, role, can_read, can_write, can_delete)
VALUES
  -- super_admin: full access on all 12 screens
  ('WK001', 'super_admin', true, true, true),
  ('WK002', 'super_admin', true, true, true),
  ('WK003', 'super_admin', true, true, true),
  ('WK004', 'super_admin', true, true, true),
  ('WK005', 'super_admin', true, true, true),
  ('WK006', 'super_admin', true, true, true),
  ('WK007', 'super_admin', true, true, true),
  ('WK008', 'super_admin', true, true, true),
  ('WK009', 'super_admin', true, true, true),
  ('WK010', 'super_admin', true, true, true),
  ('WK011', 'super_admin', true, true, true),
  ('WK012', 'super_admin', true, true, true),
  -- platform_admin: full access
  ('WK001', 'platform_admin', true, true, true),
  ('WK002', 'platform_admin', true, true, true),
  ('WK003', 'platform_admin', true, true, true),
  ('WK004', 'platform_admin', true, true, true),
  ('WK005', 'platform_admin', true, true, true),
  ('WK006', 'platform_admin', true, true, true),
  ('WK007', 'platform_admin', true, true, true),
  ('WK008', 'platform_admin', true, true, true),
  ('WK009', 'platform_admin', true, true, true),
  ('WK010', 'platform_admin', true, true, true),
  ('WK011', 'platform_admin', true, true, true),
  ('WK012', 'platform_admin', true, true, true),
  -- tenant_manager: read+write, no delete
  ('WK001', 'tenant_manager', true, true, false),
  ('WK002', 'tenant_manager', true, true, false),
  ('WK003', 'tenant_manager', true, true, false),
  ('WK004', 'tenant_manager', true, true, false),
  ('WK005', 'tenant_manager', true, true, false),
  ('WK006', 'tenant_manager', true, true, false),
  ('WK007', 'tenant_manager', true, true, false),
  ('WK008', 'tenant_manager', true, false, false),
  ('WK009', 'tenant_manager', true, false, false),
  ('WK010', 'tenant_manager', true, false, false),
  ('WK011', 'tenant_manager', true, true, false),
  ('WK012', 'tenant_manager', true, true, false),
  -- editor: read+write on operational screens
  ('WK001', 'editor', true, false, false),
  ('WK002', 'editor', true, true, false),
  ('WK003', 'editor', true, true, false),
  ('WK004', 'editor', true, false, false),
  ('WK005', 'editor', true, true, false),
  ('WK006', 'editor', true, false, false),
  ('WK007', 'editor', true, false, false),
  ('WK008', 'editor', true, false, false),
  ('WK009', 'editor', true, false, false),
  ('WK010', 'editor', true, false, false),
  ('WK011', 'editor', true, false, false),
  ('WK012', 'editor', true, false, false),
  -- viewer: read-only
  ('WK001', 'viewer', true, false, false),
  ('WK002', 'viewer', true, false, false),
  ('WK003', 'viewer', true, false, false),
  ('WK004', 'viewer', true, false, false),
  ('WK005', 'viewer', true, false, false),
  ('WK006', 'viewer', true, false, false),
  ('WK007', 'viewer', true, false, false),
  ('WK008', 'viewer', true, false, false),
  ('WK009', 'viewer', true, false, false),
  ('WK010', 'viewer', true, false, false),
  ('WK011', 'viewer', true, false, false),
  ('WK012', 'viewer', true, false, false)
ON CONFLICT (screen_id, role) DO UPDATE SET
  can_read = EXCLUDED.can_read,
  can_write = EXCLUDED.can_write,
  can_delete = EXCLUDED.can_delete;


-- ============================================================
-- Done. WRK module + 12 screens + 60 role assignments registered.
-- ============================================================

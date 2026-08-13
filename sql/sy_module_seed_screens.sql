-- Register SY051 and SY053 screens in bop_screens
-- Run AFTER the main sy_module_schema.sql migration

-- Temporarily unprotect bop_screens for INSERTs (the trigger blocks DDL, not DML,
-- but let's be safe — skip if DML is allowed)
INSERT INTO bop_screens (screen_id, module, func_type, sequence, title, description, route, icon, status, nav_group, nav_subgroup, nav_order, nav_visible)
VALUES
  ('SY051', 'SYS', 'cockpit', '051', 'Implementation Cockpit', 'Track implementation programs, phases, tasks and deliverables', '/console/sys/impl', 'ClipboardList', 'active', 'Development', NULL, 80, true),
  ('SY053', 'SYS', 'detail', '053', 'Task Detail', 'Detailed view of implementation task with deliverables and events', '/console/sys/impl/tasks', 'ListChecks', 'active', NULL, NULL, 0, false)
ON CONFLICT (screen_id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  route = EXCLUDED.route,
  nav_group = EXCLUDED.nav_group,
  nav_order = EXCLUDED.nav_order,
  nav_visible = EXCLUDED.nav_visible,
  updated_at = now();

-- Register tables in bop_objects
INSERT INTO bop_objects (object_id, name, type, module, description, protection_lvl, criticality, change_policy)
VALUES
  ('table:sy_programs', 'sy_programs', 'table', 'SYS', 'Implementation programs', 2, 0, 'controlled'),
  ('table:sy_phases', 'sy_phases', 'table', 'SYS', 'Implementation phases', 2, 0, 'controlled'),
  ('table:sy_tasks', 'sy_tasks', 'table', 'SYS', 'Implementation tasks', 1, 0, 'open'),
  ('table:sy_deliverables', 'sy_deliverables', 'table', 'SYS', 'Task deliverables — atomic verification units', 1, 0, 'open'),
  ('table:sy_task_events', 'sy_task_events', 'table', 'SYS', 'Append-only task audit log', 3, 0, 'immutable'),
  ('table:sy_task_deps', 'sy_task_deps', 'table', 'SYS', 'Task dependency graph', 1, 0, 'open'),
  ('table:sy_templates', 'sy_templates', 'table', 'SYS', 'Reusable DoD templates', 2, 0, 'controlled'),
  ('table:sy_template_items', 'sy_template_items', 'table', 'SYS', 'Template deliverable items', 1, 0, 'open')
ON CONFLICT (object_id) DO UPDATE SET
  description = EXCLUDED.description,
  protection_lvl = EXCLUDED.protection_lvl;

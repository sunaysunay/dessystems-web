-- BOP V2 Migration 97 — Register OPS business flows in SY035 Flow Map
-- Two business processes: Task Management + Strategy Management
-- Links screens → processes via bop_dependencies(involves)

-- 1. Register business processes
INSERT INTO bop_objects (object_id, type, name, module, status) VALUES
  ('process:ops-task-management', 'process', 'Task Management', 'OPS', 'active'),
  ('process:ops-strategy-management', 'process', 'Strategy & Goals Management', 'OPS', 'active')
ON CONFLICT (object_id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status;

-- 2. Register API + table objects (for flow map dependency graph)
INSERT INTO bop_objects (object_id, type, name, module, route, status) VALUES
  ('api:ops/tasks:GET', 'api', 'GET Tasks', 'OPS', '/api/bop/ops/tasks', 'active'),
  ('api:ops/tasks:POST', 'api', 'Task Actions', 'OPS', '/api/bop/ops/tasks', 'active'),
  ('api:ops/tasks:PATCH', 'api', 'Update Task', 'OPS', '/api/bop/ops/tasks', 'active'),
  ('api:ops/tasks/analytics:GET', 'api', 'GET Task Analytics', 'OPS', '/api/bop/ops/tasks/analytics', 'active'),
  ('api:ops/goals:GET', 'api', 'GET Goals', 'OPS', '/api/bop/ops/goals', 'active'),
  ('api:ops/goals:POST', 'api', 'Goal Actions', 'OPS', '/api/bop/ops/goals', 'active'),
  ('api:ops/goals:PATCH', 'api', 'Update Goal', 'OPS', '/api/bop/ops/goals', 'active'),
  ('table:op_tasks', 'table', 'op_tasks', 'OPS', NULL, 'active'),
  ('table:op_task_events', 'table', 'op_task_events', 'OPS', NULL, 'active'),
  ('table:op_task_dependencies', 'table', 'op_task_dependencies', 'OPS', NULL, 'active'),
  ('table:op_goals', 'table', 'op_goals', 'OPS', NULL, 'active'),
  ('table:op_goal_key_results', 'table', 'op_goal_key_results', 'OPS', NULL, 'active'),
  ('table:op_goal_kr_snapshots', 'table', 'op_goal_kr_snapshots', 'OPS', NULL, 'active'),
  ('table:op_goal_period_ledger', 'table', 'op_goal_period_ledger', 'OPS', NULL, 'active')
ON CONFLICT (object_id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status;

-- 2b. Register screen objects (FK targets for bop_dependencies)
INSERT INTO bop_objects (object_id, type, name, module, route, status) VALUES
  ('screen:OP001', 'screen', 'Operations Cockpit', 'OPS', '/console/ops/tasks', 'active'),
  ('screen:OP002', 'screen', 'Strategy Cockpit', 'OPS', '/console/ops/goals', 'active'),
  ('screen:OP009', 'screen', 'Task Grid View', 'OPS', '/console/ops/tasks/grid', 'active'),
  ('screen:OP012', 'screen', 'Exec Dashboard', 'OPS', '/console/ops/goals/dashboard', 'active'),
  ('screen:OP013', 'screen', 'Task Analytics', 'OPS', '/console/ops/tasks/analytics', 'active'),
  ('screen:OP014', 'screen', 'Task Timeline', 'OPS', '/console/ops/tasks/timeline', 'active'),
  ('screen:OP015', 'screen', 'Entity Scorecard', 'OPS', '/console/ops/goals/scorecard', 'active')
ON CONFLICT (object_id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status;

-- 3. Process → Screen links (involves)
INSERT INTO bop_dependencies (from_id, to_id, dep_type) VALUES
  -- Task Management involves these screens
  ('process:ops-task-management', 'screen:OP001', 'involves'),
  ('process:ops-task-management', 'screen:OP009', 'involves'),
  ('process:ops-task-management', 'screen:OP013', 'involves'),
  ('process:ops-task-management', 'screen:OP014', 'involves'),
  -- Strategy Management involves these screens
  ('process:ops-strategy-management', 'screen:OP002', 'involves'),
  ('process:ops-strategy-management', 'screen:OP012', 'involves'),
  ('process:ops-strategy-management', 'screen:OP015', 'involves')
ON CONFLICT DO NOTHING;

-- 4. Screen → API dependencies (calls)
INSERT INTO bop_dependencies (from_id, to_id, dep_type) VALUES
  ('screen:OP001', 'api:ops/tasks:GET', 'calls'),
  ('screen:OP001', 'api:ops/tasks:POST', 'calls'),
  ('screen:OP009', 'api:ops/tasks:GET', 'calls'),
  ('screen:OP009', 'api:ops/tasks:PATCH', 'calls'),
  ('screen:OP013', 'api:ops/tasks/analytics:GET', 'calls'),
  ('screen:OP014', 'api:ops/tasks:GET', 'calls'),
  ('screen:OP002', 'api:ops/goals:GET', 'calls'),
  ('screen:OP002', 'api:ops/goals:POST', 'calls'),
  ('screen:OP012', 'api:ops/goals:GET', 'calls'),
  ('screen:OP012', 'api:ops/goals:POST', 'calls'),
  ('screen:OP015', 'api:ops/goals:GET', 'calls')
ON CONFLICT DO NOTHING;

-- 5. API → Table dependencies (reads/writes)
INSERT INTO bop_dependencies (from_id, to_id, dep_type) VALUES
  ('api:ops/tasks:GET', 'table:op_tasks', 'reads'),
  ('api:ops/tasks:POST', 'table:op_tasks', 'writes'),
  ('api:ops/tasks:POST', 'table:op_task_events', 'writes'),
  ('api:ops/tasks:PATCH', 'table:op_tasks', 'writes'),
  ('api:ops/tasks/analytics:GET', 'table:op_tasks', 'reads'),
  ('api:ops/tasks/analytics:GET', 'table:op_task_events', 'reads'),
  ('api:ops/goals:GET', 'table:op_goals', 'reads'),
  ('api:ops/goals:GET', 'table:op_goal_key_results', 'reads'),
  ('api:ops/goals:GET', 'table:op_goal_kr_snapshots', 'reads'),
  ('api:ops/goals:GET', 'table:op_goal_period_ledger', 'reads'),
  ('api:ops/goals:POST', 'table:op_goals', 'writes'),
  ('api:ops/goals:POST', 'table:op_goal_key_results', 'writes'),
  ('api:ops/goals:POST', 'table:op_goal_period_ledger', 'writes'),
  ('api:ops/goals:PATCH', 'table:op_goals', 'writes')
ON CONFLICT DO NOTHING;

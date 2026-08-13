-- BOP V2 Migration 98 — Register OP010 Kanban + OP011 Calendar in bop_screens, bop_objects, bop_documentation, bop_dependencies

-- 1. bop_screens
INSERT INTO bop_screens (screen_id, module, func_type, sequence, title, description, route, status, nav_group, nav_order, nav_visible)
VALUES
  ('OP010', 'OPS', 'list', '010', 'Kanban Board',
   'Drag-and-drop kanban with status swim lanes and priority badges',
   '/console/ops/tasks/kanban', 'active', 'Operations', 91, false),
  ('OP011', 'OPS', 'list', '011', 'Calendar View',
   'Monthly calendar grid with due-date task chips and day-click navigation',
   '/console/ops/tasks/calendar', 'active', 'Operations', 92, false)
ON CONFLICT (screen_id) DO UPDATE SET
  title = EXCLUDED.title, route = EXCLUDED.route, description = EXCLUDED.description, status = EXCLUDED.status;

-- 2. bop_objects (FK targets for flow map)
INSERT INTO bop_objects (object_id, type, name, module, route, status) VALUES
  ('screen:OP010', 'screen', 'Kanban Board', 'OPS', '/console/ops/tasks/kanban', 'active'),
  ('screen:OP011', 'screen', 'Calendar View', 'OPS', '/console/ops/tasks/calendar', 'active')
ON CONFLICT (object_id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status;

-- 3. bop_dependencies (flow map edges)
INSERT INTO bop_dependencies (from_id, to_id, dep_type) VALUES
  ('process:ops-task-management', 'screen:OP010', 'involves'),
  ('process:ops-task-management', 'screen:OP011', 'involves'),
  ('screen:OP010', 'api:ops/tasks:GET', 'calls'),
  ('screen:OP010', 'api:ops/tasks:PATCH', 'calls'),
  ('screen:OP011', 'api:ops/tasks:GET', 'calls')
ON CONFLICT DO NOTHING;

-- 4. bop_documentation
INSERT INTO bop_documentation (target_type, target_id, doc_type, seq, title, body_md, status, owner, module, related_screens)
VALUES
  ('screen', 'OP010', 'overview', 1, 'Kanban Board Overview',
   '**OP010 — Kanban Board** provides a drag-and-drop task management view organized by status columns.

**Columns:** Open, In Progress, Waiting Input, Waiting Approval, Blocked, Done, Cancelled — each rendered as a swim lane.

**Cards:** Each task card shows title, task number, priority badge (color-coded), assignee avatar, due date, and SLA indicator. Cards are draggable between columns to change status.

**Features:**
- Drag-and-drop between status columns (calls PATCH to update status)
- Priority color stripes: grey (1), blue (2), orange (3), red (4)
- Task count badge per column header
- Click card to navigate to task detail
- Refresh button to reload

**API:** `GET /api/bop/ops/tasks?tenant_id=&view=list` for task data, `PATCH /api/bop/ops/tasks` for status updates.',
   'active', 'ai-draft', 'OPS', ARRAY['OP010', 'OP001']),

  ('screen', 'OP011', 'overview', 1, 'Calendar View Overview',
   '**OP011 — Calendar View** displays tasks on a monthly calendar grid based on their due dates.

**Layout:**
- Month header with prev/next navigation and today button
- 7-column grid (Mon–Sun) with day cells
- Task chips in each day cell showing title, priority dot, and status badge
- Overflow indicator when a day has more than 3 tasks

**Features:**
- Month navigation (previous/next arrows, today button)
- Day cells show task chips color-coded by priority
- Click any task chip to navigate to task detail
- Click day number to filter tasks for that date
- Current day highlighted with accent border

**API:** `GET /api/bop/ops/tasks?tenant_id=&view=list` filtered by due_at date range.',
   'active', 'ai-draft', 'OPS', ARRAY['OP011', 'OP001'])
ON CONFLICT DO NOTHING;

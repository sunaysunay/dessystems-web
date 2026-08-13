-- BOP V2 Migration 99 — Register OP009 Task Grid in bop_screens + bop_documentation (was missing)

INSERT INTO bop_screens (screen_id, module, func_type, sequence, title, description, route, status, nav_group, nav_order, nav_visible)
VALUES
  ('OP009', 'OPS', 'list', '009', 'Task Grid',
   'Sortable data grid with multi-select, bulk status transitions, priority changes, and delete',
   '/console/ops/tasks/grid', 'active', 'Operations', 90, false)
ON CONFLICT (screen_id) DO UPDATE SET
  title = EXCLUDED.title, route = EXCLUDED.route, description = EXCLUDED.description, status = EXCLUDED.status;

INSERT INTO bop_documentation (target_type, target_id, doc_type, seq, title, body_md, status, owner, module, related_screens)
VALUES
  ('screen', 'OP009', 'overview', 1, 'Task Grid Overview',
   '**OP009 — Task Grid** provides a sortable, filterable data grid for task management with bulk operations.

**Columns:** Checkbox, Task Number, Title, Status (badge), Priority (badge), Assignee, Due Date, SLA Due, Created.

**Features:**
- Column header sorting (click to toggle asc/desc)
- Multi-select via checkboxes with select-all toggle
- Bulk action bar: change status, change priority, delete selected
- Status filter dropdown and text search
- Pagination with page size control
- Click any row to navigate to task detail

**Bulk Operations:**
- Status transition: select tasks → pick target status from dropdown → applies `bulk_update` POST
- Priority change: select tasks → pick priority → applies `bulk_update` POST
- Delete: select tasks → confirm → fires sequential DELETE calls

**API:** `GET /api/bop/ops/tasks?tenant_id=&page=&page_size=&sort=&sort_dir=`, `POST /api/bop/ops/tasks` (action: bulk_update), `DELETE /api/bop/ops/tasks`',
   'active', 'ai-draft', 'OPS', ARRAY['OP009', 'OP001'])
ON CONFLICT DO NOTHING;

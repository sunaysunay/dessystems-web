-- ============================================================
-- OPS-P1  Operations Cockpit — Core Tables
-- Migration: sql_bop_v2_78_op_tasks.sql
-- Tables: op_tasks, op_task_dependencies, op_task_events,
--         op_task_comments, op_task_attachments
-- ============================================================

-- ── 1. CREATE op_tasks ──

CREATE TABLE IF NOT EXISTS op_tasks (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id         uuid NOT NULL DEFAULT current_setting('app.tenant_id', true)::uuid,
  task_number       text,

  -- Core
  title             text NOT NULL,
  description       text,
  status            text DEFAULT 'open' NOT NULL,
  priority          integer DEFAULT 2 NOT NULL,

  -- Assignment
  assignee_id       uuid,
  department_id     uuid,
  created_by        uuid,

  -- Dates & SLA
  due_at            timestamptz,
  sla_due_at        timestamptz,
  escalation_level  integer DEFAULT 0 NOT NULL,
  snoozed_until     timestamptz,

  -- Hierarchy
  parent_task_id    uuid REFERENCES op_tasks(id),

  -- Polymorphic reference (link to any BOP entity)
  ref_object_type   text,
  ref_object_id     uuid,
  ref_object_label  text,

  -- Checklist
  checklist         jsonb DEFAULT '[]'::jsonb,

  -- Recurrence
  is_recurring      boolean DEFAULT false,
  rrule             text,
  last_recurred_at  timestamptz,

  -- Strategy link (populated in STR-P2)
  goal_kr_id        uuid,

  -- Soft-delete
  deleted_at        timestamptz,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

-- ── 1b. Status constraint (7 statuses) ──

ALTER TABLE op_tasks DROP CONSTRAINT IF EXISTS op_tasks_status_check;
ALTER TABLE op_tasks ADD CONSTRAINT op_tasks_status_check
  CHECK (status IN ('open','in_progress','waiting_input','waiting_approval','blocked','done','cancelled'));

-- ── 1c. Priority constraint (1-4) ──

ALTER TABLE op_tasks DROP CONSTRAINT IF EXISTS op_tasks_priority_check;
ALTER TABLE op_tasks ADD CONSTRAINT op_tasks_priority_check
  CHECK (priority >= 1 AND priority <= 4);

-- ── 1d. Escalation level constraint (0-3) ──

ALTER TABLE op_tasks DROP CONSTRAINT IF EXISTS op_tasks_escalation_check;
ALTER TABLE op_tasks ADD CONSTRAINT op_tasks_escalation_check
  CHECK (escalation_level >= 0 AND escalation_level <= 3);

-- ── 1e. Indexes ──

CREATE INDEX IF NOT EXISTS idx_op_tasks_tenant_status_sla
  ON op_tasks (tenant_id, status, sla_due_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_op_tasks_tenant_assignee_status
  ON op_tasks (tenant_id, assignee_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_op_tasks_ref_object
  ON op_tasks (ref_object_type, ref_object_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_op_tasks_tenant
  ON op_tasks (tenant_id)
  WHERE deleted_at IS NULL;

-- ── 1f. Auto-number trigger ──

CREATE OR REPLACE FUNCTION op_task_number_trigger()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_prefix text;
  v_count  bigint;
BEGIN
  IF NEW.task_number IS NULL THEN
    v_prefix := 'OT-' || to_char(now(), 'YYYYMM');
    SELECT count(*) INTO v_count FROM op_tasks WHERE task_number LIKE v_prefix || '%';
    NEW.task_number := v_prefix || '-' || lpad((v_count + 1)::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_op_task_number ON op_tasks;
CREATE TRIGGER trg_op_task_number
  BEFORE INSERT ON op_tasks
  FOR EACH ROW EXECUTE FUNCTION op_task_number_trigger();

-- ── 1g. updated_at trigger ──

CREATE OR REPLACE FUNCTION op_tasks_updated_at_trigger()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_op_tasks_updated_at ON op_tasks;
CREATE TRIGGER trg_op_tasks_updated_at
  BEFORE UPDATE ON op_tasks
  FOR EACH ROW EXECUTE FUNCTION op_tasks_updated_at_trigger();

-- ── 1h. RLS ──

DO $$ BEGIN
  EXECUTE 'ALTER TABLE op_tasks ENABLE ROW LEVEL SECURITY';
  CREATE POLICY op_tasks_tenant ON op_tasks
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============================================================
-- ── 2. CREATE op_task_dependencies ──
-- ============================================================

CREATE TABLE IF NOT EXISTS op_task_dependencies (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id           uuid NOT NULL REFERENCES op_tasks(id) ON DELETE CASCADE,
  depends_on_id     uuid NOT NULL REFERENCES op_tasks(id) ON DELETE CASCADE,
  created_at        timestamptz DEFAULT now()
);

ALTER TABLE op_task_dependencies DROP CONSTRAINT IF EXISTS op_task_deps_no_self_ref;
ALTER TABLE op_task_dependencies ADD CONSTRAINT op_task_deps_no_self_ref
  CHECK (task_id <> depends_on_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_op_task_deps_unique
  ON op_task_dependencies (task_id, depends_on_id);

CREATE INDEX IF NOT EXISTS idx_op_task_deps_depends_on
  ON op_task_dependencies (depends_on_id);


-- ============================================================
-- ── 3. CREATE op_task_events ──
-- 12 event types: created, status_changed, assigned, priority_changed,
-- sla_warning, sla_breached, escalated, commented, attachment_added,
-- checklist_toggled, snoozed, closed
-- ============================================================

CREATE TABLE IF NOT EXISTS op_task_events (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id           uuid NOT NULL REFERENCES op_tasks(id) ON DELETE CASCADE,
  event_type        text NOT NULL,
  actor_id          uuid,
  payload           jsonb DEFAULT '{}'::jsonb,
  created_at        timestamptz DEFAULT now()
);

ALTER TABLE op_task_events DROP CONSTRAINT IF EXISTS op_task_events_type_check;
ALTER TABLE op_task_events ADD CONSTRAINT op_task_events_type_check
  CHECK (event_type IN (
    'created','status_changed','assigned','priority_changed',
    'sla_warning','sla_breached','escalated','commented',
    'attachment_added','checklist_toggled','snoozed','closed'
  ));

CREATE INDEX IF NOT EXISTS idx_op_task_events_task_id
  ON op_task_events (task_id, created_at DESC);


-- ============================================================
-- ── 4. CREATE op_task_comments ──
-- Threaded, soft-delete
-- ============================================================

CREATE TABLE IF NOT EXISTS op_task_comments (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id           uuid NOT NULL REFERENCES op_tasks(id) ON DELETE CASCADE,
  parent_comment_id uuid REFERENCES op_task_comments(id),
  author_id         uuid NOT NULL,
  body              text NOT NULL,
  deleted_at        timestamptz,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_op_task_comments_task_id
  ON op_task_comments (task_id, created_at)
  WHERE deleted_at IS NULL;


-- ============================================================
-- ── 5. CREATE op_task_attachments ──
-- Storage path: op-tasks/{task_id}/{uuid}.{ext}
-- ============================================================

CREATE TABLE IF NOT EXISTS op_task_attachments (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id           uuid NOT NULL REFERENCES op_tasks(id) ON DELETE CASCADE,
  file_name         text NOT NULL,
  file_path         text NOT NULL,
  file_size         bigint,
  mime_type         text,
  uploaded_by       uuid NOT NULL,
  created_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_op_task_attachments_task_id
  ON op_task_attachments (task_id);


-- ============================================================
-- ── 6. Register objects in bop_objects ──
-- ============================================================

INSERT INTO bop_objects (object_id, type, module, name, route, status, lifecycle_state)
VALUES
  ('table:op_tasks',             'table', 'OPS', 'Tasks',              '/console/ops/tasks', 'active', 'active'),
  ('table:op_task_dependencies', 'table', 'OPS', 'Task Dependencies',  NULL, 'active', 'active'),
  ('table:op_task_events',       'table', 'OPS', 'Task Events',        NULL, 'active', 'active'),
  ('table:op_task_comments',     'table', 'OPS', 'Task Comments',      NULL, 'active', 'active'),
  ('table:op_task_attachments',  'table', 'OPS', 'Task Attachments',   NULL, 'active', 'active')
ON CONFLICT (object_id) DO NOTHING;

-- ── 7. Register counter ──

INSERT INTO bop_counter (object_name, short_code, counter)
VALUES ('op_tasks', 'OT', 0)
ON CONFLICT (object_name) DO NOTHING;

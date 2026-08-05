-- ============================================================
-- BOP V2 — Phase 80: op_tasks hardening
-- Fixes: race-safe numbering, tenant validation, RLS WITH CHECK,
--        bulk_update variable shadow, child-table RLS
-- ============================================================

-- ── T80.1  UNIQUE constraint on task_number ─────────────────
ALTER TABLE op_tasks
  ADD CONSTRAINT op_tasks_task_number_unique UNIQUE (task_number);

-- ── T80.2  Replace count-based trigger with sequence-safe numbering ──
CREATE OR REPLACE FUNCTION op_task_number_trigger_fn()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_prefix text;
  v_seq    int;
BEGIN
  v_prefix := 'OT-' || to_char(now(), 'YYYYMM') || '-';
  SELECT COALESCE(MAX(
    NULLIF(regexp_replace(task_number, '^OT-\d{6}-', ''), '')::int
  ), 0) + 1
    INTO v_seq
    FROM op_tasks
   WHERE task_number LIKE v_prefix || '%'
     FOR UPDATE;
  NEW.task_number := v_prefix || lpad(v_seq::text, 5, '0');
  RETURN NEW;
END;
$$;

-- ── T80.3  Tenant validation in SECURITY DEFINER RPCs ──────
CREATE OR REPLACE FUNCTION op_task_create(
  p_tenant_id    uuid,
  p_title        text,
  p_description  text     DEFAULT NULL,
  p_priority     int      DEFAULT 2,
  p_assignee_id  uuid     DEFAULT NULL,
  p_department_id uuid    DEFAULT NULL,
  p_due_at       timestamptz DEFAULT NULL,
  p_sla_due_at   timestamptz DEFAULT NULL,
  p_ref_object_type text  DEFAULT NULL,
  p_ref_object_id   uuid  DEFAULT NULL,
  p_ref_object_label text DEFAULT NULL,
  p_checklist    jsonb    DEFAULT '[]',
  p_tags         text[]   DEFAULT '{}',
  p_actor_id     uuid     DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_id uuid;
BEGIN
  -- Validate tenant exists
  IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = p_tenant_id) THEN
    RAISE EXCEPTION 'Invalid tenant_id';
  END IF;

  INSERT INTO op_tasks (
    tenant_id, title, description, priority, assignee_id, department_id,
    due_at, sla_due_at, ref_object_type, ref_object_id, ref_object_label,
    checklist, tags
  ) VALUES (
    p_tenant_id, p_title, p_description, p_priority, p_assignee_id, p_department_id,
    p_due_at, p_sla_due_at, p_ref_object_type, p_ref_object_id, p_ref_object_label,
    p_checklist, p_tags
  )
  RETURNING id INTO v_id;

  INSERT INTO op_task_events (task_id, event_type, actor_id, payload)
  VALUES (v_id, 'created', p_actor_id, jsonb_build_object('title', p_title));

  RETURN v_id;
END;
$$;

-- ── T80.4  RLS WITH CHECK on op_tasks ──────────────────────
DROP POLICY IF EXISTS op_tasks_tenant_isolation ON op_tasks;
CREATE POLICY op_tasks_tenant_isolation ON op_tasks
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ── T80.5  RLS on child tables ─────────────────────────────
ALTER TABLE op_task_events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE op_task_comments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE op_task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE op_task_attachments  ENABLE ROW LEVEL SECURITY;

CREATE POLICY op_task_events_tenant_isolation ON op_task_events
  USING (task_id IN (SELECT id FROM op_tasks))
  WITH CHECK (task_id IN (SELECT id FROM op_tasks));

CREATE POLICY op_task_comments_tenant_isolation ON op_task_comments
  USING (task_id IN (SELECT id FROM op_tasks))
  WITH CHECK (task_id IN (SELECT id FROM op_tasks));

CREATE POLICY op_task_dependencies_tenant_isolation ON op_task_dependencies
  USING (task_id IN (SELECT id FROM op_tasks))
  WITH CHECK (task_id IN (SELECT id FROM op_tasks));

CREATE POLICY op_task_attachments_tenant_isolation ON op_task_attachments
  USING (task_id IN (SELECT id FROM op_tasks))
  WITH CHECK (task_id IN (SELECT id FROM op_tasks));

-- ── T80.6  Fix bulk_update variable shadow + count inflation ─
CREATE OR REPLACE FUNCTION op_task_bulk_update(
  p_task_ids   uuid[],
  p_updates    jsonb,
  p_actor_id   uuid DEFAULT NULL
)
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_id      uuid;
  v_task    op_tasks%ROWTYPE;
  v_count   int := 0;
  v_new_status text;
BEGIN
  FOREACH v_id IN ARRAY p_task_ids LOOP
    SELECT * INTO v_task FROM op_tasks WHERE id = v_id AND deleted_at IS NULL;
    IF NOT FOUND THEN CONTINUE; END IF;

    v_new_status := p_updates->>'status';
    IF v_new_status IS NOT NULL AND v_new_status IS DISTINCT FROM v_task.status THEN
      IF NOT op_task_valid_transition(v_task.status, v_new_status) THEN
        RAISE NOTICE 'Skipping invalid transition % -> % for task %', v_task.status, v_new_status, v_id;
        CONTINUE;
      END IF;
    END IF;

    UPDATE op_tasks SET
      status        = COALESCE(v_new_status, status),
      priority      = COALESCE((p_updates->>'priority')::int, priority),
      assignee_id   = CASE WHEN p_updates ? 'assignee_id' THEN (p_updates->>'assignee_id')::uuid ELSE assignee_id END,
      department_id = CASE WHEN p_updates ? 'department_id' THEN (p_updates->>'department_id')::uuid ELSE department_id END,
      due_at        = CASE WHEN p_updates ? 'due_at' THEN (p_updates->>'due_at')::timestamptz ELSE due_at END,
      sla_due_at    = CASE WHEN p_updates ? 'sla_due_at' THEN (p_updates->>'sla_due_at')::timestamptz ELSE sla_due_at END,
      updated_at    = now()
    WHERE id = v_id;

    IF v_new_status IS NOT NULL AND v_new_status IS DISTINCT FROM v_task.status THEN
      INSERT INTO op_task_events (task_id, event_type, actor_id, payload)
      VALUES (v_id, 'status_changed', p_actor_id,
        jsonb_build_object('from', v_task.status, 'to', v_new_status));
      PERFORM op_task_check_unblock(v_id);
    END IF;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

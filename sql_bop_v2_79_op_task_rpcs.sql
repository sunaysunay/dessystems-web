-- ============================================================
-- OPS-P1  Operations Cockpit — Status Machine + RPCs
-- Migration: sql_bop_v2_79_op_task_rpcs.sql
-- RPCs: op_task_create, op_task_transition, op_task_assign,
--       op_task_bulk_update, op_task_snooze
-- ============================================================

-- ── 1. Status adjacency check ──
-- 7 statuses: open, in_progress, waiting_input, waiting_approval, blocked, done, cancelled

CREATE OR REPLACE FUNCTION op_task_valid_transition(p_from text, p_to text)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  RETURN CASE p_from
    WHEN 'open'              THEN p_to IN ('in_progress','waiting_input','waiting_approval','blocked','cancelled')
    WHEN 'in_progress'       THEN p_to IN ('open','waiting_input','waiting_approval','blocked','done','cancelled')
    WHEN 'waiting_input'     THEN p_to IN ('open','in_progress','blocked','cancelled')
    WHEN 'waiting_approval'  THEN p_to IN ('in_progress','done','cancelled')
    WHEN 'blocked'           THEN p_to IN ('open','in_progress','cancelled')
    WHEN 'done'              THEN p_to IN ('open')
    WHEN 'cancelled'         THEN p_to IN ('open')
    ELSE false
  END;
END;
$$;


-- ── 2. RPC: op_task_create ──

CREATE OR REPLACE FUNCTION op_task_create(
  p_tenant_id        uuid,
  p_title            text,
  p_description      text DEFAULT NULL,
  p_priority         integer DEFAULT 2,
  p_assignee_id      uuid DEFAULT NULL,
  p_department_id    uuid DEFAULT NULL,
  p_due_at           timestamptz DEFAULT NULL,
  p_sla_due_at       timestamptz DEFAULT NULL,
  p_ref_object_type  text DEFAULT NULL,
  p_ref_object_id    uuid DEFAULT NULL,
  p_ref_object_label text DEFAULT NULL,
  p_parent_task_id   uuid DEFAULT NULL,
  p_checklist        jsonb DEFAULT '[]'::jsonb,
  p_actor            uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_task_id uuid;
  v_number  text;
BEGIN
  INSERT INTO op_tasks (
    tenant_id, title, description, priority, assignee_id, department_id,
    due_at, sla_due_at, ref_object_type, ref_object_id, ref_object_label,
    parent_task_id, checklist, created_by
  ) VALUES (
    p_tenant_id, p_title, p_description, p_priority, p_assignee_id, p_department_id,
    p_due_at, p_sla_due_at, p_ref_object_type, p_ref_object_id, p_ref_object_label,
    p_parent_task_id, p_checklist, p_actor
  ) RETURNING id, task_number INTO v_task_id, v_number;

  INSERT INTO op_task_events (task_id, event_type, actor_id, payload)
  VALUES (v_task_id, 'created', p_actor, jsonb_build_object(
    'title', p_title,
    'priority', p_priority,
    'assignee_id', p_assignee_id
  ));

  RETURN jsonb_build_object('task_id', v_task_id, 'task_number', v_number);
END;
$$;


-- ── 3. RPC: op_task_transition ──

CREATE OR REPLACE FUNCTION op_task_transition(
  p_task_id   uuid,
  p_to_status text,
  p_actor     uuid DEFAULT NULL,
  p_reason    text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_task      op_tasks%ROWTYPE;
  v_blocked   integer;
BEGIN
  SELECT * INTO v_task FROM op_tasks WHERE id = p_task_id AND deleted_at IS NULL FOR UPDATE;
  IF v_task IS NULL THEN RAISE EXCEPTION 'task not found'; END IF;

  IF NOT op_task_valid_transition(v_task.status, p_to_status) THEN
    RAISE EXCEPTION 'invalid transition from % to %', v_task.status, p_to_status;
  END IF;

  -- Blocked tasks can only leave blocked if all blockers are done/cancelled
  IF v_task.status = 'blocked' AND p_to_status NOT IN ('cancelled') THEN
    SELECT count(*) INTO v_blocked
    FROM op_task_dependencies d
    JOIN op_tasks t ON t.id = d.depends_on_id
    WHERE d.task_id = p_task_id
      AND t.status NOT IN ('done', 'cancelled')
      AND t.deleted_at IS NULL;

    IF v_blocked > 0 THEN
      RAISE EXCEPTION 'cannot unblock: % dependencies still pending', v_blocked;
    END IF;
  END IF;

  UPDATE op_tasks SET status = p_to_status WHERE id = p_task_id;

  INSERT INTO op_task_events (task_id, event_type, actor_id, payload)
  VALUES (p_task_id, 'status_changed', p_actor, jsonb_build_object(
    'from', v_task.status,
    'to', p_to_status,
    'reason', p_reason
  ));

  -- If done/cancelled, check if any blocked dependants can now unblock
  IF p_to_status IN ('done', 'cancelled') THEN
    PERFORM op_task_check_unblock(dep.task_id)
    FROM op_task_dependencies dep
    WHERE dep.depends_on_id = p_task_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'from', v_task.status, 'to', p_to_status);
END;
$$;


-- ── 3b. Helper: auto-unblock check ──

CREATE OR REPLACE FUNCTION op_task_check_unblock(p_task_id uuid)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_pending integer;
  v_status  text;
BEGIN
  SELECT status INTO v_status FROM op_tasks WHERE id = p_task_id AND deleted_at IS NULL;
  IF v_status <> 'blocked' THEN RETURN; END IF;

  SELECT count(*) INTO v_pending
  FROM op_task_dependencies d
  JOIN op_tasks t ON t.id = d.depends_on_id
  WHERE d.task_id = p_task_id
    AND t.status NOT IN ('done', 'cancelled')
    AND t.deleted_at IS NULL;

  IF v_pending = 0 THEN
    UPDATE op_tasks SET status = 'open' WHERE id = p_task_id;
    INSERT INTO op_task_events (task_id, event_type, payload)
    VALUES (p_task_id, 'status_changed', jsonb_build_object(
      'from', 'blocked', 'to', 'open', 'reason', 'auto-unblocked: all dependencies resolved'
    ));
  END IF;
END;
$$;


-- ── 4. RPC: op_task_assign ──

CREATE OR REPLACE FUNCTION op_task_assign(
  p_task_id      uuid,
  p_assignee_id  uuid,
  p_actor        uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_prev uuid;
BEGIN
  SELECT assignee_id INTO v_prev FROM op_tasks WHERE id = p_task_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'task not found'; END IF;

  UPDATE op_tasks SET assignee_id = p_assignee_id WHERE id = p_task_id;

  INSERT INTO op_task_events (task_id, event_type, actor_id, payload)
  VALUES (p_task_id, 'assigned', p_actor, jsonb_build_object(
    'prev_assignee_id', v_prev,
    'new_assignee_id', p_assignee_id
  ));

  RETURN jsonb_build_object('ok', true);
END;
$$;


-- ── 5. RPC: op_task_bulk_update ──

CREATE OR REPLACE FUNCTION op_task_bulk_update(
  p_task_ids     uuid[],
  p_updates      jsonb,
  p_actor        uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_tid    uuid;
  v_count  integer := 0;
  v_status text;
BEGIN
  -- Supported fields: priority, assignee_id, department_id, due_at, sla_due_at, status
  FOREACH v_tid IN ARRAY p_task_ids LOOP
    -- Status transition (if requested)
    IF p_updates ? 'status' THEN
      v_status := p_updates->>'status';
      SELECT status INTO v_status FROM op_tasks WHERE id = v_tid AND deleted_at IS NULL;
      IF FOUND AND op_task_valid_transition(v_status, p_updates->>'status') THEN
        PERFORM op_task_transition(v_tid, p_updates->>'status', p_actor, 'bulk update');
      END IF;
    END IF;

    UPDATE op_tasks SET
      priority      = COALESCE((p_updates->>'priority')::integer, priority),
      assignee_id   = CASE WHEN p_updates ? 'assignee_id' THEN (p_updates->>'assignee_id')::uuid ELSE assignee_id END,
      department_id = CASE WHEN p_updates ? 'department_id' THEN (p_updates->>'department_id')::uuid ELSE department_id END,
      due_at        = CASE WHEN p_updates ? 'due_at' THEN (p_updates->>'due_at')::timestamptz ELSE due_at END,
      sla_due_at    = CASE WHEN p_updates ? 'sla_due_at' THEN (p_updates->>'sla_due_at')::timestamptz ELSE sla_due_at END
    WHERE id = v_tid AND deleted_at IS NULL;

    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('updated', v_count);
END;
$$;


-- ── 6. RPC: op_task_snooze ──

CREATE OR REPLACE FUNCTION op_task_snooze(
  p_task_id       uuid,
  p_until         timestamptz,
  p_actor         uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_task op_tasks%ROWTYPE;
BEGIN
  SELECT * INTO v_task FROM op_tasks WHERE id = p_task_id AND deleted_at IS NULL;
  IF v_task IS NULL THEN RAISE EXCEPTION 'task not found'; END IF;

  UPDATE op_tasks SET snoozed_until = p_until WHERE id = p_task_id;

  INSERT INTO op_task_events (task_id, event_type, actor_id, payload)
  VALUES (p_task_id, 'snoozed', p_actor, jsonb_build_object(
    'until', p_until
  ));

  RETURN jsonb_build_object('ok', true, 'snoozed_until', p_until);
END;
$$;


-- ── 7. Register RPCs in bop_objects ──

INSERT INTO bop_objects (object_id, type, module, name, route, status, lifecycle_state)
VALUES
  ('api:op_task_create',       'api', 'OPS', 'Create Task',       NULL, 'active', 'active'),
  ('api:op_task_transition',   'api', 'OPS', 'Task Transition',   NULL, 'active', 'active'),
  ('api:op_task_assign',       'api', 'OPS', 'Assign Task',       NULL, 'active', 'active'),
  ('api:op_task_bulk_update',  'api', 'OPS', 'Bulk Update Tasks', NULL, 'active', 'active'),
  ('api:op_task_snooze',       'api', 'OPS', 'Snooze Task',       NULL, 'active', 'active')
ON CONFLICT (object_id) DO NOTHING;

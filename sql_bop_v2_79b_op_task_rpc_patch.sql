-- ============================================================
-- Patch: Add p_tenant_id to op_task_create RPC
-- The API context doesn't have app.tenant_id session setting,
-- so tenant_id must be passed explicitly.
-- ============================================================

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

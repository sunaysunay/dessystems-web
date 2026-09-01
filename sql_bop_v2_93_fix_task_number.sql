-- Fix: op_task_create duplicate task_number on concurrent inserts
-- Uses a retry loop to handle unique constraint violations
CREATE OR REPLACE FUNCTION op_task_create(
  p_tenant_id        integer,
  p_title            text,
  p_description      text DEFAULT NULL,
  p_priority         integer DEFAULT 2,
  p_status           text DEFAULT 'open',
  p_assignee_id      uuid DEFAULT NULL,
  p_department_id    text DEFAULT NULL,
  p_due_at           timestamptz DEFAULT NULL,
  p_sla_due_at       timestamptz DEFAULT NULL,
  p_ref_object_type  text DEFAULT NULL,
  p_ref_object_id    text DEFAULT NULL,
  p_ref_object_label text DEFAULT NULL,
  p_checklist        jsonb DEFAULT '[]'::jsonb,
  p_parent_task_id   uuid DEFAULT NULL,
  p_actor            uuid DEFAULT NULL,
  p_goal_kr_id       uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_id uuid;
  v_num text;
  v_next int;
  v_row jsonb;
  v_attempts int := 0;
BEGIN
  LOOP
    v_attempts := v_attempts + 1;
    IF v_attempts > 10 THEN
      RAISE EXCEPTION 'Could not generate unique task number after 10 attempts';
    END IF;

    SELECT COALESCE(MAX(NULLIF(REPLACE(task_number,'T-',''),'')::int), 0) + v_attempts
      INTO v_next FROM op_tasks WHERE tenant_id = p_tenant_id;

    v_num := 'T-' || LPAD(v_next::text, 5, '0');

    BEGIN
      INSERT INTO op_tasks (
        tenant_id, task_number, title, description, priority, status,
        assignee_id, department_id, due_at, sla_due_at,
        ref_object_type, ref_object_id, ref_object_label,
        checklist, parent_task_id, created_by, goal_kr_id
      ) VALUES (
        p_tenant_id, v_num, p_title, p_description, p_priority, p_status,
        p_assignee_id, p_department_id, p_due_at, p_sla_due_at,
        p_ref_object_type, p_ref_object_id, p_ref_object_label,
        p_checklist, p_parent_task_id, p_actor, p_goal_kr_id
      ) RETURNING id INTO v_id;

      EXIT; -- success, break out of loop
    EXCEPTION WHEN unique_violation THEN
      -- retry with next number
      CONTINUE;
    END;
  END LOOP;

  INSERT INTO op_task_events (task_id, event_type, actor_id, payload)
  VALUES (v_id, 'created', p_actor, jsonb_build_object('title', p_title, 'priority', p_priority));

  SELECT to_jsonb(t) INTO v_row FROM op_tasks t WHERE t.id = v_id;
  RETURN v_row;
END;
$$;

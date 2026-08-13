-- ============================================================
-- Migration: sql_bop_v2_93_time_tracking.sql
-- T5.3: Add time tracking columns to op_tasks
-- ============================================================

ALTER TABLE op_tasks ADD COLUMN IF NOT EXISTS estimated_hours numeric DEFAULT NULL;
ALTER TABLE op_tasks ADD COLUMN IF NOT EXISTS actual_hours numeric DEFAULT 0;
ALTER TABLE op_tasks ADD COLUMN IF NOT EXISTS timer_started_at timestamptz DEFAULT NULL;

-- RPC: start timer
CREATE OR REPLACE FUNCTION op_task_timer_start(
  p_task_id uuid,
  p_actor uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_row jsonb;
BEGIN
  UPDATE op_tasks SET timer_started_at = now(), updated_at = now()
  WHERE id = p_task_id AND deleted_at IS NULL AND timer_started_at IS NULL;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Task not found or timer already running');
  END IF;

  INSERT INTO op_task_events (task_id, event_type, actor_id, payload)
  VALUES (p_task_id, 'timer_started', p_actor, jsonb_build_object('started_at', now()));

  SELECT to_jsonb(t) INTO v_row FROM op_tasks t WHERE t.id = p_task_id;
  RETURN v_row;
END;
$$;

-- RPC: stop timer (accumulates hours)
CREATE OR REPLACE FUNCTION op_task_timer_stop(
  p_task_id uuid,
  p_actor uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_started timestamptz;
  v_elapsed numeric;
  v_row jsonb;
BEGIN
  SELECT timer_started_at INTO v_started FROM op_tasks WHERE id = p_task_id AND deleted_at IS NULL;
  IF v_started IS NULL THEN
    RETURN jsonb_build_object('error', 'Timer not running');
  END IF;

  v_elapsed := EXTRACT(EPOCH FROM (now() - v_started)) / 3600.0;

  UPDATE op_tasks SET
    actual_hours = COALESCE(actual_hours, 0) + ROUND(v_elapsed::numeric, 2),
    timer_started_at = NULL,
    updated_at = now()
  WHERE id = p_task_id;

  INSERT INTO op_task_events (task_id, event_type, actor_id, payload)
  VALUES (p_task_id, 'timer_stopped', p_actor, jsonb_build_object('elapsed_hours', ROUND(v_elapsed::numeric, 2)));

  SELECT to_jsonb(t) INTO v_row FROM op_tasks t WHERE t.id = p_task_id;
  RETURN v_row;
END;
$$;

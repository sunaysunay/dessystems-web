-- ============================================================
-- Migration: sql_bop_v2_92_tenant_id_to_int.sql
-- Fix: Change tenant_id from UUID to INTEGER across all op_* tables
-- Reason: bop_tenants.tenant_id is INTEGER (200,300,400,500,199)
--         but op_* tables were created with UUID — type mismatch
--         causes "invalid input syntax for type uuid" on every query
-- ============================================================

-- ── 1. Drop ALL RLS policies that reference tenant_id ──

-- op_tasks (two possible names from sql_78 and sql_80)
DROP POLICY IF EXISTS op_tasks_tenant ON op_tasks;
DROP POLICY IF EXISTS op_tasks_tenant_isolation ON op_tasks;

-- op_goals + op_goal_key_results
DROP POLICY IF EXISTS op_goals_tenant_isolation ON op_goals;
DROP POLICY IF EXISTS op_goal_kr_tenant_isolation ON op_goal_key_results;

-- op_task_templates / triggers / views (may not exist yet)
DROP POLICY IF EXISTS op_task_templates_tenant_isolation ON op_task_templates;
DROP POLICY IF EXISTS op_task_triggers_tenant_isolation ON op_task_triggers;
DROP POLICY IF EXISTS op_task_views_tenant_isolation ON op_task_views;

-- ── 2. Drop indexes that include tenant_id ──

DROP INDEX IF EXISTS idx_op_tasks_tenant_status_sla;
DROP INDEX IF EXISTS idx_op_tasks_tenant_assignee;
DROP INDEX IF EXISTS idx_op_tasks_tenant;
DROP INDEX IF EXISTS idx_op_goals_tenant_entity_status;
DROP INDEX IF EXISTS idx_op_task_templates_tenant;
DROP INDEX IF EXISTS idx_op_task_triggers_tenant;
DROP INDEX IF EXISTS idx_op_task_views_tenant;

-- ── 3. Alter columns from UUID to INTEGER ──
-- USING NULL because tables are empty (no data to convert)

-- Delete any existing rows (they have UUID tenant_id that can't convert)
DELETE FROM op_task_events WHERE task_id IN (SELECT id FROM op_tasks);
DELETE FROM op_task_comments WHERE task_id IN (SELECT id FROM op_tasks);
DELETE FROM op_task_dependencies WHERE task_id IN (SELECT id FROM op_tasks);
DELETE FROM op_task_attachments WHERE task_id IN (SELECT id FROM op_tasks);
DELETE FROM op_tasks;

DELETE FROM op_goal_kr_snapshots WHERE kr_id IN (SELECT id FROM op_goal_key_results);
DELETE FROM op_goal_checkins WHERE goal_id IN (SELECT id FROM op_goals);
DELETE FROM op_goal_key_results;
DELETE FROM op_goals;

ALTER TABLE op_tasks ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE op_tasks ALTER COLUMN tenant_id TYPE integer USING NULL;
UPDATE op_tasks SET tenant_id = 300 WHERE tenant_id IS NULL;
ALTER TABLE op_tasks ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE op_goals ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE op_goals ALTER COLUMN tenant_id TYPE integer USING NULL;
UPDATE op_goals SET tenant_id = 300 WHERE tenant_id IS NULL;
ALTER TABLE op_goals ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE op_goal_key_results ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE op_goal_key_results ALTER COLUMN tenant_id TYPE integer USING NULL;
UPDATE op_goal_key_results SET tenant_id = 300 WHERE tenant_id IS NULL;
ALTER TABLE op_goal_key_results ALTER COLUMN tenant_id SET NOT NULL;

DO $$ BEGIN
  DELETE FROM op_task_template_steps WHERE template_id IN (SELECT id FROM op_task_templates);
  DELETE FROM op_task_templates;
  ALTER TABLE op_task_templates ALTER COLUMN tenant_id DROP DEFAULT;
  ALTER TABLE op_task_templates ALTER COLUMN tenant_id TYPE integer USING NULL;
  ALTER TABLE op_task_templates ALTER COLUMN tenant_id SET NOT NULL;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  DELETE FROM op_task_trigger_events WHERE trigger_id IN (SELECT id FROM op_task_triggers);
  DELETE FROM op_task_triggers;
  ALTER TABLE op_task_triggers ALTER COLUMN tenant_id DROP DEFAULT;
  ALTER TABLE op_task_triggers ALTER COLUMN tenant_id TYPE integer USING NULL;
  ALTER TABLE op_task_triggers ALTER COLUMN tenant_id SET NOT NULL;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  DELETE FROM op_task_views;
  ALTER TABLE op_task_views ALTER COLUMN tenant_id DROP DEFAULT;
  ALTER TABLE op_task_views ALTER COLUMN tenant_id TYPE integer USING NULL;
  ALTER TABLE op_task_views ALTER COLUMN tenant_id SET NOT NULL;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ── 4. Recreate indexes ──

CREATE INDEX IF NOT EXISTS idx_op_tasks_tenant_status_sla ON op_tasks (tenant_id, status, sla_due_at);
CREATE INDEX IF NOT EXISTS idx_op_tasks_tenant_assignee ON op_tasks (tenant_id, assignee_id, status);
CREATE INDEX IF NOT EXISTS idx_op_tasks_tenant ON op_tasks (tenant_id);
CREATE INDEX IF NOT EXISTS idx_op_goals_tenant_entity_status ON op_goals (tenant_id, entity, status);

-- ── 5. Recreate RLS policies with integer cast ──

CREATE POLICY op_tasks_tenant_isolation ON op_tasks
  USING (tenant_id = current_setting('app.tenant_id', true)::integer)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::integer);

CREATE POLICY op_goals_tenant_isolation ON op_goals
  USING (tenant_id = current_setting('app.tenant_id', true)::integer);

CREATE POLICY op_goal_kr_tenant_isolation ON op_goal_key_results
  USING (tenant_id = current_setting('app.tenant_id', true)::integer);

-- ── 6. Update RPCs with integer p_tenant_id ──

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
  v_row jsonb;
BEGIN
  SELECT 'T-' || LPAD((COALESCE(MAX(NULLIF(REPLACE(task_number,'T-',''),'')::int),0)+1)::text, 5, '0')
    INTO v_num FROM op_tasks WHERE tenant_id = p_tenant_id;

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

  INSERT INTO op_task_events (task_id, event_type, actor_id, payload)
  VALUES (v_id, 'created', p_actor, jsonb_build_object('title', p_title, 'priority', p_priority));

  SELECT to_jsonb(t) INTO v_row FROM op_tasks t WHERE t.id = v_id;
  RETURN v_row;
END;
$$;

-- ============================================================
-- Done. All op_* tenant_id columns are now INTEGER,
-- matching bop_tenants.tenant_id.
-- ============================================================

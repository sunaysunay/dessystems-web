-- ============================================================
-- BOP V2 — Phase 86: Task Templates & Triggers
-- T3.1: op_task_templates + op_task_template_steps
-- T3.2: op_task_triggers + op_task_trigger_events
-- T3.5: Seed 5 automation templates
-- ============================================================

-- ── T3.1a  op_task_templates ───────────────────────────────
CREATE TABLE IF NOT EXISTS op_task_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  name            TEXT NOT NULL,
  name_i18n       JSONB DEFAULT '{}'::jsonb,
  description     TEXT,
  is_chain        BOOLEAN NOT NULL DEFAULT false,
  default_priority INTEGER NOT NULL DEFAULT 2 CHECK (default_priority BETWEEN 1 AND 4),
  category        TEXT,
  ref_object_type TEXT,
  created_by      UUID,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_op_task_templates_tenant
  ON op_task_templates (tenant_id) WHERE deleted_at IS NULL;

ALTER TABLE op_task_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS op_task_templates_tenant_isolation ON op_task_templates;
CREATE POLICY op_task_templates_tenant_isolation ON op_task_templates
  USING (tenant_id = (current_setting('app.tenant_id', true))::uuid)
  WITH CHECK (tenant_id = (current_setting('app.tenant_id', true))::uuid);

-- ── T3.1b  op_task_template_steps ──────────────────────────
CREATE TABLE IF NOT EXISTS op_task_template_steps (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id      UUID NOT NULL REFERENCES op_task_templates(id) ON DELETE CASCADE,
  step_order       INTEGER NOT NULL DEFAULT 1,
  title            TEXT NOT NULL,
  title_i18n       JSONB DEFAULT '{}'::jsonb,
  description      TEXT,
  due_offset_hours INTEGER DEFAULT 0,
  sla_offset_hours INTEGER,
  default_priority INTEGER DEFAULT 2 CHECK (default_priority BETWEEN 1 AND 4),
  depends_on_prev  BOOLEAN NOT NULL DEFAULT false,
  department_id    UUID,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (template_id, step_order)
);

CREATE INDEX IF NOT EXISTS idx_op_task_template_steps_template
  ON op_task_template_steps (template_id);

ALTER TABLE op_task_template_steps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS op_task_template_steps_via_parent ON op_task_template_steps;
CREATE POLICY op_task_template_steps_via_parent ON op_task_template_steps
  USING (template_id IN (SELECT id FROM op_task_templates))
  WITH CHECK (template_id IN (SELECT id FROM op_task_templates));

-- ── T3.2a  op_task_triggers ────────────────────────────────
CREATE TABLE IF NOT EXISTS op_task_triggers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  event_type      TEXT NOT NULL,
  template_id     UUID NOT NULL REFERENCES op_task_templates(id),
  condition_jsonb JSONB DEFAULT '{}'::jsonb,
  enabled         BOOLEAN NOT NULL DEFAULT true,
  cooldown_hours  INTEGER DEFAULT 0,
  description     TEXT,
  created_by      UUID,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, event_type, template_id)
);

CREATE INDEX IF NOT EXISTS idx_op_task_triggers_tenant_event
  ON op_task_triggers (tenant_id, event_type) WHERE enabled = true AND deleted_at IS NULL;

ALTER TABLE op_task_triggers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS op_task_triggers_tenant_isolation ON op_task_triggers;
CREATE POLICY op_task_triggers_tenant_isolation ON op_task_triggers
  USING (tenant_id = (current_setting('app.tenant_id', true))::uuid)
  WITH CHECK (tenant_id = (current_setting('app.tenant_id', true))::uuid);

-- ── T3.2b  op_task_trigger_events (execution log) ──────────
CREATE TABLE IF NOT EXISTS op_task_trigger_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_id        UUID NOT NULL REFERENCES op_task_triggers(id) ON DELETE CASCADE,
  source_object_type TEXT NOT NULL,
  source_object_id  UUID NOT NULL,
  tasks_created     UUID[] DEFAULT '{}',
  idempotency_key   TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (trigger_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_op_task_trigger_events_trigger
  ON op_task_trigger_events (trigger_id);

ALTER TABLE op_task_trigger_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS op_task_trigger_events_via_parent ON op_task_trigger_events;
CREATE POLICY op_task_trigger_events_via_parent ON op_task_trigger_events
  USING (trigger_id IN (SELECT id FROM op_task_triggers))
  WITH CHECK (trigger_id IN (SELECT id FROM op_task_triggers));

-- ── T3.6  op_task_views (saved filters) ────────────────────
CREATE TABLE IF NOT EXISTS op_task_views (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  name            TEXT NOT NULL,
  filter_config   JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_config     JSONB DEFAULT '{}'::jsonb,
  owner_id        UUID,
  is_pinned       BOOLEAN NOT NULL DEFAULT false,
  sort_order      INTEGER DEFAULT 0,
  icon            TEXT DEFAULT 'filter',
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_op_task_views_tenant
  ON op_task_views (tenant_id) WHERE deleted_at IS NULL;

ALTER TABLE op_task_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS op_task_views_tenant_isolation ON op_task_views;
CREATE POLICY op_task_views_tenant_isolation ON op_task_views
  USING (tenant_id = (current_setting('app.tenant_id', true))::uuid)
  WITH CHECK (tenant_id = (current_setting('app.tenant_id', true))::uuid);

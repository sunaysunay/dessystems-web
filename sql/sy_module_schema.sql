-- ============================================================
-- SY Module — Implementation Cockpit
-- Tables: sy_programs, sy_phases, sy_tasks, sy_deliverables,
--         sy_task_events, sy_task_deps, sy_templates, sy_template_items
-- Run on des-dev first, verify, promote via des-promote.sh
-- ============================================================

-- 1. Programs
CREATE TABLE IF NOT EXISTS sy_programs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code            text NOT NULL UNIQUE,
  title           jsonb NOT NULL DEFAULT '{}',
  owner           text,
  status          text NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','active','paused','done','cancelled')),
  spec_doc_path   text,
  total_fte_days  numeric(6,1),
  started_at      timestamptz,
  target_date     date,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- 2. Phases
CREATE TABLE IF NOT EXISTS sy_phases (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id      uuid NOT NULL REFERENCES sy_programs(id) ON DELETE CASCADE,
  seq             smallint NOT NULL,
  code            text,
  title           jsonb NOT NULL DEFAULT '{}',
  fte_days        numeric(5,1),
  gate_criteria   jsonb DEFAULT '[]',
  status          text NOT NULL DEFAULT 'not_started'
                    CHECK (status IN ('not_started','in_progress','done','blocked')),
  go_signal       text,
  started_at      timestamptz,
  completed_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (program_id, seq)
);

-- 3. Tasks
CREATE TABLE IF NOT EXISTS sy_tasks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id        uuid NOT NULL REFERENCES sy_phases(id) ON DELETE CASCADE,
  seq             smallint NOT NULL DEFAULT 0,
  code            text,
  title           jsonb NOT NULL DEFAULT '{}',
  task_type       text NOT NULL DEFAULT 'general'
                    CHECK (task_type IN ('screen','api','schema','integration','compliance','infra','docs','general')),
  blocked_reason  text,
  blocked_since   timestamptz,
  estimate_h      numeric(5,1),
  ref_spec_section text,
  impl_notes      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
-- status is DERIVED: not_started (0 deliverables verified), in_progress (>0 but not all),
-- verified (all verified), blocked (blocked_reason IS NOT NULL). Never stored.

-- 4. Deliverables — the important table
CREATE TABLE IF NOT EXISTS sy_deliverables (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         uuid NOT NULL REFERENCES sy_tasks(id) ON DELETE CASCADE,
  kind            text NOT NULL
                    CHECK (kind IN (
                      'SCREEN','MENU_NODE','DB_TABLE','RLS_POLICY',
                      'API_ROUTE','PERMISSION','I18N_KEY','HELP_DOC',
                      'EMAIL_TEMPLATE','TELEGRAM_ALERT','TEST',
                      'MIGRATION','SMOKE_CHECK','CUSTOM'
                    )),
  ref             text NOT NULL,
  verify_mode     text NOT NULL DEFAULT 'auto'
                    CHECK (verify_mode IN ('auto','manual')),
  is_verified     boolean NOT NULL DEFAULT false,
  verified_at     timestamptz,
  verified_by     text,
  verify_evidence jsonb,
  verify_error    text,
  sort_order      smallint NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- 5. Task events — append-only audit log
CREATE TABLE IF NOT EXISTS sy_task_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         uuid NOT NULL REFERENCES sy_tasks(id) ON DELETE CASCADE,
  actor_type      text NOT NULL DEFAULT 'human'
                    CHECK (actor_type IN ('human','agent','system')),
  actor           text,
  event           text NOT NULL,
  payload         jsonb,
  commit_sha      text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- 6. Task dependencies
CREATE TABLE IF NOT EXISTS sy_task_deps (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id      uuid NOT NULL REFERENCES sy_tasks(id) ON DELETE CASCADE,
  blocked_id      uuid NOT NULL REFERENCES sy_tasks(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id)
);

-- 7. Templates (reusable DoD sets)
CREATE TABLE IF NOT EXISTS sy_templates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code            text NOT NULL UNIQUE,
  title           jsonb NOT NULL DEFAULT '{}',
  task_type       text NOT NULL,
  version         smallint NOT NULL DEFAULT 1,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- 8. Template items
CREATE TABLE IF NOT EXISTS sy_template_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id     uuid NOT NULL REFERENCES sy_templates(id) ON DELETE CASCADE,
  kind            text NOT NULL,
  ref_pattern     text NOT NULL,
  verify_mode     text NOT NULL DEFAULT 'auto',
  is_optional     boolean NOT NULL DEFAULT false,
  sort_order      smallint NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- 9. Extend bop_screens — SKIPPED here due to DDL protection.
--    Run sy_module_patch_bop_screens.sql separately.

-- 10. Indexes
CREATE INDEX IF NOT EXISTS idx_sy_phases_program     ON sy_phases(program_id);
CREATE INDEX IF NOT EXISTS idx_sy_tasks_phase        ON sy_tasks(phase_id);
CREATE INDEX IF NOT EXISTS idx_sy_deliverables_task  ON sy_deliverables(task_id);
CREATE INDEX IF NOT EXISTS idx_sy_deliverables_kind  ON sy_deliverables(kind);
CREATE INDEX IF NOT EXISTS idx_sy_task_events_task   ON sy_task_events(task_id);
CREATE INDEX IF NOT EXISTS idx_sy_task_deps_blocker  ON sy_task_deps(blocker_id);
CREATE INDEX IF NOT EXISTS idx_sy_task_deps_blocked  ON sy_task_deps(blocked_id);
CREATE INDEX IF NOT EXISTS idx_sy_template_items_tpl ON sy_template_items(template_id);

-- 11. Updated_at triggers (reuse if exists, create if not)
CREATE OR REPLACE FUNCTION trg_set_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'sy_programs','sy_phases','sy_tasks','sy_deliverables',
    'sy_templates'
  ] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_' || t) THEN
      EXECUTE format(
        'CREATE TRIGGER %I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at()',
        'set_updated_at_' || t, t
      );
    END IF;
  END LOOP;
END $$;

-- 12. Derived progress views
CREATE OR REPLACE VIEW sy_task_progress AS
SELECT
  t.id AS task_id,
  t.phase_id,
  t.title,
  t.task_type,
  t.blocked_reason,
  count(d.id)                              AS total_deliverables,
  count(d.id) FILTER (WHERE d.is_verified) AS verified_deliverables,
  CASE
    WHEN t.blocked_reason IS NOT NULL THEN 'blocked'
    WHEN count(d.id) = 0 THEN 'not_started'
    WHEN count(d.id) FILTER (WHERE d.is_verified) = count(d.id) THEN 'verified'
    WHEN count(d.id) FILTER (WHERE d.is_verified) > 0 THEN 'in_progress'
    ELSE 'not_started'
  END AS derived_status,
  CASE
    WHEN count(d.id) = 0 THEN 0
    ELSE round(100.0 * count(d.id) FILTER (WHERE d.is_verified) / count(d.id))
  END AS pct
FROM sy_tasks t
LEFT JOIN sy_deliverables d ON d.task_id = t.id
GROUP BY t.id, t.phase_id, t.title, t.task_type, t.blocked_reason;

CREATE OR REPLACE VIEW sy_phase_progress AS
SELECT
  p.id AS phase_id,
  p.program_id,
  p.seq,
  p.title,
  p.status,
  p.fte_days,
  p.go_signal,
  count(tp.task_id)                                    AS total_tasks,
  count(tp.task_id) FILTER (WHERE tp.derived_status = 'verified') AS verified_tasks,
  coalesce(sum(tp.total_deliverables), 0)              AS total_deliverables,
  coalesce(sum(tp.verified_deliverables), 0)           AS verified_deliverables,
  CASE
    WHEN coalesce(sum(tp.total_deliverables), 0) = 0 THEN 0
    ELSE round(100.0 * coalesce(sum(tp.verified_deliverables), 0)
               / nullif(sum(tp.total_deliverables), 0))
  END AS pct
FROM sy_phases p
LEFT JOIN sy_task_progress tp ON tp.phase_id = p.id
GROUP BY p.id, p.program_id, p.seq, p.title, p.status, p.fte_days, p.go_signal;

CREATE OR REPLACE VIEW sy_program_progress AS
SELECT
  pr.id AS program_id,
  pr.code,
  pr.title,
  pr.owner,
  pr.status,
  pr.target_date,
  count(DISTINCT pp.phase_id)                          AS total_phases,
  count(DISTINCT pp.phase_id) FILTER (WHERE pp.pct = 100) AS completed_phases,
  coalesce(sum(pp.total_tasks), 0)                     AS total_tasks,
  coalesce(sum(pp.verified_tasks), 0)                  AS verified_tasks,
  coalesce(sum(pp.total_deliverables), 0)              AS total_deliverables,
  coalesce(sum(pp.verified_deliverables), 0)           AS verified_deliverables,
  CASE
    WHEN coalesce(sum(pp.total_deliverables), 0) = 0 THEN 0
    ELSE round(100.0 * coalesce(sum(pp.verified_deliverables), 0)
               / nullif(sum(pp.total_deliverables), 0))
  END AS pct
FROM sy_programs pr
LEFT JOIN sy_phase_progress pp ON pp.program_id = pr.id
GROUP BY pr.id, pr.code, pr.title, pr.owner, pr.status, pr.target_date;

-- 13. Seed standard templates
INSERT INTO sy_templates (code, title, task_type) VALUES
  ('SCREEN_STANDARD', '{"en":"Standard Screen","nl":"Standaard Scherm","de":"Standard-Bildschirm","fr":"Écran standard","tr":"Standart Ekran"}', 'screen'),
  ('API_ONLY',        '{"en":"API Route","nl":"API Route","de":"API-Route","fr":"Route API","tr":"API Rotası"}', 'api'),
  ('SCHEMA_MIGRATION','{"en":"Schema Migration","nl":"Schema Migratie","de":"Schema-Migration","fr":"Migration de schéma","tr":"Şema Migrasyonu"}', 'schema'),
  ('INTEGRATION',     '{"en":"Integration","nl":"Integratie","de":"Integration","fr":"Intégration","tr":"Entegrasyon"}', 'integration'),
  ('DOCS_ONLY',       '{"en":"Documentation","nl":"Documentatie","de":"Dokumentation","fr":"Documentation","tr":"Dokümantasyon"}', 'docs')
ON CONFLICT (code) DO NOTHING;

-- Seed SCREEN_STANDARD template items
INSERT INTO sy_template_items (template_id, kind, ref_pattern, verify_mode, sort_order)
SELECT t.id, v.kind, v.ref_pattern, v.verify_mode, v.sort_order
FROM sy_templates t,
(VALUES
  ('SCREEN',     '{tcode} in bop_objects',                'auto',   1),
  ('MENU_NODE',  'shell nav node for {tcode}',            'auto',   2),
  ('PERMISSION', 'bop.{domain}.{resource}.read',          'auto',   3),
  ('PERMISSION', 'bop.{domain}.{resource}.update',        'auto',   4),
  ('I18N_KEY',   '{domain}.{screen}.* × 5 locales',       'auto',   5),
  ('HELP_DOC',   'bop_documentation for {tcode}',         'auto',   6),
  ('API_ROUTE',  '/api/bop/{domain}/{resource}',          'auto',   7),
  ('SMOKE_CHECK','manual click-through verification',     'manual', 8)
) AS v(kind, ref_pattern, verify_mode, sort_order)
WHERE t.code = 'SCREEN_STANDARD'
ON CONFLICT DO NOTHING;

-- Seed API_ONLY template items
INSERT INTO sy_template_items (template_id, kind, ref_pattern, verify_mode, sort_order)
SELECT t.id, v.kind, v.ref_pattern, v.verify_mode, v.sort_order
FROM sy_templates t,
(VALUES
  ('API_ROUTE',  '/api/bop/{domain}/{resource}',          'auto',   1),
  ('PERMISSION', 'bop.{domain}.{resource}.read',          'auto',   2),
  ('PERMISSION', 'bop.{domain}.{resource}.update',        'auto',   3),
  ('TEST',       '{path}.test.ts passing',                'auto',   4)
) AS v(kind, ref_pattern, verify_mode, sort_order)
WHERE t.code = 'API_ONLY'
ON CONFLICT DO NOTHING;

-- Seed SCHEMA_MIGRATION template items
INSERT INTO sy_template_items (template_id, kind, ref_pattern, verify_mode, sort_order)
SELECT t.id, v.kind, v.ref_pattern, v.verify_mode, v.sort_order
FROM sy_templates t,
(VALUES
  ('MIGRATION',  '{migration_file}',                      'auto',   1),
  ('DB_TABLE',   '{table} in information_schema',         'auto',   2),
  ('RLS_POLICY', 'policies on {table}',                   'auto',   3)
) AS v(kind, ref_pattern, verify_mode, sort_order)
WHERE t.code = 'SCHEMA_MIGRATION'
ON CONFLICT DO NOTHING;

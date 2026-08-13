-- Migration: qa_scores + SY042 registration (bop-inspect Phase 4)
-- Run once in Supabase SQL editor.

-- ── qa_scores table ────────────────────────────────────────────────────────
create table if not exists qa_scores (
  id                      uuid primary key default gen_random_uuid(),
  commit_hash             text,
  run_at                  timestamptz default now(),
  -- Layer 1
  tsc_errors              int,
  eslint_errors           int,
  knip_findings           int,
  duplication_pct         numeric,
  audit_high              int,
  -- Layer 2
  db_checks_pass          int,
  db_checks_fail          int,
  db_checks_warn          int,
  -- Layer 3
  ai_risk_score           int,
  ai_findings_critical    int,
  ai_findings_high        int,
  -- Composite
  overall_score           int generated always as (
    greatest(0, 100
      - coalesce(ai_risk_score, 0) / 2
      - coalesce(db_checks_fail, 0) * 5
      - coalesce(db_checks_warn, 0) * 2
      - least(coalesce(tsc_errors, 0), 50)
      - least(coalesce(eslint_errors, 0) / 10, 20)
    )
  ) stored,
  triggered_by            text default 'cron',
  notes                   text
);

alter table qa_scores enable row level security;
drop policy if exists p_qa_scores_service on qa_scores;
create policy p_qa_scores_service on qa_scores for all to service_role using (true) with check (true);
drop policy if exists p_qa_scores_admin on qa_scores;
create policy p_qa_scores_admin on qa_scores for select to authenticated
  using ((auth.jwt()->'app_metadata'->>'bop_role') in ('super_admin','platform_admin'));

-- ── SY042 registration ────────────────────────────────────────────────────
insert into bop_screens (screen_id, title, module, route, func_type, sequence, status, description, lifecycle_state) values
  ('SY042', 'Quality Inspector', 'SYS', '/console/sys/quality', 'overview', 42, 'active',
   'Code quality dashboard — Phase 1 gate scores, DB invariant status, AI risk trends', 'dev')
on conflict (screen_id) do update set
  title = excluded.title, route = excluded.route, description = excluded.description;

insert into bop_objects (object_id, type, module, name, route, status, lifecycle_state) values
  ('screen:SY042',           'screen', 'SYS', 'Quality Inspector',    '/console/sys/quality',   'active', 'active'),
  ('table:qa_scores',        'table',  'SYS', 'QA Scores',            null,                     'active', 'active'),
  ('api:sys/quality:GET',    'api',    'SYS', 'GET Quality Scores',   '/api/bop/sys/quality',   'active', 'active'),
  ('api:sys/quality/checks:GET', 'api','SYS', 'GET QA Checks',        '/api/bop/sys/quality/checks', 'active', 'active')
on conflict (object_id) do nothing;

insert into bop_screen_roles (screen_id, role, can_read, can_write, can_delete) values
  ('SY042', 'super_admin',    true, false, false),
  ('SY042', 'platform_admin', true, false, false)
on conflict do nothing;

insert into bop_dependencies (from_id, to_id, dep_type) values
  ('screen:SY042', 'table:qa_scores',     'reads'),
  ('screen:SY042', 'table:qa_checks',     'reads'),
  ('screen:SY042', 'table:qa_check_runs', 'reads')
on conflict do nothing;

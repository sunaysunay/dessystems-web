-- SY051 Implementation Cockpit — documentation upserts
-- Run with: bash /root/scripts/des-sql.sh --commit < scripts/_sy051_docs_upsert.sql

BEGIN;

-- SY051 overview
INSERT INTO bop_documentation (target_type, target_id, doc_type, seq, locale, title, body_md, status, owner, version, module, related_screens)
VALUES ('screen', 'SY051', 'overview', 0, 'en',
  'Implementation Cockpit — Overview',
  E'**Implementation Cockpit** (`SY051`) tracks the rollout of implementation programs through a hierarchy of Programs → Phases → Tasks → Deliverables. Route: `/console/sys/impl`.\n\n**Two views:**\n- **All Implementations** — Filterable/sortable table of programs with columns: Code, Title, Status, Owner, Progress %, Target, Created, Updated, Completed. Multi-select status filter, owner filter, text search, date-range filter.\n- **Program Detail** — Two tabs: **Tree View** (hierarchical drill-down through phases, tasks, deliverables) and **Dashboard** (KPI summary cards + phase progress bars).\n\n**Key features:**\n- CRUD for programs, phases, tasks, and deliverables (side-drawer forms)\n- Auto-verification of deliverables (8 of 14 kinds implemented)\n- OP001 task linking and OP002 goal linking via search pickers\n- Document management: AI Specs, Impl Plans, User Manuals, Test Scenarios (Supabase Storage, 10MB/program)\n- Status derived from deliverable verification state (never stored directly)\n- Deep linking via `?program=<id>` query parameter\n\n**Nav:** System > Development group',
  'active', 'system', 1, 'SYS', ARRAY['SY051'])
ON CONFLICT (target_type, target_id, doc_type, seq, locale)
DO UPDATE SET title = EXCLUDED.title, body_md = EXCLUDED.body_md, status = 'active', owner = 'system', version = bop_documentation.version + 1, module = EXCLUDED.module, related_screens = EXCLUDED.related_screens, updated_at = now();

-- SY051 reference: data model & API
INSERT INTO bop_documentation (target_type, target_id, doc_type, seq, locale, title, body_md, status, owner, version, module, related_screens)
VALUES ('screen', 'SY051', 'reference', 1, 'en',
  'Data model & API',
  E'**Tables (5):**\n- `sy_programs` — top-level programs (code, owner, status, target_date, scope)\n- `sy_phases` — sequenced stages within a program\n- `sy_tasks` — work items (types: screen, api, schema, integration, compliance, infra, docs, general)\n- `sy_deliverables` — concrete artifacts per task (14 kinds: SCREEN, MENU_NODE, DB_TABLE, RLS_POLICY, API_ROUTE, PERMISSION, I18N_KEY, HELP_DOC, SOURCE_FILE, EMAIL_TEMPLATE, TELEGRAM_ALERT, TEST, MIGRATION, SMOKE_CHECK, CUSTOM)\n- `sy_task_events` — append-only audit log\n\n**Views (3):** `sy_task_progress`, `sy_phase_progress`, `sy_program_progress` — progress is fully derived from deliverable verification state.\n\n**API routes:**\n- `GET /api/bop/sys/impl?scope=programs|phases|tasks|deliverables|events|templates`\n- `POST /api/bop/sys/impl` — 20+ actions (upsert_program, upsert_phase, upsert_task, upsert_deliverable, update_program_status, verify, link_op_task, link_op_goal, etc.)\n- `POST /api/bop/sys/impl/verify` — auto-verification engine (8 strategies)\n- `/api/bop/sys/impl/docs` — document upload/download/preview\n\n**Verify strategies implemented:** SCREEN (bop_screens), MENU_NODE (nav_visible), DB_TABLE (information_schema), API_ROUTE (localhost:4401 probe), PERMISSION (bop_screen_roles), I18N_KEY (en.json filesystem), HELP_DOC (bop_documentation), SOURCE_FILE (filesystem existence)',
  'active', 'system', 1, 'SYS', ARRAY['SY051'])
ON CONFLICT (target_type, target_id, doc_type, seq, locale)
DO UPDATE SET title = EXCLUDED.title, body_md = EXCLUDED.body_md, status = 'active', owner = 'system', version = bop_documentation.version + 1, module = EXCLUDED.module, related_screens = EXCLUDED.related_screens, updated_at = now();

-- SY051 reference: known gaps
INSERT INTO bop_documentation (target_type, target_id, doc_type, seq, locale, title, body_md, status, owner, version, module, related_screens)
VALUES ('screen', 'SY051', 'reference', 2, 'en',
  'Known gaps & roadmap',
  E'**Unimplemented verify kinds (6):** EMAIL_TEMPLATE, TELEGRAM_ALERT, TEST, MIGRATION, SMOKE_CHECK, CUSTOM — fall through to auto-verify not implemented.\n\n**Template apply UI:** API exists (`scope=templates`), 5 templates seeded, but no UI to browse or apply templates to tasks. Needed for OP002 bridge (Phase P5).\n\n**Task dependencies:** `sy_task_deps` table and indexes exist, no API endpoint or UI.\n\n**No shared types:** All TypeScript interfaces (Program, Phase, Task, Deliverable) are inline in page.tsx. Blocks OP002 bridge import.\n\n**No extracted components:** Bar, Drawer, OpTaskPicker, OpGoalPicker all inline in 1212-line page.tsx.\n\n**Missing `goal_kr_id`:** Only `op_goal_id` (goal-level link) exists on sy_programs. Cannot link to specific Key Results.\n\n**Verify probe hardcoded:** API_ROUTE verifier fetches `localhost:4401` — no config for other environments.',
  'active', 'system', 1, 'SYS', ARRAY['SY051'])
ON CONFLICT (target_type, target_id, doc_type, seq, locale)
DO UPDATE SET title = EXCLUDED.title, body_md = EXCLUDED.body_md, status = 'active', owner = 'system', version = bop_documentation.version + 1, module = EXCLUDED.module, related_screens = EXCLUDED.related_screens, updated_at = now();

-- SY051 FAQ: how progress works
INSERT INTO bop_documentation (target_type, target_id, doc_type, seq, locale, title, body_md, status, owner, version, module, related_screens)
VALUES ('screen', 'SY051', 'faq', 0, 'en',
  'How does program progress work?',
  E'Progress is **fully derived** — never stored directly. The chain:\n\n1. **Deliverables** have `is_verified` (boolean) set by auto-verify or manual confirmation\n2. **Task status** is derived in `sy_task_progress` view: not_started (0 verified), in_progress (some verified), verified (all verified), blocked (blocked_reason set)\n3. **Phase progress** rolls up in `sy_phase_progress` view: total/verified tasks and deliverables, percentage\n4. **Program progress** rolls up in `sy_program_progress` view: total/completed phases, tasks, deliverables, percentage\n\nThe dashboard tab shows these roll-ups as KPI cards and phase progress bars. Clicking Verify All on a program runs auto-verification on every deliverable and refreshes the derived state.',
  'active', 'system', 1, 'SYS', ARRAY['SY051'])
ON CONFLICT (target_type, target_id, doc_type, seq, locale)
DO UPDATE SET title = EXCLUDED.title, body_md = EXCLUDED.body_md, status = 'active', owner = 'system', version = bop_documentation.version + 1, module = EXCLUDED.module, related_screens = EXCLUDED.related_screens, updated_at = now();

COMMIT;

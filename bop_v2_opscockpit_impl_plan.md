# BOP V2 — OP001 + OP002 Implementation Plan

**Version:** 2.2 · 2026-08-10  
**Scope:** Operations Cockpit (OP001 Tasks) + Strategy Cockpit (OP002 Goals & OKRs)  
**Tables:** 14 new (6 with tenant_id, 9 without) · ~15 PBAC permissions · 3 cron workers  
**Status:** OPS-P1 ✅ · STR-P1 ✅ · OPS-P2 ✅ · STR-P2 ✅ · OPS-P3 ✅ · STR-P3 ✅

---

## Design Decision

All tables are built new from scratch with `op_` prefix. The existing DesCampers `tasks`, `objectives`, and `key_results` tables are **not reused, altered, or migrated**. DC screens continue to run independently. The DC codebase serves as a UI pattern reference only.

---

## 1. Current State

| System | Screen | ID | State | Lines |
|--------|--------|----|-------|-------|
| BOP Console | Tasks | OP001 | Stub — static mock table | 25 |
| BOP Console | Goals & OKRs | OP002 | Placeholder — "coming soon" text | 14 |
| DesCampers Admin | Task Manager | DC-TASKS | Live — full CRUD, periodic, reminders | 721 |
| DesCampers Admin | Goals & Objectives | DC-GOALS | Live — hierarchy, progress, widget | 792 |

---

## 2. DesCampers Reference Evaluation

**Role:** UI pattern reference only. No data migration. No table reuse.

### Reusable UI Patterns from DC

| Pattern | Lines | BOP Application |
|---------|-------|-----------------|
| Status tabs with count badges | ~40 | Adapt for 7-status task machine + 4-status goals |
| Sticky side-panel form | ~130 | BOP uses drawers + full pages for complex forms |
| Reminders banner (overdue/today/tomorrow) | ~50 | Evolve into 8-card stat strip with SLA urgency bands |
| Click-to-cycle status icon | ~15 | Adapt for dependency-aware transitions |
| Expandable rows with nested KRs | ~80 | Extend for 3-level Goal → Objective → KR tree |
| MiniProgress color-coded bar | ~8 | Reuse for KR + goal + objective roll-up display |
| Periodic recurrence UI | ~60 | Reference for recurrence form (BOP builds RRULE in P3) |
| Record linking form (type + id + label) | ~20 | Adapt for BOP's wider polymorphic ref_object scope |
| Goals dashboard widget | 69 | Starting point for exec dashboard layout concepts |

### What DC Lacks (BOP builds fresh)

Dependencies, audit trail, comments, attachments, checklist, SLA engine, automation triggers, templates, kanban/calendar, entity scoping, metrics catalog, nightly compute, exec dashboard, PBAC, multi-tenant, i18n.

---

## 3. Gap Analysis

### OP001 — Operations Cockpit

| Component | Plan Spec | Current | Work |
|-----------|-----------|---------|------|
| `op_tasks` | 30+ cols: polymorphic refs, SLA, checklist, recurrence, assignee, 7 statuses | Does not exist | Full build |
| `op_task_dependencies` | Blocker graph, cycle prevention | Does not exist | Full build |
| `op_task_events` | 12 event types, audit trail | Does not exist | Full build |
| `op_task_comments` | Threaded, soft-delete | Does not exist | Full build |
| `op_task_attachments` | Supabase Storage | Does not exist | Full build |
| `op_task_templates` | Reusable chains | Does not exist | Phase 2 |
| `op_task_template_steps` | Ordered steps with offsets | Does not exist | Phase 2 |
| `op_task_triggers` | Event → task creation | Does not exist | Phase 2 |
| `op_task_views` | Saved filters / smart queues | Does not exist | Phase 2 |
| Status machine | 7 statuses, dependency-aware | None | Full build |
| RPCs | task_create, task_transition, task_assign, task_bulk_update, task_snooze | None | Full build |
| API routes | CRUD + cockpit-summary at `/api/bop/ops/tasks` | No directory | Full build |
| Cockpit UI | 8-card stat strip, banded work queue, multi-view | 25-line stub | Full build |
| Task detail | Drawer + page: checklist, deps, comments, attachments, timeline | None | Full build |
| SLA engine | 10-min cron, escalation levels, Telegram | None | Full build |
| Automation | fireTaskTriggers() wired into business flows | None | Phase 2 |
| Analytics | Completion/week, SLA compliance, workload | None | Phase 3 |
| PBAC | 8 permissions | None | Full build |

### OP002 — Strategy Cockpit

| Component | Plan Spec | Current | Work |
|-----------|-----------|---------|------|
| `op_goals` | Hierarchical, entity-scoped, period-bound, health | Does not exist | Full build |
| `op_goal_key_results` | Weighted KRs, 5 metric types, direction, baseline/target/current | Does not exist | Full build |
| `op_goal_kr_snapshots` | Daily trend for sparklines | Does not exist | Full build |
| `op_goal_metrics_catalog` | Whitelisted metric codes | Does not exist | Phase 2 |
| `op_goal_checkins` | Confidence + blockers + notes | Does not exist | Full build |
| Goal hierarchy | Goal → Objective → KR (3-level) | None | Full build |
| Entity scoping | des_mobil/campers/shop/systems/group | None | Full build |
| Health system | on_track/at_risk/off_track from pace | None | Full build |
| Bridge FK | op_tasks.goal_kr_id → op_goal_key_results | None | Phase 2 |
| Metric service | computeMetric() from listings, invoices, inquiries | None | Phase 2 |
| Nightly job | Auto-compute KRs + snapshots + health | None | Phase 2 |
| Exec dashboard | Vision banner, progress rings, entity lanes, trend charts | 14-line placeholder | Full build |
| Goal tree | 3-level expandable with health dots, roll-up % | None | Full build |
| Goal detail | KR sparklines, linked tasks, check-in history, budget | None | Full build |
| PBAC | 7 permissions | None | Full build |

---

## 4. Build Phases & Task Breakdown

**Build order:** OPS-P1 → STR-P1 → OPS-P2 → STR-P2 → OPS-P3 → STR-P3

---

### Phase OPS-P1 — Operations Cockpit Core Engine (~12-15 sessions)

| P | Task | Type | Deliverables | Est |
|---|------|------|-------------|-----|
| P1 | **T1.1** Create `op_tasks` table + indexes — 30+ columns. **tenant_id UUID NOT NULL FK.** Polymorphic ref_object_type/ref_object_id. Priority 1-4. 7 statuses (ENUM). assignee_id, department_id, sla_due_at, escalation_level (0-3), checklist JSONB, parent_task_id, is_recurring, rrule, created_by. 4 indexes: (tenant_id, status, sla_due_at), (tenant_id, assignee_id, status), (ref_object_type, ref_object_id), (tenant_id). RLS: tenant_id = current_setting('app.tenant_id'). | schema | DB_TABLE, MIGRATION, RLS_POLICY, 4 indexes | 4h |
| P1 | **T1.2** Create `op_task_dependencies` — task_id FK, depends_on_task_id FK. CHECK: no self-ref. UNIQUE. Cycle detection in RPC. No tenant_id (child table). | schema | DB_TABLE, MIGRATION | 1h |
| P1 | **T1.3** Create `op_task_events` — 12 event types: created, status_changed, assigned, priority_changed, sla_warning, sla_breached, escalated, commented, attachment_added, checklist_toggled, snoozed, closed. actor_id nullable (system). payload JSONB. No tenant_id (child table). | schema | DB_TABLE, MIGRATION | 1h |
| P1 | **T1.4** Create `op_task_comments` + `op_task_attachments` — Comments: threaded (parent_comment_id), soft-delete. Attachments: storage path op-tasks/{task_id}/{uuid}.{ext}. No tenant_id (child tables). | schema | 2x DB_TABLE, 2x MIGRATION | 1h |
| P1 | **T1.5** Status state machine + RPCs — 7 statuses with adjacency matrix. Blocked tasks can't leave blocked until blockers resolved. task_create, task_transition, task_assign, task_bulk_update, task_snooze. All write op_task_events transactionally. | api | 5x RPC, adjacency matrix | 8h |
| P1 | **T1.6** API routes `/api/bop/ops/tasks` — GET (filterable by status/priority/assignee/dept/ref_object, server-side pagination). POST (Zod-validated). PATCH (update/transition). DELETE (soft). GET /cockpit-summary (dashboard counters). | api | API_ROUTE x2, Zod schemas | 6h |
| P1 | **T1.7** OP001 Cockpit main screen — full build. 8-card stat strip (Open, Due Today, Overdue, Waiting Input, Waiting Approval, Waiting Dep, Completed Today, SLA At Risk). Banded urgency work queue. Quick actions per row. Status tab bar. | screen | SCREEN, I18N_KEY x5 | 12h |
| P1 | **T1.8** Task detail drawer + full page — Header: task number, 7-dot status stepper, priority, dept, assignee. Sections: relation card, checklist (inline toggle), dependencies, comments (threaded), attachments (upload/preview/download), activity timeline. | screen | SCREEN x2, I18N_KEY | 10h |
| P1 | **T1.9** Grid view with server pagination — DataGrid, sortable/filterable. Multi-select. Bulk action toolbar: reassign, reschedule, close, change priority. | screen | SCREEN | 6h |
| P2 | **T1.10** Quick-add modal — Global "+ Task" in shell bar. Pre-fills ref_object from current route via resolver map. | screen | SCREEN | 3h |
| P2 | **T1.11** PBAC + object registry — 8 permissions. op_tasks as L2 in bop_objects. RLS policies with check_pbac() for own vs all. | infra | 8x PERMISSION, bop_objects | 2h |
| P2 | **T1.12** SLA & escalation cron (10-min) — PM2 cron. L0→L1 at SLA-2h (Telegram warning). L1→L2 at SLA (Telegram alert, pin). L2→L3 at SLA+4h (escalation). Each writes op_task_events. | infra | CRON, TELEGRAM x3 | 4h |
| P2 | **T1.13** Telegram notifications — DesAssistant22bot. P1 task created, task overdue, SLA breach. Format: number, title, assignee, deep link. | infra | TELEGRAM x2 | 2h |

---

### Phase STR-P1 — Strategy Cockpit Skeleton with Manual KRs (~7-9 sessions)

| P | Task | Type | Deliverables | Est |
|---|------|------|-------------|-----|
| P1 | **T2.1** Create `op_goals` table — **tenant_id UUID NOT NULL FK.** Hierarchical: parent_goal_id self-ref FK. Entity: ENUM (des_mobil, des_campers, des_shop, des_systems, des_group). Period: period_type/start/end. Status: active/achieved/semi_achieved/paused/closed. Health: on_track/at_risk/off_track + override. owner_id, vision_text, budget. Soft-delete. Index: (tenant_id, entity, status). | schema | DB_TABLE, MIGRATION, RLS_POLICY | 3h |
| P1 | **T2.2** Create `op_goal_key_results` — **tenant_id UUID NOT NULL FK.** goal_id FK. metric_type ENUM (count/sum/avg/ratio/manual). direction (increase/decrease). baseline/target/current NUMERIC. weight DEFAULT 1. metric_source (nullable in P1). unit_label. Soft-delete. tenant_id needed for dashboard aggregates + nightly cron. | schema | DB_TABLE, MIGRATION | 2h |
| P1 | **T2.3** Create `op_goal_kr_snapshots` + `op_goal_checkins` — Snapshots: kr_id, date, value, progress_pct, pace_delta. UNIQUE(kr_id, date). No tenant_id. Check-ins: goal_id, author_id, confidence 1-5, note, blockers. No tenant_id. | schema | 2x DB_TABLE, 2x MIGRATION | 2h |
| P1 | **T2.4** Goal CRUD API routes — `/api/bop/ops/goals`: GET (recursive CTE tree query, KRs nested, progress computed), POST, PATCH, DELETE (soft). Manual KR value: PATCH /goals/kr/[id]. GET /goals/dashboard-summary. | api | API_ROUTE x2, Zod schemas | 6h |
| P1 | **T2.5** OP002 Goal tree — full build. 3-level expandable: Goal → Objectives → KRs. Each node: title, entity badge, period badge, health dot, progress bar with weighted roll-up %. Row actions: check-in, edit, add child, close-out. Status filter tabs. Search. | screen | SCREEN, I18N_KEY x5 | 12h |
| P1 | **T2.6** Goal detail page — Header: number, title, owner, entity, period, status, health. KR list with manual value editor. Check-in form: confidence slider, blockers, note. Check-in history timeline. Budget card. Close-out form. | screen | SCREEN, I18N_KEY x5 | 10h |
| P2 | **T2.7** Weighted roll-up computation — On-write RPC. KR progress = (current-baseline)/(target-baseline)*100, direction-aware. Goal = weighted avg of KR progress. Parent goal = weighted avg of children. Health from pace delta. | api | RPC | 3h |
| P2 | **T2.8** PBAC + object registry — 7 permissions. op_goals (L2) and op_goal_metrics_catalog (L3) in bop_objects. | infra | 7x PERMISSION, bop_objects | 1h |
| P2 | **T2.9** Seed Q3-2026 goals — Initial goals matching business focus (e.g. "Grow DES Campers trading rhythm" with KRs). | schema | MIGRATION (seed SQL) | 1h |

---

### Phase OPS-P2 — Automation & Views (~8-10 sessions)

| P | Task | Type | Deliverables | Est |
|---|------|------|-------------|-----|
| P1 | **T3.1** Create `op_task_templates` + `op_task_template_steps` — Templates: **tenant_id**, name_i18n JSONB, is_chain, default_priority, category. Steps: template_id FK, step_order, title, due_offset_hours, sla_offset_hours, depends_on_prev. No tenant_id on steps (child). | schema | 2x DB_TABLE | 2h |
| P1 | **T3.2** Create `op_task_triggers` + `op_task_trigger_events` — Triggers: **tenant_id**, event_type, template_id FK, condition_sql, enabled. Events (log): trigger_id FK, source_object_type/id, tasks_created. UNIQUE idempotency. No tenant_id on events (child). | schema | 2x DB_TABLE | 2h |
| P1 | **T3.3** `fireTaskTriggers()` service — TypeScript. Single entry point. Match event_type → active triggers → evaluate condition_sql → instantiate template steps as op_tasks. Idempotency check. Returns created task IDs. | api | SERVICE | 8h |
| P1 | **T3.4** Wire triggers into BOP flows — 5 integrations: inquiry.created → response template. listing.purchased → vehicle_intake_chain. invoice.overdue → reminder. sup_request.created → first_response. review.low_score → followup. | integration | 5x integration | 6h |
| P1 | **T3.5** Seed 5 automation templates — inquiry_response (1 step, 2h SLA), vehicle_intake_chain (5 chained steps), invoice_reminder (1 step, 48h), support_first_response (1 step, 4h SLA), review_followup (1 step, 24h). | schema | MIGRATION (seed) | 2h |
| P2 | **T3.6** Create `op_task_views` + saved filters — **tenant_id**, name, filter_config JSONB, owner_id, is_pinned, sort_order. Left rail in cockpit. | screen | DB_TABLE, SCREEN | 4h |
| P2 | **T3.7** Kanban view — Columns: Open / In Progress / Waiting / Blocked / Done-today. Drag = task_transition RPC. Card: title, priority stripe, assignee, due badge. | screen | SCREEN | 8h |
| P2 | **T3.8** Calendar view — Tasks by due_at. Day/week/month toggle. Click → detail drawer. Color by priority. | screen | SCREEN | 6h |
| P2 | **T3.9** Bulk actions toolbar — Multi-select in grid → reassign, reschedule, close, change priority. Individual RPCs per task. | screen | SCREEN | 3h |

---

### Phase STR-P2 — Automated Metrics & Executive Dashboard ✅ COMPLETED 2026-08-10

| P | Task | Type | Deliverables | Status |
|---|------|------|-------------|--------|
| P1 | **T4.1** Create `op_goal_metrics_catalog` — code PK, name_i18n JSONB, metric_type, unit_label, entity_scoped, query_key. No tenant_id (system-wide reference). 9 initial codes: vans_sold, revenue_invoiced, gross_margin_sum, avg_days_to_sale, inquiries_count, inquiry_to_sale_conversion, nps_avg, review_score_avg, stock_count. | schema | DB_TABLE, seed rows | ✅ |
| P1 | **T4.2** `computeMetric()` service — Switch on query_key. Reads: ast_assets (sold count, days-to-sale, stock), fin_invoices (revenue, margin), crm_leads (lead volume, conversion), sal_surveys (NPS, review score). All entity-scoped + period-filtered. 9 QUERIES dispatch map. | api | SERVICE | ✅ |
| P1 | **T4.3** Nightly computation + snapshots cron — PM2 daily at 02:00. For each active auto-KR: computeMetric → update current_value → INSERT snapshot. Recompute roll-up. Health recalc. Telegram on transitions. WebSocket transport for Node 20. | infra | CRON, TELEGRAM | ✅ |
| P1 | **T4.4** `op_tasks.goal_kr_id` FK bridge — ADD COLUMN goal_kr_id UUID FK → op_goal_key_results ON DELETE SET NULL. Task detail shows KR chip. KR detail lists linked tasks. | schema | MIGRATION, SCREEN x2 | ✅ |
| P1 | **T4.5** Executive dashboard (OP012) — Vision banner (editable PATCH). ProgressRing SVG. EntityLane with health dots. AtRiskPanel. KpiStrip (5 cards: Active Goals, Avg Progress, On Track, At Risk, Auto KRs). TrendCharts from snapshots via CockpitKit Spark. | screen | SCREEN, I18N_KEY | ✅ |
| P2 | **T4.6** Monday check-in Telegram prompt — PM2 cron Mon 08:00. Active objectives + current % + health icons. Deep link to dashboard. | infra | TELEGRAM, CRON | ✅ |
| P2 | **T4.7** KR sparklines + metric chips — Last 30 snapshots as sparkline via CockpitKit Spark. Auto·{code} / Manual chip. PaceArrow component. ⟳ Compute button for on-demand metric refresh. | screen | SCREEN | ✅ |

**Key files delivered:**
- `lib/ops/compute-metric.ts` — computeMetric() service with 9 query functions
- `scripts/ops-goals-cron.mjs` — PM2 nightly cron + Monday check-in (WebSocket transport)
- `app/console/ops/goals/dashboard/page.tsx` — OP012 Executive Dashboard
- `app/console/ops/goals/[id]/detail-sections.tsx` — Extracted GoalHeader/ChildrenList/LinkedTasks
- `app/api/bop/ops/goals/route.ts` — Extended with compute_kr, rollup, exec-summary, metrics-catalog views
- `sql_bop_v2_89_metrics_catalog.sql` — op_goal_metrics_catalog table + 9 seed rows
- `sql_bop_v2_90_goal_kr_bridge.sql` — op_tasks.goal_kr_id FK + metric_code on KRs

---

### Phase OPS-P3 + STR-P3 — Advanced ✅ COMPLETED 2026-08-13

| Task | Phase | Status |
|------|-------|--------|
| **T5.1** Dependencies UI + Timeline/Gantt view | OPS-P3 | ✅ Add/remove deps on detail page; Gantt timeline with SVG arrows |
| **T5.2** Recurrence engine (RFC 5545 RRULE) | OPS-P3 | ✅ Daily cron + RRULE parser + quick-add UI |
| **T5.3** Time tracking: start/stop + estimate vs actual | OPS-P3 | ✅ Timer RPCs + detail page UI + progress bar |
| **T5.4** Telegram inline actions (Done/Snooze buttons) | OPS-P3 | ✅ Inline keyboard + webhook handler |
| **T5.5** Analytics: completed/week, SLA %, workload | OPS-P3 | ✅ Full dashboard: KPIs, charts, gauges, workload |
| **T6.1** Period close-out + historical ledger | STR-P3 | ✅ Ledger page + period ledger table + auto-snapshot on close-out |
| **T6.2** Budget linkage to boekhouding | STR-P3 | ✅ AP/AR from fin_invoices + monthly breakdown chart |
| **T6.3** Forecast projection lines | STR-P3 | ✅ Forecast API + projection panel on goal overview |
| **T6.4** Entity scorecards | STR-P3 | ✅ Radar chart + health donut + entity-scorecard API |

**Key files delivered (P3):**
- `app/console/ops/tasks/[id]/page.tsx` — Task detail with inline edit + dependency add/remove
- `app/console/ops/tasks/timeline/page.tsx` — Gantt timeline with dependency arrows
- `app/console/ops/tasks/analytics/page.tsx` — Full analytics dashboard
- `scripts/ops-recurrence-cron.mjs` — RFC 5545 RRULE recurrence engine
- `app/api/bop/ops/telegram-webhook/route.ts` — Telegram callback handler
- `app/console/ops/goals/ledger/page.tsx` — Historical ledger page
- `app/api/bop/ops/goals/route.ts` — Extended: historical-ledger, forecast, entity-scorecard, budget-monthly views
- `app/console/ops/goals/scorecard/page.tsx` — Entity scorecards with radar + donut
- `sql_bop_v2_94_period_ledger.sql` — Period ledger table for close-out snapshots

---

## 5. Table Schema Overview — Tenant Scoping

**Rule:** `tenant_id` on tables that are directly queried in list views, dashboards, RLS policies, or cross-parent aggregations. Child tables accessed via parent FK UUID inherit tenant isolation from the parent join.

### Tables WITH tenant_id (6)

| Table | Module | Phase | Reason |
|-------|--------|-------|--------|
| `op_tasks` | OP001 | P1 | RLS root. Cockpit queries, filtered lists, dashboard counters. |
| `op_task_templates` | OP001 | P2 | Template picker per tenant. Different automation per tenant. |
| `op_task_triggers` | OP001 | P2 | Trigger management per tenant. Different business flows. |
| `op_task_views` | OP001 | P2 | Saved filters per user per tenant. |
| `op_goals` | OP002 | P1 | RLS root. Goal tree, entity-scoped dashboard. |
| `op_goal_key_results` | OP002 | P1 | Dashboard aggregates across goals. Nightly cron batch reads. |

### Tables WITHOUT tenant_id (9)

| Table | Module | Phase | Parent FK | Reason |
|-------|--------|-------|-----------|--------|
| `op_task_dependencies` | OP001 | P1 | task_id | Never listed independently. Tenant via op_tasks join. |
| `op_task_events` | OP001 | P1 | task_id | Activity timeline for one task. Tenant via op_tasks. |
| `op_task_comments` | OP001 | P1 | task_id | Comments on a specific task. Via task_id only. |
| `op_task_attachments` | OP001 | P1 | task_id | Files on a specific task. Via task_id only. |
| `op_task_template_steps` | OP001 | P2 | template_id | Steps within one template. Via template_id only. |
| `op_task_trigger_events` | OP001 | P2 | trigger_id | Execution log for one trigger. Via trigger_id only. |
| `op_goal_kr_snapshots` | OP002 | P1 | kr_id | Time-series per KR. Sparkline reads via kr_id. |
| `op_goal_checkins` | OP002 | P1 | goal_id | Check-in history per goal. Via goal_id only. |
| `op_goal_metrics_catalog` | OP002 | P2 | — | System-wide reference. Shared across all tenants. |

---

## 6. Cross-Module Dependencies

### OP001 reads from / writes to:
- `bop_users` — assignee_id, created_by
- `listings` / `listing_inquiries` / `fin_invoices` / `sup_requests` / `crm_leads` — polymorphic ref links + trigger sources
- `bop_comm_history` — Telegram alert logging
- `op_goal_key_results` — goal_kr_id bridge (STR-P2)
- `sy_tasks.op_task_id` — SY051 implementation cockpit link (existing)

### OP002 reads from (auto-metrics in STR-P2):
- `listings` — vans_sold, avg_days_to_sale, stock_count
- `fin_invoices` — revenue_invoiced, gross_margin_sum (margeregeling-aware)
- `listing_inquiries` / `crm_leads` — inquiries_count, conversion
- `reviews` — review_score_avg, nps_avg
- `op_tasks` — linked tasks per KR via goal_kr_id

### Coexistence with DesCampers:
- DC `tasks` table remains untouched — DC admin operates independently
- DC `objectives` + `key_results` remain untouched
- No FK links between BOP op_* and DC tables
- Future: retire DC screens once BOP OP001/OP002 reach feature parity

---

## 7. SY051 Program Seed

**Program code:** `BOP-OPSCOCKPIT`  
**Phases:** 6 (OPS-P1, STR-P1, OPS-P2, STR-P2, OPS-P3, STR-P3)  
**Tasks:** ~48  
**Deliverables:** ~135  
**Estimated total:** ~25 FTE days  
**Target:** P1 phases by end of Q3 2026. P2 by end of Q4 2026. P3 on go-signals.

---

## 8. Build Order

1. **Step 0:** Generate `sql_bop_v2_opscockpit_impl_plan.sql` — register in SY051
2. **Step 1 — OPS-P1:** op_tasks + 4 supporting tables + RPCs + API + cockpit UI + SLA cron
3. **Step 2 — STR-P1:** op_goals + 3 supporting tables + API + goal tree + detail page + check-ins
4. **Step 3 — OPS-P2:** Templates + triggers + fireTaskTriggers() + Kanban + Calendar + saved views
5. **Step 4 — STR-P2:** Metrics catalog + computeMetric() + nightly job + exec dashboard + sparklines
6. **Step 5 — P3s:** Deferred to go-signals (staff hire, 8-10 vehicles/month)

---

## 9. BOP V2 Conventions Checklist

| Convention | Applies To | Detail |
|-----------|-----------|--------|
| Soft-delete | All tables | `deleted_at TIMESTAMPTZ`, never hard delete |
| Object registry | All new objects | `bop_objects` + `object-manifest.ts`. L2 for tasks/goals, L3 for templates/triggers/catalog |
| i18n | All user-facing strings | NL/EN/DE/FR/TR via `@des-group/i18n`. Catalogs use `name_i18n JSONB` |
| Mutations via RPC | Status changes | No direct UPDATE SET status. All through validated RPCs with event writes |
| Zod validation | API routes | Shared schemas between handlers and client forms |
| PBAC scoping | Permissions | `domain.resource.action` pattern. Scope: own vs all |
| Tenant isolation | 6 root tables | `tenant_id` + RLS via `current_setting('app.tenant_id')` |
| Telegram alerting | P1 events, SLA | DesAssistant22bot. Task number + title + deep link |
| Dev server | All console work | `/opt/dessystems-console-dev/`, port 4401 |

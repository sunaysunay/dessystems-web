# BOP V2 — OP002 Strategy Cockpit + SY051 Implementation Cockpit — Combined Implementation Plan

**Version:** 3.0 · 2026-08-13
**Scope:** OP002 Goal Cycle closed-loop + Execution Bridge into SY051 & OP001
**Modules:** OP002 (Think), SY051 (Design), OP001 (Do), BOP Data (Measure)
**Schema cost:** 2 new tables, 5 new columns, 1 enum value, 1 type file merge
**Prerequisite:** SQL migrations v2_82–v2_90 already applied

---

## Governing Principle

A goal in OP002 is not a CRUD record. It is a **closed-loop management object**: define the outcome, reverse-engineer the conditions required, generate execution (tasks or an implementation program), measure continuously from real BOP data, detect deviations, record decisions and learnings, adjust — and automatically open the next review cycle until the goal is achieved, closed, or formally re-baselined. The loop is *driven by the system* (cron + review tasks + escalation), not by the operator remembering to look.

---

## Module Responsibility Map

| Module | Role | Owns | Rule |
|--------|------|------|------|
| **OP002** | Think | Goals, KRs, cycles, decisions | Defines *what* must be achieved and *why*; reviews whether it's happening |
| **SY051** | Design | `sy_programs → sy_phases → sy_tasks` | Defines *how* complex change gets delivered. Already built. |
| **OP001** | Do | `op_tasks` | Direct execution for simple work; corrective actions from goal reviews |
| **BOP data** | Measure | Invoices, sales, inquiries | Metrics catalog computes KR values from what actually happened |

**Strict rule:** program work lives in `sy_tasks`, operational work in `op_tasks` — one unit of work never exists in two task systems. Everything links back to the goal for traceability in both directions.

---

## Current State Assessment

### OP002 — What's broken

| Severity | Issue | Where |
|----------|-------|-------|
| CRITICAL | POST actions (`update_kr_value`, `checkin`, `compute_kr`, `close_out`) silently create junk goal records | `goals/route.ts` POST |
| CRITICAL | Cron hardcodes `elapsed = 50` — health always computed as if mid-period | `ops-goals-cron.mjs:103` |
| CRITICAL | Two snapshot tables (`op_goal_kr_snapshots` vs `op_goal_snapshots`) — trend data split | Schema + all consumers |
| IMPORTANT | Two divergent type systems with different column coverage | `ops-goal-ui.ts` vs `op-goals-types.ts` |
| IMPORTANT | New detail page missing check-in creation, close-out, inline KR edit, auto-compute | Both page sets |
| IMPORTANT | Metric queries ignore the goal's entity and period — DES Shop revenue counts all invoices | Cron metric functions |
| CLEANUP | Confidence shown as /10 (DB is 1–5); budget-actuals view unimplemented; orphaned Exec Dashboard link | Detail pages |

### SY051 — Current state (already built)

| Component | Status | Lines | Notes |
|-----------|--------|-------|-------|
| Main cockpit page | Built | 1090 | Single-file client component with all UI inline |
| Task detail page (SY053) | Built | 493 | Deliverable verify, event log |
| API route (20 POST actions) | Built | 402 | Full CRUD + OP001/OP002 linking + verification |
| Auto-verify engine | Built | 170 | 7 kinds implemented, 7 pending |
| Doc management (upload/preview/download) | Built | 287 | 4 doc types, 10MB limit, Markdown preview |
| Schema (8 tables, 3 views) | Built | 288 | Progress fully derived from deliverables |
| OP001 linking (`op_task_id`) | Built | — | search + link + fetch actions |
| OP002 linking (`op_goal_id`) | Built | — | search + link + fetch actions |
| Template system | Partial | — | 5 templates seeded, read API exists, no "apply" UI |
| Type definitions | Missing | — | All interfaces inline in page files, no `/lib` exports |
| `sy_task_deps` table | Unused | — | Schema exists, no API or UI |
| Component extraction | Missing | — | Everything in page.tsx, nothing reusable |

### SY051 — What needs to change for the bridge

| Gap | Why it matters | Phase |
|-----|----------------|-------|
| No `goal_kr_id` on `sy_programs` | Can't link program to specific KR (only goal-level link exists) | P5 |
| No "generate from goal" action | Can't scaffold a program from goal gap data | P5 |
| No progress feedback to OP002 | Goal cycle LOOK step can't show SY051 execution progress | P4–P5 |
| No shared types in `/lib` | OP002 can't import SY051 types for the bridge UI | P5 |
| No extracted components | Can't embed program progress widgets in OP002 detail page | P5 |
| Template apply UI missing | Bridge needs template selection for program scaffolding | P5 |
| 7 auto-verify kinds not implemented | Non-blocking but leaves verification incomplete | P6 |

---

## External Input — Merged Verdict

Three rounds of ChatGPT evaluation, one decision set:

### Adopt fully
- `op_goal_cycles` — one row per loop turn: look, diagnosis, decision, learning
- Bottleneck detection — lowest weighted KR progress vs expected
- `no_data` health state — missing measurement ≠ bad performance
- Execution decision fork: simple → OP001, complex → SY051
- Draft → Review → Approve gate — nothing mass-creates records unseen
- `execution_status` on goals — planning state next to health
- Bidirectional traceability — task knows its KR and goal; goal shows all its work
- Controlled loop termination: achieved / closed / re-baselined

### Adapt (trimmed for solo operator)
- Reverse-Engineer wizard: guided gap-analysis creating KRs — *not* a formula engine
- Next Best Action: rule-based from bottleneck — no predicted-impact numbers
- Execution draft generation: template-driven — no fabricated effort estimates
- Re-baseline: recorded cycle event with note — no approval chain

### Skip
- Initiative table — level-1 objective covers grouping; SY051 program covers delivery
- Approval workflows (solo operator)
- Formula decomposition engine (Revenue = Orders × AOV auto-derivation)
- Cascading SY051 milestones into OP001 — would duplicate one unit of work into two systems

---

## The Goal Cycle Loop — with Execution Bridge Inside

```
stage                     mechanism

1. MEASURE                nightly cron: auto-compute KRs from BOP data
    │                     (entity + period scoped), snapshot daily
    ▼
2. EVALUATE               trajectory engine: actual vs expected (real elapsed),
    │                     health = on_track / at_risk / off_track / no_data
    ▼
3. LOOK (review due)      next_review_at ≤ now → cron opens cycle row +
    │                     creates OP001 review task; health drop → pulled forward
    ▼
4. DIAGNOSE               Cycle Review wizard: gap per KR, bottleneck
    │                     auto-identified, root cause + confidence captured
    ▼
5. DECIDE                 structured: continue / adjust tasks / adjust KRs /
    │                     re-baseline / close — reason required
    ▼
6. ACT                    Execution Designer — the bridge:
    │                     simple → op_tasks batch (goal_kr_id + cycle ref)
    │                     complex → sy_program + phases + sy_tasks (goal link)
    ▼
7. LEARN                  learning field sealed into the cycle row —
    │                     permanent organizational memory
    ▼
8. CLOSE CYCLE            next_review_at advanced; execution progress folds
    │                     into next cycle's LOOK data
    │
    ├──► period open, target not reached ──► back to 1
    │
    └──► period end / target reached ──► CLOSE OUT
                                          retrospective + follow-up goal
                                          (actuals become next baseline)
```

Exit conditions are explicit — **achieved**, **semi_achieved**, **closed** (with note), or **re-baseline** (recorded on the cycle). Nothing loops forever; nothing exits silently.

---

## Build Phases

**Build order:** P1 → P2 (parallel) → P3 → P4 → P5 → P6
**Critical path:** P1 → P3 → P4 → P5

---

### Phase 1 — Fix What's Broken (OP002)

**Priority:** CRITICAL — nothing new gets built on broken plumbing
**Scope:** API actions, snapshot consolidation, cron health, type merge

| # | Task | Type | Details |
|---|------|------|---------|
| 1.1 | API action dispatch | api | Add action routing to `goals/route.ts` POST — dispatch on `body.action` before the create path: `update_kr_value` (UPDATE `op_goal_key_results.current_value` + recompute), `checkin` (INSERT `op_goal_checkins`), `compute_kr` (call `computeMetric()` for one KR), `close_out` (UPDATE status + `closed_at/closed_by/closing_note`). Every write calls `op_goal_recompute_progress()` / `op_goal_recompute_health()` RPCs. |
| 1.2 | Budget-actuals view | api | Implement `budget-actuals` API view: AP/AR totals from `fin_invoices` against goal entity + period. |
| 1.3 | Snapshot consolidation | schema | Keep `op_goal_kr_snapshots` (cron's table, right shape). Migrate any rows from `op_goal_snapshots`. Repoint snapshots API route + detail page queries. DROP `op_goal_snapshots`. |
| 1.4 | Cron real elapsed | fix | Replace `elapsed = 50` with `(now − period_start) / (period_end − period_start) * 100`. Use the DB RPC `op_goal_recompute_health()` — one source of truth. |
| 1.5 | `no_data` health state | schema | Add `'no_data'` to health enum. KR with no snapshot within 2× measurement cadence → `no_data`, not `off_track`. Update `GoalHealth` type. |
| 1.6 | Type merge | refactor | Merge `ops-goal-ui.ts` + `op-goals-types.ts` into single `lib/op-goals-types.ts` with all DB columns incl. `metric_code`, `metric_source`, `data_source`. Update all imports. Delete `ops-goal-ui.ts`. |
| 1.7 | Small fixes | fix | Remove invalid `rolling` period option from create modal. Fix confidence display to /5 (not /10). |

---

### Phase 2 — Consolidate the UX (OP002)

**Priority:** IMPORTANT — can run parallel with P1
**Scope:** One modal, one detail page, on the reachable paths (`app/console/ops/goals/`)

| # | Task | Type | Details |
|---|------|------|---------|
| 2.1 | Unified create modal | screen | Replace 5-field `CreateGoalModal` with shared `GoalFormModal` (priority, goal_type, auto period-end, parent selector, inline KRs, advanced settings). Wire `tenant_id` from scope. Add `metric_code` dropdown to KR rows (from `op_goal_metrics_catalog`) — selecting one pre-fills metric type + unit and marks KR auto-computed. |
| 2.2 | Reverse-engineering step | screen | Optional guided step in create modal: target − current = gap + time remaining → "what must be true to close this gap?" → each answer becomes a KR row, bound to a `metric_code` where one fits. |
| 2.3 | Unified detail page | screen | Merge into one page: tabbed layout + MetricCards + expected-progress marker (from new) with inline KR edit, auto-compute button, check-in form, close-out, BudgetCard (from old). Linked OP001 tasks shown via `goal_kr_id`. |
| 2.4 | List page improvements | screen | Priority filter; port GoalTree's health dots, priority badges, +Add-child hover action. Entity filter. |

---

### Phase 3 — Trustworthy Measurement (OP002)

**Priority:** Foundation for the loop — metrics must be correct before automation
**Scope:** Entity/period-scoped auto-compute, real trajectory

| # | Task | Type | Details |
|---|------|------|---------|
| 3.1 | Entity-scope metrics | fix | Every metric query filters by the goal's entity: DES Shop revenue counts only DES Shop invoices. Map entity to the appropriate WHERE clause per query. |
| 3.2 | Period-scope metrics | fix | Filter by the goal's `period_start`/`period_end` — no data outside the goal's time window. |
| 3.3 | Cascading roll-up | fix | After each auto-update, trigger `op_goal_recompute_progress()` + `op_goal_recompute_health()` so parent goals cascade immediately. |
| 3.4 | Expected-progress line | screen | Detail page: `expected = baseline + (target−baseline) × elapsed/duration`. Show as faint dashed line on KR sparklines. |
| 3.5 | KR sparklines | screen | From consolidated `op_goal_kr_snapshots` table. Last 30 data points. Faint dashed target trajectory overlay. |

---

### Phase 4 — The Goal Cycle — Closed-Loop Layer (OP002)

**Priority:** The differentiator — this is what makes OP002 more than a dashboard
**Scope:** Cycles table, loop clock, review wizard, bottleneck detection

#### Schema — migration v2_91

```sql
-- op_goal_cycles: one row per review cycle turn
CREATE TABLE op_goal_cycles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  goal_id         UUID NOT NULL REFERENCES op_goals(id) ON DELETE CASCADE,
  cycle_number    INT NOT NULL,  -- auto-increment per goal
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at        TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  expected_progress NUMERIC(5,2),
  actual_progress   NUMERIC(5,2),
  gap_pct           NUMERIC(5,2),
  health_at_review  TEXT,
  bottleneck_kr_id  UUID REFERENCES op_goal_key_results(id) ON DELETE SET NULL,
  look_summary      TEXT,
  root_cause        TEXT,
  decision          TEXT CHECK (decision IN (
    'continue','adjust_tasks','adjust_krs','rebaseline','close'
  )),
  decision_note     TEXT,
  learning          TEXT,
  created_by        UUID,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(goal_id, cycle_number)
);
CREATE INDEX idx_goal_cycles_tenant ON op_goal_cycles(tenant_id);
CREATE INDEX idx_goal_cycles_goal   ON op_goal_cycles(goal_id, cycle_number);

-- Clock columns on op_goals
ALTER TABLE op_goals ADD COLUMN next_review_at TIMESTAMPTZ;
ALTER TABLE op_goals ADD COLUMN last_review_at TIMESTAMPTZ;
```

| # | Task | Type | Details |
|---|------|------|---------|
| 4.1 | Migration v2_91 | schema | Create `op_goal_cycles` table + add `next_review_at`/`last_review_at` to `op_goals`. Set `next_review_at` on create from `checkin_frequency`. Register in `bop_objects`. |
| 4.2 | Loop driver — cron extension | infra | `next_review_at ≤ now` → open cycle row (pre-filled with expected/actual/gap/health/bottleneck from live data) + auto-create OP001 review task (priority from health: off_track → urgent). Health drops a band mid-cycle → Telegram alert + pull `next_review_at` to tomorrow. Review overdue by >1 cadence interval → Telegram escalation. |
| 4.3 | Bottleneck detection | api | Lowest weighted KR progress vs expected → `bottleneck_kr_id` on the open cycle. Surfaced in LOOK step. |
| 4.4 | Cycle Review wizard | screen | 5-step wizard on goal detail: **LOOK** (actual vs expected per KR, gap, sparkline, bottleneck highlighted, linked execution progress — read-only), **DIAGNOSE** (root cause, confidence 1–5, blockers — writes check-in + cycle fields), **DECIDE** (continue / adjust tasks / adjust KR targets / re-baseline / close — reason required), **ACT** (opens Execution Designer from P5), **LEARN** ("what did this cycle teach us?" — sealed into cycle row). On submit: cycle closed, clocks advanced, review task auto-completed. |
| 4.5 | Cycle history tab | screen | "Cycles" tab on goal detail: reverse-chronological cycle cards — gap, health, root cause, decision, learning, linked work and outcomes. The goal's thinking history. |
| 4.6 | Next-Best-Action strip | screen | Current bottleneck KR + create-task shortcut. Rule-based, no fake impact predictions. |
| 4.7 | Close-out retrospective | screen | Final actual-vs-target per KR + "create follow-up goal" pre-filled with actuals as next baselines. |

---

### Phase 5 — The Execution Bridge — Generate Execution (OP002 + SY051)

**Priority:** Strategy-to-execution — turns decisions into work
**Scope:** OP002 → OP001 tasks or SY051 programs, with draft gate + traceability

#### Schema — migration v2_92

```sql
-- Execution status on goals
ALTER TABLE op_goals ADD COLUMN execution_status TEXT
  DEFAULT 'not_planned'
  CHECK (execution_status IN (
    'not_planned','draft','in_execution',
    'partially_complete','completed','needs_replanning'
  ));

-- Program-to-strategy link (SY051 side)
ALTER TABLE sy_programs ADD COLUMN goal_id UUID REFERENCES op_goals(id) ON DELETE SET NULL;
ALTER TABLE sy_programs ADD COLUMN goal_kr_id UUID REFERENCES op_goal_key_results(id) ON DELETE SET NULL;
CREATE INDEX idx_sy_programs_goal ON sy_programs(goal_id) WHERE goal_id IS NOT NULL;
```

#### OP002-side tasks

| # | Task | Type | Details |
|---|------|------|---------|
| 5.1 | Migration v2_92 | schema | Add `execution_status` to `op_goals`. Add `goal_id` + `goal_kr_id` to `sy_programs`. |
| 5.2 | `generate_execution_draft` action | api | Reads goal + KRs + gap + bottleneck, returns proposed structure (template-driven). **Zero writes.** Simple path returns op_tasks draft array. Complex path returns sy_program + phases + tasks structure. No fabricated effort estimates. |
| 5.3 | `create_execution` action | api | Takes user-edited draft. Simple → batch-insert `op_tasks` (with `goal_kr_id` + `ref_object_type='goal_cycle'` + `ref_object_id`). Complex → INSERT `sy_programs` + `sy_phases` + `sy_tasks` with goal link columns. Stamps `execution_status` on goal. |
| 5.4 | Execution Designer UI | screen | Modal from goal detail and from Cycle Review wizard's ACT step: gap summary → required-outcomes checklist (from KRs, bottleneck highlighted) → simple/complex toggle → editable draft tree → Approve & Create. Generate → Review → Approve, never auto-create. |
| 5.5 | Execution section on goal detail | screen | Linked program progress (`sy_program_progress` view exists) + task counts with status rollup. Traceability breadcrumb: task shows "contributes to KR-007 → G-0024"; goal shows all work serving it. |
| 5.6 | Execution progress in cycle LOOK | api | Cron folds execution progress (OP001 task completion + SY051 program %) into next cycle's LOOK data. All linked work done but KR flat → diagnosis prompt: *"execution finished, needle didn't move."* |

#### SY051-side tasks (Implementation Cockpit improvements)

| # | Task | Type | Details |
|---|------|------|---------|
| 5.S1 | Extract SY051 types to `/lib` | refactor | Create `lib/sy-impl-types.ts` with all interfaces currently inline in `app/console/sys/impl/page.tsx`: `SyProgram`, `SyPhase`, `SyTask`, `SyDeliverable`, `SyTaskEvent`, `SyTemplate`, `SyTemplateItem`. Export from there, import in pages. |
| 5.S2 | Extract reusable SY051 components | refactor | Extract from the 1090-line page.tsx into `components/console/impl/`: `ProgramSelector`, `ProgramTreeView`, `ProgramDashboard`, `PhaseCard`, `TaskRow`, `DeliverableRow`, `ProgramProgressBar`. These will be reused in OP002's execution section. |
| 5.S3 | Template apply action | api | New POST action `apply_template` in `impl/route.ts`: given a `task_id` and `template_code`, read template items from `sy_template_items`, insert matching `sy_deliverables` onto the task. Wire into task create/edit UI. |
| 5.S4 | Goal-to-program scaffold API | api | New POST action `generate_from_goal` in `impl/route.ts`: given `goal_id` + KR data + selected template, create program (code auto-generated, goal link set), phases from KR groups, tasks from template. Returns created program ID. This is the backend for `create_execution` complex path. |
| 5.S5 | Program progress widget component | screen | Exportable `ProgramProgressWidget` component: compact program progress (phases, overall %, deliverable counts) for embedding in OP002 goal detail page. Uses `sy_program_progress` view. |
| 5.S6 | Bidirectional goal breadcrumb | screen | In SY051 main page: if program has `goal_id`, show breadcrumb link "Goal: G-0024 — Grow DES Campers" that navigates to `/console/ops/goals/{id}`. Currently only shows the linked OP001 task. |
| 5.S7 | Goal progress feedback | api | When SY051 program status changes (via `update_program_status`), check if `goal_id` is set → update `op_goals.execution_status` accordingly (program active → `in_execution`, program done → `completed`, program paused → `needs_replanning`). |

---

### Phase 6 — Cleanup + Exec Dashboard (OP002 + SY051)

**Priority:** CLEANUP — runs last, after cycles generate data to visualize
**Scope:** Dead code removal, cockpit view, pillars, learning library

| # | Task | Type | Details |
|---|------|------|---------|
| 6.1 | Dead code removal | cleanup | Delete `app/[locale]/console/ops/goals/` (orphaned pages), `ops-goal-ui.ts` (merged in P1), drained `op_goal_snapshots` table (consolidated in P1). |
| 6.2 | Exec Dashboard | screen | At `/console/ops/goals/dashboard` (Monday Telegram bot already links here): entity health grid, pillar progress, at-risk goals, execution-status column, cycle-discipline widget (reviews on time vs overdue). |
| 6.3 | Strategic pillars | schema | `op_ref_pillars` table (Growth, Financial, Customer, Operational, Digital, Expansion). Convert `strategic_pillar` text to FK. Pillar rollup on dashboard. |
| 6.4 | Learning library | screen | All cycle learnings across goals, filterable by entity/pillar — organizational memory made browsable. |
| 6.5 | SY051 remaining auto-verify kinds | fix | Implement auto-verify for `RLS_POLICY` (check `pg_policies`), `MIGRATION` (check if SQL file exists), `TEST` (check test file exists), `SMOKE_CHECK`, `CUSTOM` (stay manual). `EMAIL_TEMPLATE` + `TELEGRAM_ALERT` (check templates table). |
| 6.6 | SY051 task dependencies UI | screen | Wire the existing `sy_task_deps` table (schema exists, unused) into the SY051 API + page: dependency graph visualization, blocked-task highlighting, topological sort for phase completion order. |

---

## Target Schema (after all phases)

```
op_goals
├── …all existing columns (v2_82–v2_88)…
├── strategic_pillar          ← FK after op_ref_pillars (P6)
├── next_review_at            ← new (P4) — the loop clock
├── last_review_at            ← new (P4)
└── execution_status          ← new (P5) — planning state next to health

op_goal_key_results           -- unchanged; metric_code drives auto-compute

op_goal_kr_snapshots          -- the ONE snapshot table (P1 consolidation)
op_goal_snapshots             ← DROP after migration (P1)

op_goal_checkins              -- unchanged; written by cycle wizard step 2

op_goal_cycles                ← NEW (P4) — one row per loop turn
├── id, tenant_id, goal_id, cycle_number
├── started_at, ended_at, status
├── expected_progress, actual_progress, gap_pct
├── health_at_review, bottleneck_kr_id
├── look_summary, root_cause
├── decision (continue/adjust_tasks/adjust_krs/rebaseline/close + text)
├── learning
└── created_by, created_at

op_goal_metrics_catalog       -- unchanged; entity+period scoping in P3

op_ref_pillars                ← NEW (P6)

op_tasks (OP001)              -- goal_kr_id + ref_object_type='goal_cycle'
                              (existing columns, no migration)

sy_programs (SY051)
├── …existing program/phase/task structure…
├── goal_id                   ← NEW (P5) — program-to-strategy link
└── goal_kr_id                ← NEW (P5)
```

**Net new across all phases:** 2 tables (`op_goal_cycles`, `op_ref_pillars`), 5 columns (`next_review_at`, `last_review_at`, `execution_status`, `sy_programs.goal_id`, `sy_programs.goal_kr_id`), 1 enum value (`no_data` health). Everything else is application-layer wiring.

---

## SY051 — Existing Infrastructure Leveraged

These SY051 capabilities are already built and will be leveraged directly (no changes needed):

| Capability | How the bridge uses it |
|------------|----------------------|
| `sy_program_progress` view | OP002 detail page reads program % for execution section |
| `sy_phase_progress` view | Cycle LOOK step shows phase-level breakdown |
| `sy_task_progress` view | Deliverable-derived status feeds execution progress |
| 20 POST actions (CRUD) | `create_execution` complex path calls `upsert_program` / `upsert_phase` / `upsert_task` |
| `op_goal_id` column | Already exists on `sy_programs` — used for goal-level linking |
| Document management | Programs generated from goals inherit the same doc workflow |
| Auto-verification engine | Programs created via bridge get the same verification |
| Template system (5 seeded) | `generate_execution_draft` uses templates for scaffolding |
| Activation gate | Bridge-created programs still require AI Spec + Impl Plan to activate |

---

## Cross-Module Integration Points

### OP002 → OP001 (simple execution)
- `op_tasks.goal_kr_id` → links task to specific KR (already exists via v2_90)
- `op_tasks.ref_object_type = 'goal_cycle'` + `ref_object_id` → links task to cycle (existing polymorphic columns)
- Review task auto-created by cron when `next_review_at` is due
- Task completion feeds back into cycle LOOK data

### OP002 → SY051 (complex execution)
- `sy_programs.goal_id` + `goal_kr_id` → program-to-strategy link (new P5 columns)
- `generate_from_goal` scaffolds program from goal gap data
- Program status changes auto-update `op_goals.execution_status`
- `sy_program_progress` view read by OP002 for execution section

### SY051 → OP002 (feedback loop)
- Program completion → `execution_status = 'completed'`
- Program progress shown in cycle LOOK step
- "Execution finished, needle didn't move" detection in cron

### Cron orchestration
- Nightly: auto-compute KRs → snapshots → health → roll-up
- Nightly: `next_review_at ≤ now` → open cycle + create review task
- Nightly: health band drop → Telegram alert + pull forward review
- Nightly: review overdue → Telegram escalation
- Monday 08:00: Telegram check-in summary with cycle status

---

## Build Order & Dependencies

```
P1 Fix broken plumbing ──────────────┐
                                     ├──► P3 Trustworthy measurement ──► P4 Goal Cycle ──► P5 Execution Bridge ──► P6 Cleanup
P2 Consolidate UX (parallel with P1) ┘
```

1. **P1** — API actions, snapshot consolidation, cron fix, type merge
2. **P2** — (parallel) unified modal, detail page, list improvements
3. **P3** — entity/period scoped metrics, trajectory UI
4. **P4** — `op_goal_cycles` table, loop driver, review wizard, bottleneck
5. **P5** — execution bridge (OP002 + SY051 tasks together), draft gate, traceability
6. **P6** — dead code, dashboard, pillars, learning library, SY051 extras

**P4 changes the module's identity; P5 changes the system's.** After P4, each goal reviews itself on cadence, surfaces its bottleneck, demands a decision, and accumulates a learning history. After P5, those decisions become structured work in the right system — small corrections flow to OP001, real change programs to SY051 — and the results flow back into the next cycle's diagnosis.

---

## Conventions Checklist

| Convention | Detail |
|-----------|--------|
| Soft-delete | `deleted_at TIMESTAMPTZ` on all new tables, never hard delete |
| Object registry | New tables registered in `bop_objects`. L2 for cycles, L3 for pillars |
| i18n | All user-facing strings via `@des-group/i18n`. 11 locales at parity |
| Mutations via RPC | Status changes through validated RPCs with event writes |
| PBAC scoping | Existing permissions apply; cycles inherit goal PBAC |
| Tenant isolation | `op_goal_cycles` has tenant_id + RLS. `op_ref_pillars` is system-wide |
| Telegram alerting | DesAssistant22bot. Goal number + health + deep link |
| Dev server | `/opt/dessystems-console-dev/`, port 13004 → 4401 |
| Prod deploy | Build in `/opt/dessystems-console/`, copy `.env.local` to `.next/standalone/`, PM2 restart |

---

## Estimated Effort

| Phase | OP002 Tasks | SY051 Tasks | Estimated Sessions |
|-------|-------------|-------------|-------------------|
| P1 — Fix broken plumbing | 7 | 0 | 2–3 |
| P2 — Consolidate UX | 4 | 0 | 3–4 |
| P3 — Trustworthy measurement | 5 | 0 | 2–3 |
| P4 — Goal Cycle | 7 | 0 | 4–6 |
| P5 — Execution Bridge | 6 | 7 | 5–7 |
| P6 — Cleanup + Dashboard | 4 | 2 | 3–4 |
| **Total** | **33** | **9** | **19–27** |

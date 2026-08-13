-- BOP V2 Migration 96 — Register P5+P6 screens in bop_screens + seed documentation
-- New screens: OP013 (Task Analytics), OP014 (Task Timeline), OP015 (Entity Scorecard)
-- Documentation for: OP012, OP013, OP014, OP015 + updated OP001, OP002

-- 1. Register screens in bop_screens
INSERT INTO bop_screens (screen_id, module, func_type, sequence, title, description, route, status, nav_group, nav_order, nav_visible)
VALUES
  ('OP013', 'OPS', 'dashboard', '013', 'Task Analytics',
   'Completion trends, SLA compliance gauge, workload by assignee/dept, priority/status distribution',
   '/console/ops/tasks/analytics', 'active', 'Operations', 93, false),
  ('OP014', 'OPS', 'list', '014', 'Task Timeline',
   'Gantt-style timeline with dependency arrows, priority stripes, today marker',
   '/console/ops/tasks/timeline', 'active', 'Operations', 94, false),
  ('OP015', 'OPS', 'dashboard', '015', 'Entity Scorecard',
   'Per-entity radar chart, KPI grid, goal health donut, period comparison table',
   '/console/ops/goals/scorecard', 'active', 'Operations', 95, false)
ON CONFLICT (screen_id) DO UPDATE SET
  title = EXCLUDED.title, route = EXCLUDED.route, description = EXCLUDED.description, status = EXCLUDED.status;

-- 2. Seed screen documentation in bop_documentation

-- OP001 Operations Cockpit — updated with P5 features
INSERT INTO bop_documentation (target_type, target_id, doc_type, seq, title, body_md, status, owner, module, related_screens)
VALUES
  ('screen', 'OP001', 'overview', 1, 'Operations Cockpit Overview',
   '**OP001 — Operations Cockpit** is the central task management hub. It provides an 8-card KPI strip (Open, Due Today, Overdue, Waiting Input, Waiting Approval, Waiting Dep, Completed Today, SLA At Risk), an urgency-banded work queue, and quick actions per task row. Tasks support 7 statuses, 4 priority levels, SLA tracking with 4-level escalation, and polymorphic object references.

**Views:** Cockpit (default), Grid, Kanban, Calendar, Timeline (OP014), Analytics (OP013).

**P5 Features:** Time tracking (start/stop timer, estimate vs actual hours), recurring tasks (RFC 5545 RRULE — daily/weekly/monthly), Telegram inline actions (Start/Done/Snooze buttons on SLA alerts), task dependencies with cycle detection.

**Quick Add:** Global "+" button opens a modal pre-filling context from the current route. Supports setting estimates and configuring recurrence.',
   'active', 'ai-draft', 'OPS', ARRAY['OP001', 'OP009', 'OP010', 'OP011', 'OP013', 'OP014'])
ON CONFLICT DO NOTHING;

-- OP002 Strategy Cockpit — updated
INSERT INTO bop_documentation (target_type, target_id, doc_type, seq, title, body_md, status, owner, module, related_screens)
VALUES
  ('screen', 'OP002', 'overview', 1, 'Strategy Cockpit Overview',
   '**OP002 — Strategy Cockpit** displays the hierarchical goal tree with expandable rows. Each goal shows health dot, progress bar, entity badge, status badge, and period range. KRs are inline-visible under each goal.

**Summary Cards:** Active, On Track, At Risk, Off Track, Achieved, Avg Progress.

**Filters:** Status dropdown, entity dropdown, text search.

**Navigation:** Links to Exec Dashboard (OP012) and Entity Scorecards (OP015).

**Goal Detail** (`/console/ops/goals/[id]`): Full goal header with close-out buttons, KR cards with sparklines and auto-compute, budget vs actual tracking, linked tasks, check-in form (confidence 1-5), and check-in history.',
   'active', 'ai-draft', 'OPS', ARRAY['OP002', 'OP012', 'OP015'])
ON CONFLICT DO NOTHING;

-- OP012 Exec Dashboard
INSERT INTO bop_documentation (target_type, target_id, doc_type, seq, title, body_md, status, owner, module, related_screens)
VALUES
  ('screen', 'OP012', 'overview', 1, 'Executive Dashboard Overview',
   '**OP012 — Executive Dashboard** provides a strategy-at-a-glance view for leadership.

**Sections:**
- **Vision Banner** — editable vision text from top-level goal
- **KPI Strip** — 5 cards: Active Goals, Avg Progress, On Track, At Risk, Auto KRs
- **Progress Rings** — one per active top-level goal, clickable to detail
- **Attention Required** — panel highlighting at-risk and off-track goals
- **By Entity** — entity lanes (des_mobil, des_campers, des_shop, des_systems, des_group), clickable to Entity Scorecard (OP015)
- **KR Trends** — sparklines for KRs with >1 snapshot
- **Forecast Projections** — linear regression forecast per KR showing current/projected/target values, trend indicator, slope per day
- **Period History** — ledger entries from closed-out periods with KR snapshot chips

**Period Close-out:** "Close Period" button opens a ceremony modal — select goal, mark achieved/semi-achieved, optionally clone to next period (carries forward KRs with updated baselines), add close-out notes. Writes a frozen snapshot to `op_goal_period_ledger`.',
   'active', 'ai-draft', 'OPS', ARRAY['OP012', 'OP015', 'OP002'])
ON CONFLICT DO NOTHING;

-- OP013 Task Analytics
INSERT INTO bop_documentation (target_type, target_id, doc_type, seq, title, body_md, status, owner, module, related_screens)
VALUES
  ('screen', 'OP013', 'overview', 1, 'Task Analytics Overview',
   '**OP013 — Task Analytics** provides operational intelligence on task management.

**Sections:**
- **KPI Strip** — Completed This Period, Open Tasks, SLA Compliance %, Avg Task Age (days)
- **Weekly Chart** — bar chart comparing completed vs created tasks per week
- **SLA Gauge** — semicircle gauge showing SLA compliance percentage
- **Escalation Breakdown** — bar chart of tasks by escalation level (L0–L3)
- **Status Distribution** — horizontal bars showing task count per status
- **Priority Distribution** — horizontal bars by priority level (1=Low to 4=Critical)
- **Workload by Assignee** — stacked bars per assignee showing status breakdown
- **Department Workload** — stacked bars per department

**Period Selector:** 7d / 14d / 30d / 90d toggle via `RangePicker` component.

**API:** `GET /api/bop/ops/tasks/analytics?tenant_id=&days=`',
   'active', 'ai-draft', 'OPS', ARRAY['OP013', 'OP001'])
ON CONFLICT DO NOTHING;

-- OP014 Task Timeline
INSERT INTO bop_documentation (target_type, target_id, doc_type, seq, title, body_md, status, owner, module, related_screens)
VALUES
  ('screen', 'OP014', 'overview', 1, 'Task Timeline Overview',
   '**OP014 — Task Timeline** is a Gantt-style visualization of tasks with due dates.

**Layout:**
- Left column: task labels with priority stripe and task number
- Right area: horizontal bars from `created_at` to `due_at`, color-coded by status
- SVG dependency arrows: bezier curves connecting dependent tasks
- Today marker: vertical red line indicating current date
- Month headers with scrollable viewport

**Color Coding:** open=blue, in_progress=amber, waiting_input=purple, waiting_approval=indigo, blocked=red, done=green (50% opacity), cancelled=grey.

**Priority Stripes:** 1=grey, 2=blue, 3=orange, 4=red — shown as a small bar in the label column.

**Interactions:** Click any task bar or label to navigate to task detail. Refresh button to reload.',
   'active', 'ai-draft', 'OPS', ARRAY['OP014', 'OP001'])
ON CONFLICT DO NOTHING;

-- OP015 Entity Scorecard
INSERT INTO bop_documentation (target_type, target_id, doc_type, seq, title, body_md, status, owner, module, related_screens)
VALUES
  ('screen', 'OP015', 'overview', 1, 'Entity Scorecard Overview',
   '**OP015 — Entity Scorecard** provides a per-entity strategy performance view.

**Entity Selector:** Toggle between des_mobil, des_campers, des_shop, des_systems, des_group.

**Sections:**
- **KPI Grid** — Active Goals, Avg Progress, Closed Goals, Budget Variance
- **Radar Chart** — SVG radar/spider chart plotting KR progress (up to 8 KRs) on a 0–100% scale with grid rings at 25/50/75/100%
- **Health Donut** — donut chart showing on_track/at_risk/off_track distribution with goal list below
- **Key Results** — grid of KR cards with sparklines and progress indicators
- **Period History** — table of past closed-out periods showing goal title, period range, final progress %, and status badge

**Navigation:** Accessible from Exec Dashboard (OP012) entity lane headers and "Scorecards" button. Links back to Dashboard and to individual goal detail pages.

**API:** `GET /api/bop/ops/goals?view=scorecard&tenant_id=&entity=`',
   'active', 'ai-draft', 'OPS', ARRAY['OP015', 'OP012', 'OP002'])
ON CONFLICT DO NOTHING;

-- Budget linkage doc
INSERT INTO bop_documentation (target_type, target_id, doc_type, seq, title, body_md, status, owner, module, related_screens)
VALUES
  ('screen', 'OP002', 'reference', 10, 'Budget vs Actual Tracking',
   '**Budget Linkage** connects goal budgets to actual spend from `fin_invoices` (boekhouding).

**How it works:** When a goal has a `budget` value and a defined period, the system queries `fin_invoices` for AP (accounts payable) invoices within that period and entity scope. The BudgetCard on the goal detail page shows:
- **Budget** — the planned amount (EUR)
- **Spent (AP)** — sum of non-cancelled AP invoices in the period
- **Variance** — budget minus spend (green = under budget, red = over)
- **Progress bar** — percentage of budget consumed

**API:** `GET /api/bop/ops/goals?view=budget-actuals&goal_id=<uuid>`

**Service:** `lib/ops/budget-actuals.ts` — `getGoalBudgetActuals()` and `getBudgetActuals()` functions.',
   'active', 'ai-draft', 'OPS', ARRAY['OP002', 'OP012'])
ON CONFLICT DO NOTHING;

-- Forecast doc
INSERT INTO bop_documentation (target_type, target_id, doc_type, seq, title, body_md, status, owner, module, related_screens)
VALUES
  ('screen', 'OP012', 'reference', 10, 'Forecast Projections',
   '**Forecast Projections** use linear regression on KR snapshots to extrapolate end-of-period values.

**Algorithm:** Least-squares linear regression on daily KR snapshot values. Projects the trend line to the goal''s `period_end` date. Requires at least 2 snapshots for meaningful projection.

**Display:** The Forecast Panel on OP012 shows per-KR cards with:
- Current value, projected end-of-period value, and target
- Trend indicator: Ahead (green), On Pace (yellow), Behind (red)
- Slope per day — the daily rate of change
- Progress bar showing projected completion percentage
- Days remaining in the period

**API:** `GET /api/bop/ops/goals?view=forecast&tenant_id=`

**Service:** `lib/ops/forecast.ts` — `linearForecast()` and `forecastKr()` functions.',
   'active', 'ai-draft', 'OPS', ARRAY['OP012'])
ON CONFLICT DO NOTHING;

-- Period close-out doc
INSERT INTO bop_documentation (target_type, target_id, doc_type, seq, title, body_md, status, owner, module, related_screens)
VALUES
  ('screen', 'OP012', 'reference', 11, 'Period Close-out Process',
   '**Period Close-out** freezes a goal''s state into the historical ledger for cross-period comparison.

**Process:**
1. Open the Close Period modal from the Exec Dashboard (OP012)
2. Select the goal to close
3. Choose outcome: Achieved or Semi-achieved
4. Optionally enable "Clone to next period" — creates a new goal with the same title, entity, owner, budget, and KRs (baselines reset to current values)
5. Add close-out notes summarizing outcomes
6. Submit — writes `op_goal_period_ledger` row with frozen KR snapshot

**Ledger Table:** `op_goal_period_ledger` stores: goal metadata, final status/health/progress, budget + budget_actual, KR snapshot (JSONB array with kr_number, title, progress, values), check-in count, and notes.

**API:** `POST /api/bop/ops/goals` with `action: "close_out"`, `goal_id`, `achieved`, `clone_next_period`, `notes`
**History:** `GET /api/bop/ops/goals?view=ledger-history&tenant_id=`',
   'active', 'ai-draft', 'OPS', ARRAY['OP012'])
ON CONFLICT DO NOTHING;

# BOP V2 — STR-P2: Auto-Compute & Metrics Bridge — Test Guide

| Field        | Value                                      |
|--------------|--------------------------------------------|
| Phase        | STR-P2 (Strategy Phase 2)                  |
| Tasks        | T4.1 – T4.7 (7 tasks)                     |
| Date         | 2026-08-11                                 |
| Tester       |                                            |
| Environment  | DEV: bop-dev.dessystems.io / PROD: bop.dessystems.io |
| Supabase     | ttydqyiezarpdysqacaa                       |
| API base     | http://127.0.0.1:13004 (local dev)         |

---

## Prerequisites

- [ ] Logged in to bop-dev.dessystems.io with an admin account
- [ ] Access to Supabase dashboard (ttydqyiezarpdysqacaa) or `psql` / SQL Editor
- [ ] Terminal access to the dev server (`/opt/dessystems-console-dev`)
- [ ] PM2 running (`pm2 list` shows `dessystems-console-dev` and `ops-goals-cron`)
- [ ] Browser: Chrome or Firefox, latest version
- [ ] At least one active goal with KRs exists in the system (if not, create via /console/ops/goals)

---

## T4.1 — op_goal_metrics_catalog Table + 9 Seed Metrics

**Type:** Database  
**Source SQL:** `sql_bop_v2_89_metrics_catalog.sql`

### Test Procedure

**Step 1 — Verify table exists and schema is correct**

Run in Supabase SQL Editor:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'op_goal_metrics_catalog'
ORDER BY ordinal_position;
```

**Expected columns:**

| column_name   | data_type                | is_nullable |
|---------------|--------------------------|-------------|
| code          | text                     | NO          |
| name_i18n     | jsonb                    | NO          |
| metric_type   | text                     | NO          |
| unit_label    | text                     | NO          |
| entity_scoped | boolean                  | NO          |
| query_key     | text                     | NO          |
| description   | text                     | YES         |
| created_at    | timestamp with time zone | NO          |

- [ ] Schema matches

**Step 2 — Verify all 9 metric codes are seeded**

```sql
SELECT code, metric_type, unit_label, entity_scoped, query_key
FROM op_goal_metrics_catalog
ORDER BY code;
```

**Expected 9 rows:**

| code                       | metric_type | unit_label | entity_scoped | query_key                  |
|----------------------------|-------------|------------|---------------|----------------------------|
| avg_days_to_sale           | avg         | days       | true          | avg_days_to_sale           |
| gross_margin_sum           | sum         | €          | true          | gross_margin_sum           |
| inquiries_count            | count       | leads      | true          | inquiries_count            |
| inquiry_to_sale_conversion | ratio       | %          | true          | inquiry_to_sale_conversion |
| nps_avg                    | avg         | score      | false         | nps_avg                    |
| revenue_invoiced           | sum         | €          | true          | revenue_invoiced           |
| review_score_avg           | avg         | ★          | false         | review_score_avg           |
| stock_count                | count       | units      | true          | stock_count                |
| vans_sold                  | count       | units      | true          | vans_sold                  |

- [ ] All 9 rows present
- [ ] name_i18n contains `en`, `nl`, `de` keys for each row

**Step 3 — Verify metric_code FK on op_goal_key_results**

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'op_goal_key_results' AND column_name = 'metric_code';
```

- [ ] Column exists with type `text`

**Step 4 — Verify FK constraint**

```sql
SELECT conname FROM pg_constraint
WHERE conrelid = 'op_goal_key_results'::regclass
  AND confrelid = 'op_goal_metrics_catalog'::regclass;
```

- [ ] FK constraint exists

**Step 5 — Verify index on metric_code**

```sql
SELECT indexname FROM pg_indexes
WHERE tablename = 'op_goal_key_results' AND indexname LIKE '%metric_code%';
```

- [ ] Index `idx_op_goal_kr_metric_code` exists

---

## T4.2 — computeMetric() Service with 9 Query Keys

**Type:** API  
**Service file:** `/opt/dessystems-console-dev/lib/ops/compute-metric.ts`  
**API endpoint:** `POST /api/bop/ops/goals` with `action: "compute_kr"`

### Test Procedure

**Step 1 — Verify API returns metrics catalog**

```bash
curl -s 'http://127.0.0.1:13004/api/bop/ops/goals?view=metrics_catalog' \
  -H 'Cookie: <session_cookie>' | jq '.metrics | length'
```

- [ ] Returns 9 metrics

**Step 2 — Test compute_kr for each metric**

First, create (or find) a KR with each metric_code. For each of the 9 codes, set up a KR and call compute:

```bash
# Replace <KR_ID> with an actual KR ID that has metric_code set
curl -s -X POST 'http://127.0.0.1:13004/api/bop/ops/goals' \
  -H 'Content-Type: application/json' \
  -H 'Cookie: <session_cookie>' \
  -d '{"action":"compute_kr","kr_id":"<KR_ID>"}' | jq
```

**Expected response structure:**

```json
{
  "key_result": {
    "id": "<KR_ID>",
    "current_value": <number>,
    "progress_pct": <number between 0-100>
  },
  "metric_result": {
    "value": <number>,
    "count": <number>,
    "query_key": "<metric_query_key>",
    "period_start": "<date>",
    "period_end": "<date>"
  }
}
```

**Test each metric with expected data sources:**

| # | metric_code                | Source table             | Test input (entity) | Expected behavior                       |
|---|----------------------------|--------------------------|---------------------|-----------------------------------------|
| 1 | vans_sold                  | ast_lifecycle_events     | (optional)          | Count of `event_type='sold'` in period  |
| 2 | revenue_invoiced           | fin_invoices             | (optional)          | Sum of `gross` for non-cancelled        |
| 3 | gross_margin_sum           | ast_assets               | (optional)          | Sum of selling_price - cost_price       |
| 4 | avg_days_to_sale           | ast_assets               | (optional)          | Avg days between created_at and sold_at |
| 5 | inquiries_count            | crm_leads                | (optional)          | Count of leads in period                |
| 6 | inquiry_to_sale_conversion | crm_leads                | (optional)          | Ratio of won leads to total (%)         |
| 7 | nps_avg                    | sal_surveys              | N/A (not scoped)    | Average nps_score                       |
| 8 | review_score_avg           | sal_surveys              | N/A (not scoped)    | Average review_score                    |
| 9 | stock_count                | ast_assets               | (optional)          | Count where status IN (available, reserved) |

- [ ] All 9 metrics compute without error
- [ ] Values match manual SQL verification against source tables
- [ ] Error returned for unknown metric_code: `"KR has no metric_code"` (status 400)

**Step 3 — Verify entity scoping works**

For entity-scoped metrics (vans_sold, revenue_invoiced, etc.), confirm the query filters by `entity` when the parent goal has an entity set.

```sql
-- Pick a goal with entity set
SELECT id, entity FROM op_goals WHERE entity IS NOT NULL LIMIT 1;
```

- [ ] Compute returns filtered results when goal has entity

**Step 4 — Verify period boundaries**

Confirm the metric uses goal's `period_start` and `period_end`:

```sql
SELECT g.period_start, g.period_end, kr.id as kr_id, kr.metric_code
FROM op_goal_key_results kr
JOIN op_goals g ON g.id = kr.goal_id
WHERE kr.metric_code IS NOT NULL
LIMIT 3;
```

- [ ] Computed values respect the goal's period boundaries

---

## T4.3 — Nightly Computation Cron + KR Snapshots

**Type:** Cron / Database  
**Script:** `/opt/dessystems-console-dev/scripts/ops-goals-cron.mjs`  
**PM2 process:** `ops-goals-cron`

### Test Procedure

**Step 1 — Verify PM2 process is running**

```bash
pm2 list | grep ops-goals-cron
```

- [ ] Status is `online`
- [ ] Uptime shows reasonable value (not recently crashed)

**Step 2 — Check cron logs**

```bash
pm2 logs ops-goals-cron --lines 50
```

**Expected log output contains:**
- `[goals-cron] Starting ops-goals-cron`
- `[goals-cron] Next nightly tick in <N> min`
- `[goals-cron] Next Monday check-in in <N> hours`
- After a tick: `[goals-cron] Nightly done: <N> auto-computed, <M> snapshots, <K> goals rolled up`

- [ ] Cron logs show successful execution
- [ ] No persistent errors in logs

**Step 3 — Verify op_goal_kr_snapshots table exists**

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'op_goal_kr_snapshots'
ORDER BY ordinal_position;
```

**Expected columns:**
- kr_id (uuid / text)
- snapshot_date (date / text)
- value (numeric)
- progress_pct (numeric)

- [ ] Table schema correct

**Step 4 — Verify snapshot data exists**

```sql
SELECT snapshot_date, COUNT(*) as snapshot_count
FROM op_goal_kr_snapshots
GROUP BY snapshot_date
ORDER BY snapshot_date DESC
LIMIT 10;
```

- [ ] Recent dates have snapshot entries
- [ ] Each active KR has at least one snapshot per nightly run

**Step 5 — Verify upsert behavior (no duplicates)**

```sql
SELECT kr_id, snapshot_date, COUNT(*)
FROM op_goal_kr_snapshots
GROUP BY kr_id, snapshot_date
HAVING COUNT(*) > 1;
```

- [ ] Returns 0 rows (unique constraint on kr_id + snapshot_date)

**Step 6 — Verify goal rollup after cron**

```sql
SELECT id, goal_number, title, progress_pct, health
FROM op_goals
WHERE status = 'active' AND deleted_at IS NULL
ORDER BY goal_number;
```

- [ ] progress_pct values are between 0 and 100
- [ ] health is one of: `on_track`, `at_risk`, `off_track`

**Step 7 — Force a manual nightly tick (optional)**

```bash
pm2 restart ops-goals-cron
```

Then wait 5 seconds and check logs:

```bash
pm2 logs ops-goals-cron --lines 20
```

- [ ] Initial tick runs on restart and logs results

---

## T4.4 — op_tasks.goal_kr_id FK Bridge

**Type:** Database / API  
**Source SQL:** `sql_bop_v2_90_goal_kr_bridge.sql`  
**API endpoint:** `POST /api/bop/ops/tasks`

### Test Procedure

**Step 1 — Verify column exists**

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'op_tasks' AND column_name = 'goal_kr_id';
```

- [ ] Column `goal_kr_id` exists

**Step 2 — Verify FK constraint**

```sql
SELECT conname, confrelid::regclass
FROM pg_constraint
WHERE conrelid = 'op_tasks'::regclass
  AND conname LIKE '%goal_kr%';
```

- [ ] FK constraint references `op_goal_key_results`

**Step 3 — Create a task with goal_kr_id via API**

```bash
# Get an existing KR ID
# Then create a task linked to it
curl -s -X POST 'http://127.0.0.1:13004/api/bop/ops/tasks' \
  -H 'Content-Type: application/json' \
  -H 'Cookie: <session_cookie>' \
  -d '{
    "title": "TEST — linked to KR",
    "goal_kr_id": "<EXISTING_KR_ID>",
    "status": "todo"
  }' | jq
```

- [ ] Task created successfully with goal_kr_id populated

**Step 4 — Verify FK enforcement (invalid KR ID)**

```bash
curl -s -X POST 'http://127.0.0.1:13004/api/bop/ops/tasks' \
  -H 'Content-Type: application/json' \
  -H 'Cookie: <session_cookie>' \
  -d '{
    "title": "TEST — bad FK",
    "goal_kr_id": "00000000-0000-0000-0000-000000000000",
    "status": "todo"
  }' | jq
```

- [ ] Returns error (FK violation)

**Step 5 — Verify linked tasks show on goal detail**

Navigate to `bop-dev.dessystems.io/console/ops/goals/<GOAL_ID>` where the goal has a KR with linked tasks.

- [ ] Linked tasks section shows the task created in Step 3

**Step 6 — Clean up test task**

```sql
DELETE FROM op_tasks WHERE title = 'TEST — linked to KR';
DELETE FROM op_tasks WHERE title = 'TEST — bad FK';
```

---

## T4.5 — Executive Dashboard (OP012)

**Type:** UI  
**URL:** `bop-dev.dessystems.io/console/ops/goals/dashboard`  
**Page file:** `/opt/dessystems-console-dev/app/console/ops/goals/dashboard/page.tsx`

### Test Procedure

**Step 1 — Navigate to dashboard**

Open: `https://bop-dev.dessystems.io/console/ops/goals/dashboard`

- [ ] Page loads without errors (check browser console)
- [ ] No 500/404 errors

**Step 2 — Vision banner**

- [ ] A banner or header section is visible at top
- [ ] Displays company vision/strategy context

**Step 3 — Progress rings**

- [ ] Each active top-level goal shows a circular progress ring
- [ ] Ring color codes: green (>=75%), amber (>=40%), red (<40%)
- [ ] Percentage label inside ring matches goal's progress_pct

**Step 4 — Attention Required / At-Risk panel**

- [ ] If any goals have health `at_risk` or `off_track`, an "Attention Required" red panel appears
- [ ] Each at-risk goal is listed with health badge and progress %
- [ ] Clicking a goal navigates to its detail page

**Step 5 — Entity lanes**

- [ ] Goals are grouped by entity (e.g., DES-NL, DES-DE, DES-BE)
- [ ] Each entity lane shows a colored badge with entity label
- [ ] Goal count per entity is displayed

**Step 6 — Trend charts / Sparklines**

- [ ] KR sparklines render using `<Spark>` component
- [ ] Sparklines use snapshot data (verify data points match `op_goal_kr_snapshots`)

**Step 7 — API verification**

```bash
curl -s 'http://127.0.0.1:13004/api/bop/ops/goals?view=exec_summary' \
  -H 'Cookie: <session_cookie>' | jq 'keys'
```

- [ ] Response contains: `goals`, `key_results`, `snapshots`, `auto_kr_count`

```bash
curl -s 'http://127.0.0.1:13004/api/bop/ops/goals?view=dashboard_summary' \
  -H 'Cookie: <session_cookie>' | jq '.summary'
```

- [ ] Response contains: `total`, `active`, `achieved`, `on_track`, `at_risk`, `off_track`, `avg_progress`

---

## T4.6 — Monday Check-in Telegram Prompt Cron

**Type:** Cron / Integration  
**Script:** `/opt/dessystems-console-dev/scripts/ops-goals-cron.mjs` (mondayCheckin function, line 165)  
**PM2 process:** `ops-goals-cron` (same process as T4.3)

### Test Procedure

**Step 1 — Verify environment variables**

```bash
pm2 env 11 | grep -i telegram
```

Or check `.env`:

```bash
grep -i telegram /opt/dessystems-console-dev/.env 2>/dev/null | sed 's/=.*/=***/'
```

- [ ] `BOP_TELEGRAM_BOT_TOKEN` or `TELEGRAM_BOT_TOKEN` is set
- [ ] `BOP_TELEGRAM_CHAT_ID` or `TELEGRAM_CHAT_ID` is set

**Step 2 — Verify Monday scheduling in logs**

```bash
pm2 logs ops-goals-cron --lines 30 | grep -i monday
```

- [ ] Log shows `Next Monday check-in in <N> hours`

**Step 3 — Verify mondayCheckin message format**

The function queries `op_goals` with `status='active'` and `level=0`, then sends a Telegram message with format:

```
📅 Monday Strategy Check-in

✅ G-001 Goal Title — 72%
⚠️ G-002 Another Goal — 35%

🔗 Open Dashboard
```

To test manually (without waiting for Monday), you can trigger via node:

```bash
cd /opt/dessystems-console-dev
node -e "
  process.env.NEXT_PUBLIC_SUPABASE_URL = '$(grep NEXT_PUBLIC_SUPABASE_URL .env | cut -d= -f2-)';
  process.env.SUPABASE_SERVICE_ROLE_KEY = '$(grep SUPABASE_SERVICE_ROLE_KEY .env | cut -d= -f2-)';
  process.env.BOP_TELEGRAM_BOT_TOKEN = '$(grep -E 'BOP_TELEGRAM_BOT_TOKEN|TELEGRAM_BOT_TOKEN' .env | head -1 | cut -d= -f2-)';
  process.env.BOP_TELEGRAM_CHAT_ID = '$(grep -E 'BOP_TELEGRAM_CHAT_ID|TELEGRAM_CHAT_ID' .env | head -1 | cut -d= -f2-)';
  import('./scripts/ops-goals-cron.mjs');
" 2>&1 | head -20
```

(Note: this will also trigger a nightly tick on startup. Use with caution.)

- [ ] Telegram message received in the configured chat
- [ ] Message contains active top-level goals with health icons
- [ ] Dashboard link points to `https://bop.dessystems.io/console/ops/goals/dashboard`

**Step 4 — Verify health-change notifications**

When the nightly cron detects a goal's health changed (e.g., `on_track` -> `at_risk`), it sends an alert:

```
⚠️ Goal health changed: on_track → at_risk
🔗 https://bop.dessystems.io/console/ops/goals/<GOAL_ID>
```

- [ ] Health change alerts are sent (can verify from Telegram chat history)

---

## T4.7 — KR Sparklines + Metric Chips on Goal Detail

**Type:** UI  
**URL:** `bop-dev.dessystems.io/console/ops/goals/<GOAL_ID>`  
**Page file:** `/opt/dessystems-console-dev/app/console/ops/goals/[id]/page.tsx`

### Test Procedure

**Step 1 — Open a goal with auto-computed KRs**

Find a goal that has KRs with `metric_code` set:

```sql
SELECT g.id, g.goal_number, g.title, kr.kr_number, kr.metric_code
FROM op_goals g
JOIN op_goal_key_results kr ON kr.goal_id = g.id
WHERE kr.metric_code IS NOT NULL AND g.deleted_at IS NULL
LIMIT 5;
```

Navigate to: `https://bop-dev.dessystems.io/console/ops/goals/<GOAL_ID>`

- [ ] Page loads without errors

**Step 2 — Metric chip (auto-compute badge)**

For each KR with `metric_code`:

- [ ] A chip/badge displays `Auto·<metric_code>` (e.g., `Auto·vans_sold`)
- [ ] Badge is visually distinct (colored background)

**Step 3 — Compute button**

- [ ] A "⟳ Compute" button appears next to auto-computed KRs
- [ ] Clicking it triggers `POST /api/bop/ops/goals` with `{"action":"compute_kr","kr_id":"..."}`
- [ ] After compute, `current_value` and `progress_pct` update on the page
- [ ] Goal's overall progress re-rolls up after compute

**Step 4 — KR sparkline**

- [ ] A `<Spark>` sparkline chart renders for each KR
- [ ] Sparkline uses data from `op_goal_kr_snapshots`
- [ ] Color is green (#10b981) when progress >= 60%, indigo (#6366f1) otherwise
- [ ] Height is 32px

Verify snapshot data for the KR:

```sql
SELECT snapshot_date, value, progress_pct
FROM op_goal_kr_snapshots
WHERE kr_id = '<KR_ID>'
ORDER BY snapshot_date DESC
LIMIT 10;
```

- [ ] Sparkline data points match snapshot records

**Step 5 — Manual KR (no metric_code)**

Open a goal with a KR that has NO metric_code:

- [ ] No "Auto·..." chip appears
- [ ] No "⟳ Compute" button appears
- [ ] Manual value input field is available instead
- [ ] Sparkline still renders (from snapshots created by nightly cron)

**Step 6 — Linked tasks**

If the goal has tasks linked via `goal_kr_id`:

- [ ] Linked tasks section shows task_number, title, and status
- [ ] Tasks are grouped under their respective KR

---

## Summary Checklist

| Task | Description                              | Status |
|------|------------------------------------------|--------|
| T4.1 | Metrics catalog table + 9 seeds          | [ ]    |
| T4.2 | computeMetric() service — 9 query keys   | [ ]    |
| T4.3 | Nightly cron + KR snapshots              | [ ]    |
| T4.4 | op_tasks.goal_kr_id FK bridge            | [ ]    |
| T4.5 | Executive dashboard (OP012)              | [ ]    |
| T4.6 | Monday Telegram check-in cron            | [ ]    |
| T4.7 | KR sparklines + metric chips on detail   | [ ]    |

**Overall Result:** [ ] PASS / [ ] FAIL

**Notes:**

---

## Appendix: SY051 — Uploading This Document

To upload this test guide to the BOP implementation docs system, use the impl-docs API:

**Endpoint:** `POST /api/bop/sys/impl/docs`

**Request:** multipart/form-data with fields:
- `program_id` — the implementation program ID for STR-P2
- `doc_type` — use `impl_plan` 
- `file` — the file to upload (max 10 MB total per program)

```bash
curl -X POST 'https://bop-dev.dessystems.io/api/bop/sys/impl/docs' \
  -H 'Cookie: <session_cookie>' \
  -F 'program_id=<STR_P2_PROGRAM_ID>' \
  -F 'doc_type=impl_plan' \
  -F 'file=@/root/dessystems-web-dev/bop_v2_str_p2_test_guide.md'
```

**List uploaded docs:**

```bash
curl -s 'https://bop-dev.dessystems.io/api/bop/sys/impl/docs?program_id=<STR_P2_PROGRAM_ID>' \
  -H 'Cookie: <session_cookie>' | jq
```

**Storage bucket:** `impl-docs` in Supabase, path pattern: `<program_id>/<doc_type>_<filename>`

# SY051 Implementation Cockpit — UX Update Plan (SY051-UX2)

**Date:** 2026-08-23 · **Owner:** Sunay · **Screen:** SY051 `/console/sys/impl`
**File:** `app/console/sys/impl/page.tsx` · **API:** `app/api/bop/sys/impl/route.ts`

## Problem statement

1. **Back button exits the screen.** It calls `window.history.back()` (page.tsx:473), which leaves SY051 entirely. There is currently no "main SY051 screen" to go back to — the page is a single view where selecting a program swaps in its detail.
2. **No program overview.** All implementations are only reachable through the program dropdown; there is no ordered, filterable list.
3. **Done programs clutter the picker.** Finished implementations (status `done`) always appear.

## Scope of change

### 1. Two-level navigation: Main screen ↔ Program detail

- **Main screen** (new): shown when no program is selected (`selProgramId === ''`). Contains the KPI summary strip (already exists) + the new **All Implementations table** (below).
- **Program detail**: the existing tree/dashboard view, shown when a program is selected.
- **Back button behaviour:**
  - In program detail → `setSelProgramId('')` — returns to the SY051 main screen (never leaves SY051).
  - On the main screen → hidden (nav/breadcrumbs already handle leaving the screen).
- Selecting a program (from the table row or the dropdown) opens detail; deep-link support via `?program=<id>` query param preserved on refresh.

### 2. All Implementations table (main screen)

One row per program. Columns:

| Column | Source | Notes |
|--------|--------|-------|
| Code | `code` | click → opens program detail |
| Title | `title` (locale-aware) | |
| Status | `status` | badge (draft / active / test / done) |
| Owner | `owner` | |
| Progress | `pct` + `verified_tasks/total_tasks` | bar + fraction |
| Target date | `target_date` | |
| **Created date** | `created_at` | new column |
| **Updated date** | `updated_at` | new column |
| **Completed date** | `completed_at` | **new DB column** (see §4) |

- **Default sort: `updated_at` descending.** Every column header click-sortable (asc/desc toggle).
- **Filters row** above the table:
  - Status multi-select (draft / active / test / done)
  - Owner select (distinct owners)
  - Free-text search on code + title
  - Date-range filter on updated_at (from/to)

### 3. "Show done" checkbox

- Checkbox labelled **"Show done"** on the main screen filter row **and** next to the program dropdown.
- **Default: unchecked on screen launch → programs with status `done` are hidden** from both the table and the dropdown.
- Checking it reveals done programs (table + dropdown). State is screen-local (resets to unchecked on next visit — per requirement "while launch the screen by default add unchecked").
- Edge case: if a done program is opened via deep-link `?program=`, it still opens (the filter governs listing, not access).

### 4. Data model — migration `sql/sy_module_patch_completed_at.sql`

```sql
ALTER TABLE sy_programs ADD COLUMN IF NOT EXISTS completed_at timestamptz;
-- Backfill: existing done programs get completed_at = updated_at
UPDATE sy_programs SET completed_at = updated_at WHERE status = 'done' AND completed_at IS NULL;
```

- API `update_program_status`: when status transitions to `done` → stamp `completed_at = now()`; when leaving `done` → clear it.
- `list_programs` (GET) response extended with `created_at`, `updated_at`, `completed_at`.

### 5. Out of scope

- No changes to tree view, dashboard tab, drawers, documents, or verify flows.
- No pagination (program count is small); table renders all rows.
- No persistence of filter state across sessions.

## Acceptance criteria

1. Back in program detail returns to SY051 main screen; the browser stays on `/console/sys/impl`.
2. Main screen shows the table sorted by updated date, newest first, on load.
3. Created / Updated / Completed date columns render; Completed is empty unless status = done.
4. On launch, "Show done" is unchecked and done programs are absent from table and dropdown; checking it reveals them without a reload.
5. Setting a program to done stamps `completed_at`; reverting clears it.
6. All filters combine (AND) and work together with column sorting.

## Effort

~half a day: migration (15 min, user applies), API touch (30 min), main-screen table + filters + back logic (2–3 h), tests (45 min).

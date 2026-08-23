# CI001 ↔ BOP Infrastructure Alignment Audit

**Date:** 2026-08-22
**Scope:** DESSHOP_CI001_IMPLEMENTATION_PLAN.md vs the live dessystems-web-dev codebase + live Supabase schema.
**Method:** Three parallel deep-inspection passes (jobs/scripts infra, console/API/PBAC patterns, data-layer conventions) plus live database verification.

---

## 1. Verdict in one paragraph

The CI001 plan is architecturally *consistent* with BOP conventions (integer tenant_id RLS, bop_objects registration, `-- ROLLBACK:` blocks, PM2 jobs, CockpitKit screens) and does **not** duplicate existing infrastructure in its core — the BOP has **no** prior daily-fact/aggregation layer, no event store, no job-run log. The similarity you noticed is real but shallow: the existing **ANL module** (22 `anl/` screens + `anl-snapshot.cjs` + `dm_activity_sessions`) covers general web analytics and *overlaps CI001 on sessions/traffic only*; the plan's Appendix B already scopes that coexistence. The real problems found are not duplication but **five concrete defects** in what we built during R1 (three would fail at runtime, one already shipped in a broken SQL bundle — now fixed), plus a set of plan-vs-reality drifts to correct before R2.

---

## 2. CRITICAL defects found (fix before anything else)

### D1. `bop_objects` column mismatch in the 4 pending migrations — FIXED
`sql_bop_v2_107/108/110/111` inserted into `(object_id, object_type, owner_module, table_name, status, classification, description)`. The **live table** (verified via REST) has `(object_id, type, module, name, route, source_path, description, status, criticality, protection_lvl, lifecycle_state, …)` — the applied migrations 101–105 used the correct shape. The four pending files would have failed with `column "object_type" does not exist`.
**Status: fixed in-place** — all four files now use `(object_id, type, module, name, status, description)` with the L2 label folded into the description, and `all_r1_migrations.sql` was regenerated.

### D2. `shop_orders` has NO `tenant_id` — aggregation code breaks at runtime
Verified live: `column shop_orders.tenant_id does not exist` (42703). But:
- `lib/ci/aggregate.ts` filters `shop_orders`, `shop_variants`, `shop_shipments`, `shop_returns`, `shop_refunds` on `.eq('tenant_id', …)`
- `lib/ci/data-health.ts` (revenue + order-count reconciliation) does the same
- `lib/ci/contribution.ts` selects `tenant_id` from `shop_orders`

Every Plane-A aggregation and both reconciliation health checks will error — not "return zero rows", *error*. The `shop_*` tables are DESShop-native (single-tenant DB, tenant 400 by construction) and none of them carry tenant_id; no migration anywhere creates it.
**Fix (recommended):** drop the `tenant_id` filter on all `shop_*` reads in `lib/ci/*` and keep writing the constant `tenant_id = 400` on `ci_*` rows (which DO have the column). Do not add tenant_id to shop_* — that is a DESShop schema decision outside CI001 scope.

### D3. Two competing job runners; the newer one cannot work
- `lib/ci/job-runner.ts` (CI-T04 era): table-based lock on `ci_job_run` (`status='running'` row), writes `finished_at`, statuses `success/failed/skipped` — **matches the applied DDL** (`sql_bop_v2_104`: CHECK status IN ('running','success','failed','skipped'), column `finished_at`).
- `lib/ci/ci-runner.ts` (CI-T13): `sb.rpc('pg_try_advisory_lock')` — **no such RPC is exposed to PostgREST** (it's a Postgres builtin; PostgREST cannot call it without a SQL wrapper), so `acquireLock` always returns false and every job reports `skipped`. It also writes `ended_at` and status `'completed'` — **neither exists in the DDL**; every insert violates the CHECK constraint.
- `lib/ci/data-health.ts` `aggregation_freshness` reads `ended_at` — same schema mismatch.
- The CI-T13 test suite only string-matches the source, which is why none of this was caught.

**Fix:** consolidate on `job-runner.ts`'s table-lock approach (works over PostgREST, matches DDL), port `dateRange`/`backfill`/retry-backoff into it, delete or rewrite `ci-runner.ts`, and fix `data-health.ts` to read `finished_at`.

### D4. Missing `WITH CHECK` + wrong policy names on new tables — FIXED
All 15 new policies (12 `ci_daily_*`, `ci_restatement`, `ci_data_health`, `ci_ad_spend_daily`) had `USING` only (writes unguarded) and were named `<t>_tenant` instead of the repo convention `<t>_tenant_isolation` (used by `op_tasks`, `ci_events`, etc.).
**Status: fixed in-place** in the four migration files.

### D5. `lib/ci` is entirely unwired
Nothing in `app/` or `scripts/` imports anything from `lib/ci/`. No `ci-*.mjs` scripts exist, no PM2 entries, no API routes in the console. The module is currently "library + tests". This is expected at end-of-R1 (scripts are R1's remaining glue; screens are R2) — but the SY051 deliverables `scripts/ci-*.mjs` and `ecosystem.config.js entries` were marked verified while only the underlying lib logic exists. Flagged for honesty: the .mjs wrappers still need to be written when wiring up PM2.

---

## 3. The "similar structures" you noticed — what's duplication vs. what's not

| Existing BOP structure | CI001 equivalent | Verdict |
|---|---|---|
| `anl/*` screens (22), `anl-snapshot.cjs` → `anl_daily_snapshots`, `dm_activity_sessions` | `ci_sessions`, `ci_daily_traffic`, planned traffic screens | **Partial overlap, accepted by plan Appendix B.** ANL = general web analytics for all tenants/sites; CI001 = DESShop commerce intelligence with money. Keep both; do NOT rebuild realtime/CDN views in CI001. |
| `an/{funnel,traffic,listing-perf}` (AN002–AN006) using CockpitKit | CI001 funnel/traffic screens (R2) | **Closest overlap in the whole audit.** R2 screens should be compared against these before building — same components, same look. Risk of building a second funnel screen with different numbers. Recommendation: CI001 versions replace/supersede the `an/` ones for DESShop, or clearly badge planes and data source. |
| `op_goal_period_ledger` (frozen period-close snapshots) | `ci_restatement` | Conceptual sibling ("a settled figure changed"), different domain. No consolidation needed; borrow its period-close semantics for CI-T10 settled windows. |
| 4 private copies of `sendTelegram()` (`lib/ops/notify.ts`, `lib/shop/notify.ts`, `lib/support/notify.ts`, 3 cron scripts) | Plan says "alerts via `lib/shop/notify.ts`" | **The plan's target doesn't exist**: `lib/shop/notify.ts` has 9 specific notifiers but no generic export. Add one exported `sendTelegram(text)` (or a `notifyCiHealthRed()`) there rather than a 5th copy. Conventions to follow: `BOP_TELEGRAM_*` env, HTML parse mode, non-blocking try/catch, deep link to bop.dessystems.io. |
| `CockpitKit.tsx` (`Kpi`, `Spark`, `Bars`, `Dot`, `RangePicker`, `Section`), `Charts.tsx`, `DataGrid.tsx`, `ScreenHeader` | Plan CI-T16 "KpiCard + CockpitKit extensions" | **Correctly planned as extension, not duplication.** There is no shared `KpiCard` today (4 local copies in various screens) — CI-T16 fills a real gap. Must extend `components/CockpitKit.tsx`, not fork it. |
| `scripts/anl-snapshot.cjs` CLI convention (`node script 2026-07-01`, `--backfill 90`, `TENANTS` env) | Plan `--daily`, `--date`, `--from/--to` | No existing `--from/--to/--dry-run` convention anywhere — CI001 is free to set it. Keep `anl-snapshot`'s positional-date fallback for muscle-memory compatibility. |
| `die-worker.mjs` `FOR UPDATE SKIP LOCKED` claim pattern | `ci-runner` advisory lock | The BOP's only proven concurrency pattern is row-claim locks, which also work through PostgREST. Another argument for the table-lock runner (D3). |
| `bop_screens` + `lib/screen-registry.ts` + `validate-structure.sh` | 10 new screens under `shp/analytics/` | R2 screens MUST get screen codes (SH0xx range or new CI range), registry entries, `ScreenHeader`, and nav wiring — otherwise `validate-structure.sh` fails the build. Plan doesn't mention screen-code allocation: **decide codes before CI-T17**. |

---

## 4. Plan-vs-reality drift (correct the plan, not the code)

1. **Migrations live in repo root**, not `sql/` — all 41 `sql_bop_v2_*` files. Plan §5.3/§17 says `sql/`. Follow the repo; update the plan.
2. **File numbering drift:** plan lists `v2_106_ci001_sessions` (folded into 105 in reality) and `v2_108_ci001_scoring` / `v2_109_ci001_attention` (108 is restatement in reality; scoring/attention SQL not yet written). Renumber the plan: scoring → 112, attention → 113.
3. **Collect endpoint lives in desshop-web** (`/root/desshop-web/app/api/ci/collect/route.ts`), not in the console repo as plan §17 implies. Both repos share the same Supabase project (verified: same URL), so events land in the same `ci_events`. Keep it in desshop-web (no CORS, storefront-local rate limiting); update plan §12.1/§17.
4. **Tests live in `lib/ci/__tests__/`**, plan says `__tests__/ci001/`. Also `npm run ci:verify` is not registered in `package.json` (scripts = dev/build/start/lint only). Add the script entry when wiring R1 gate for real.
5. **`bop_doc_flow` governance rule is aspirational.** The live `bop_doc_flow` is a SAL document-chain table (lead→quotation→order→invoice), with two competing schemas of its own. No migration ever writes a DDL-governance row there; none of the applied CI001 migrations did either. Either drop the rule from plan §5.3/§18 or build the actual mechanism.
6. **PBAC is written but unenforced anywhere in the console.** `lib/pbac-guard.ts requirePermission()` has zero call sites; most `app/api/bop/**` routes have no auth beyond the service-role client. Plan CI-T15's "PBAC enforced (403 on missing perm)" would be the FIRST enforcement in the codebase, and `lib/pbac.ts MODULES` currently only knows `markets.*` — the `analytics.*` domain must be added there first. Budget extra effort for CI-T15.
7. **i18n reality:** console screen bodies are hardcoded English; only nav + screen titles are translated; `validate-structure.sh` checks nav keys only. Plan CI-T24's "missing translation key fails CI" needs a new check, and "i18n NL/EN/DE/FR/TR completeness" for screen bodies would exceed what any existing BOP screen does. Recommend: match the existing bar (nav + `screens.{ID}` titles + key labels), not full-body translation.
8. **`ecosystem.config.js` env-injection style is inconsistent** across existing jobs and contains a hardcoded service-role key in plaintext (3 occurrences — pre-existing security issue worth fixing independently). For `ci-*` jobs, follow the `ops-recurrence-cron` style: `NODE_ENV` only, script reads `.env.local` itself.
9. **Module code:** `ci_*` objects register under module `SHP` (no `CI` module code exists in CLAUDE.md's prefix table). Consistent so far — keep SHP, or formally add a CI module code; don't mix.
10. **`shop_product_cost` / `shop_cost_parameter` under `shop_` prefix** — plan specified this and migrations followed; noted as intentional (they extend the DESShop commerce schema, not the CI analytics layer).

---

## 5. What is genuinely fine

- Two-plane architecture, event store partitioning (`ci_events` is the first and only partitioned table — a net-new pattern, correctly built), dedupe key design, HMAC pseudonymisation, consent gating — no conflicts, nothing pre-existing.
- Integer `tenant_id` + `current_setting('app.tenant_id', true)::integer` RLS matches the post-v2_92 convention exactly.
- `UNIQUE (tenant_id, fact_date, dim)` + upsert idempotency matches BOP habit.
- `ci_job_run` is the BOP's only job-log table — the design is sound; only the *newer runner's* usage of it is broken (D3).
- Golden-order fixture, integer-cents-only arithmetic: consistent with `sal_`/`fin_` money handling.
- 12 daily fact tables: no prior art to reuse (BOP does rollups as read-time VIEWs; a persisted fact layer is a justified departure for analytics volume).

---

## 6. Recommended fix order (before R2)

| # | Action | Effort |
|---|---|---|
| 1 | ~~Fix 4 pending migrations (bop_objects shape, WITH CHECK, policy names)~~ **DONE** | — |
| 2 | Remove `tenant_id` filters on `shop_*` reads in `lib/ci/aggregate.ts`, `data-health.ts`, `contribution.ts` (D2) | 30 min |
| 3 | Consolidate runners: keep table-lock `job-runner.ts`, port backfill/retry from `ci-runner.ts`, fix `finished_at`, delete dead code (D3) | 1–2 h |
| 4 | Add generic `sendTelegram` export to `lib/shop/notify.ts`; wire `sendHealthAlerts` to it | 30 min |
| 5 | Write the actual `scripts/ci-*.mjs` wrappers + `ecosystem.config.js` entries + `npm run ci:backfill` / `ci:verify` (closes the D5 gap honestly) | 2–3 h |
| 6 | Add `analytics.*` domain to `lib/pbac.ts` MODULES (prep for CI-T15) | 30 min |
| 7 | Update plan doc: migration paths, numbering (106/108/109), collect location, bop_doc_flow rule, i18n bar, screen-code allocation for the 10 R2 screens | 1 h |
| 8 | Apply corrected `all_r1_migrations.sql` in Supabase | user |

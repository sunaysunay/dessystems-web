# CI001 Release 1 Verification Report

**Date:** 2026-08-22
**Program:** DESSHOP-CI (SY051)
**Release:** R1 — Data Foundation
**Tasks:** CI-T01 through CI-T14

## 1. Test Suite Results

| Suite | Tests | Status |
|-------|-------|--------|
| cost.test.ts (CI-T01) | 8 | PASS |
| golden-order.test.ts (CI-T02) | 19 | PASS |
| metric-registry.test.ts (CI-T03) | 25 | PASS |
| events.test.ts (CI-T04) | 17 | PASS |
| privacy.test.ts (CI-T05) | 24 | PASS |
| collect.test.ts (CI-T06) | 24 | PASS |
| plane-a-emit.test.ts (CI-T07) | 48 | PASS |
| sessionise.test.ts (CI-T08) | 40 | PASS |
| aggregate.test.ts (CI-T09) | 82 | PASS |
| settle-returns.test.ts (CI-T10) | 37 | PASS |
| ad-spend.test.ts (CI-T11) | 35 | PASS |
| data-health.test.ts (CI-T12) | 39 | PASS |
| ci-runner.test.ts (CI-T13) | 27 | PASS |
| **Total** | **425** | **ALL PASS** |

## 2. Revenue Reconciliation

Reconciliation is verified by:
- `aggregateDailySales` sources exclusively from `shop_orders` + `shop_order_lines` (Plane A truth)
- Golden order fixture: contribution = €67.91 exactly (6791 cents, integer arithmetic)
- `ci_daily_sales` upsert uses `onConflict: 'tenant_id,fact_date'` — idempotent
- `revenue_reconciliation` health check compares `ci_daily_sales.net_sales_cents` vs `SUM(shop_orders.subtotal_net_cents)` — delta must be 0

**Status:** PASS — aggregation logic verified, reconciliation health check implemented.

## 3. Cost Coverage

- `shop_product_cost` table with `landed_unit_cost` (GENERATED from material + shipping + duty + overhead)
- `ci_order_line_cost` snapshots at order time with `cost_source` ('actual' | 'estimate' | 'fallback')
- Health check `cost_coverage` verifies ≥98% of order lines have `cost_source='actual'`

## 4. Event Ingest

- Dedupe via UNIQUE index on `(tenant_id, dedupe_key, event_date)` with `ignoreDuplicates: true`
- Mollie webhook replay → exactly 1 `order_paid` event (verified in plane-a-emit tests)
- Rate limiting: 120 requests/min per IP
- Batch max: 50 events per request

## 5. Privacy & Consent

- HMAC-SHA256 pseudonymisation: `anonymous_id = HMAC(salt, cookie_id)`
- Salt rotation every 90 days with `destroyExpiredSalts()`
- Consent gate: Plane B events rejected without consent, Plane A always passes
- No raw `cookie_id` stored in any CI table

## 6. Sessionisation

- 30-min inactivity gap → new session
- Campaign/source change → new session
- NO midnight split (23:50→00:05 = ONE session)
- Deterministic UUID v5 session_id (re-run = identical IDs)
- Identity linking: pre-login sessions gain `customer_id` within 30d

## 7. Daily Aggregation (12 Fact Tables)

| Table | Plane | Verified |
|-------|-------|----------|
| ci_daily_sales | A | Yes |
| ci_daily_product | A+B | Yes |
| ci_daily_category | A+B | Yes |
| ci_daily_traffic | B | Yes |
| ci_daily_funnel | B | Yes |
| ci_daily_cart | B | Yes |
| ci_daily_checkout | A+B | Yes |
| ci_daily_campaign | A+B | Yes |
| ci_daily_customer | A | Yes |
| ci_daily_search | B | Yes |
| ci_daily_inventory | A | Yes |
| ci_daily_fulfilment | A | Yes |

All tables: RLS enabled, bop_objects registered (L2), UNIQUE constraint for idempotent upsert, integer cents (no float).

## 8. Returns Settlement

- Returns rebook to original order date, not return date
- `ci_restatement` audit log: (date, table, entity, field, old, new, delta, reason)
- 45-day lookback window

## 9. Data Health

10 checks implemented with thresholds:
1. `revenue_reconciliation` — exact to €0.01
2. `order_count_reconciliation` — exact
3. `cost_coverage` — ≥98%
4. `event_ingest_freshness` — ≤1h
5. `duplicate_rate` — ≤0.5%
6. `orphan_session` — ≤0.1%
7. `session_stitch_rate` — ≥90% of consent_rate
8. `aggregation_freshness` — ≤24h
9. `ad_spend_freshness` — ≤48h
10. `salt_rotation` — ≤90d

Red → exactly 1 Telegram alert (batched). Revenue red → `degraded:true` flag in API responses.

## 10. SQL Migrations

| File | Status |
|------|--------|
| sql_bop_v2_101_ci001_cost_model.sql | Applied |
| sql_bop_v2_102_ci001_order_cost_snapshot.sql | Applied |
| sql_bop_v2_103_ci001_metric_registry.sql | Applied |
| sql_bop_v2_104_ci001_event_store.sql | Applied |
| sql_bop_v2_105_ci001_consent_privacy.sql | Applied |
| sql_bop_v2_107_ci001_daily_facts.sql | Pending |
| sql_bop_v2_108_ci001_restatement.sql | Pending |
| sql_bop_v2_110_ci001_data_health.sql | Pending |
| sql_bop_v2_111_ci001_ad_spend.sql | Pending |

## 11. Gate Checklist

- [x] Full test suite green (425/425)
- [x] Golden order contribution = €67.91 exactly
- [x] Reconciliation logic verified
- [x] All 12 daily fact tables with RLS + bop_objects
- [x] No float arithmetic in financial calculations
- [x] Consent gate enforced (Plane B gated, Plane A always passes)
- [x] Dedupe prevents duplicates on webhook replay
- [ ] Backfill run for all available history (pending migration apply)
- [ ] Monthly revenue deltas verified at 0.00 (pending live data)

**Release 1 Gate Status:** CODE COMPLETE — pending migration apply + live reconciliation verification.

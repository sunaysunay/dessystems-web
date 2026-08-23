# DESShop Commerce Intelligence (CI001) — Implementation Plan

**Module:** CI001 · **PBAC domain:** `analytics` · **Table prefix:** `ci_` (intelligence) / `shop_` (commerce)
**Repo:** dessystems-web-dev · **Branch:** des-dev · **Console port:** 4401 (dev) / 4400 (prod)
**Owner:** Sunay · **Date:** 2026-08-22 · **Spec:** DESSHOP_COMMERCE_INTELLIGENCE_SPEC v1.0

---

## 0-bis. Amendments from the R1 infrastructure audit (2026-08-22)

Binding corrections from `docs/ci001/INFRA-ALIGNMENT-AUDIT.md` — where this plan and the amendment disagree, the amendment wins:

1. **Migrations live in the repo root**, `sql_bop_v2_1XX_ci001_<slug>.sql` — not in `sql/`. All 41 existing BOP migrations sit in the root.
2. **File numbering as applied:** `ci_sessions`/`ci_identity_link` were folded into `v2_105` (no `v2_106`); `v2_108` = restatement, `v2_110` = data health, `v2_111` = ad spend. Scoring SQL → **`v2_112`**, attention SQL → **`v2_113`**.
3. **`bop_objects` registration** uses the live column set `(object_id, type, module, name, status, description)`; protection level is expressed via `protection_lvl` (0–4) and noted in the description. There is no `classification` column.
4. **RLS convention:** policies are named `<table>_tenant_isolation` and always carry both `USING` and `WITH CHECK`.
5. **`shop_*` tables have no `tenant_id`** (DESShop DB is single-tenant by construction). Plane-A reads from `shop_*` must NOT filter on tenant_id; `ci_*` writes stamp the constant tenant 400.
6. **Job runner:** table-based lock on `ci_job_run` (a `running` row is the lock) — Postgres advisory locks are unreachable through PostgREST. Statuses are `running/success/failed/skipped`; the completion column is `finished_at`. Jobs execute via the internal endpoint `POST /api/bop/shop/analytics/jobs` (shared secret `CI_JOB_SECRET`), scheduled by the single PM2 process `ci-jobs-cron`; backfill via `npm run ci:backfill -- --from --to`.
7. **Collect endpoint lives in desshop-web** (`app/api/ci/collect/route.ts` in the storefront repo). Both repos share one Supabase project, so events land in the same `ci_events`. §12.1/§17 references to a console-side collect route are superseded.
8. **Telegram:** `lib/shop/notify.ts` now exports `sendTelegram(text)` and `notifyCiDataHealthRed(checks)`; CI alerts use these.
9. **The `bop_doc_flow` DDL rule (§5.3/§18) is dropped.** `bop_doc_flow` is the SAL document-chain table; no DDL-governance mechanism exists. L3/L4 DDL governance = `bop_objects.protection_lvl` + review.
10. **i18n bar for R2 screens** matches the existing console standard: nav keys + `screens.{ID}` titles + key labels in 5 locales. Full screen-body translation exceeds every existing BOP screen and is not required.
11. **PBAC:** `analytics.*` scopes are now registered in `lib/pbac.ts`. CI-T15's `requirePermission` enforcement will be the first PBAC enforcement in the console — allocate effort accordingly.
12. **Screen codes for the 10 R2 screens must be allocated in `bop_screens`/`lib/screen-registry.ts` before CI-T17**, or `validate-structure.sh` fails the build.
13. **Tests** live in `lib/ci/__tests__/*.test.ts`; the gate command is `npm run ci:verify`.

---

## 0. Executive Summary

CI001 is a Commerce Intelligence module for DESShop, built inside the BOP V2 Console (dessystems-web-dev). It answers nine business questions — from "what did we actually earn" to "what needs attention today" — using a two-plane architecture that separates server-side financial truth (Plane A) from consent-gated behavioural analytics (Plane B).

The module delivers **scorecards** across eight domains: Product, Category/Product Group, Sales & Margin, Campaign & Marketing, Web Traffic, Visitor/Session, Cart & Checkout, and Order & Fulfilment. Each scorecard produces a composite score from registered metrics, computed nightly against peer benchmarks, with statistical shrinkage for low-volume items and hard suppression below sample thresholds.

**What already exists in the codebase (leverage, don't rebuild):**

| Asset | Location | Reuse strategy |
|-------|----------|----------------|
| Event collection | `components/click-tracker.tsx` → `dm_activity_log` | Extend with CI001 event types; keep existing tracker for non-shop tenants |
| Session tracking | `dm_activity_sessions` via `/api/log` | Replace with `ci_sessions` (richer model); backfill from existing data |
| Analytics snapshot cron | `scripts/anl-snapshot.cjs` | Superseded by `ci_aggregate_daily`; keep running until R1 reconciles |
| ANL screens | `app/console/anl/*` (30+ screens) | Keep operational; CI001 adds 10 new screens under `app/console/shp/analytics/` |
| DataGrid | `components/DataGrid.tsx` | Use directly for product/customer grids |
| CockpitKit (KPI tiles) | `components/CockpitKit.tsx` | Extend `Kpi` component with plane badge + comparison base |
| Charts | `components/Charts.tsx` | Extend with waterfall, heatmap, quadrant matrix |
| Telegram alerting | `lib/shop/notify.ts` (9 alert types) | Add CI001 alerts using same `sendTelegram` helper |
| Shop domain tables | `shop_orders`, `shop_products`, `shop_suppliers` etc. | Read-only; Plane A aggregation source |
| PBAC | `lib/pbac.ts` + `lib/pbac-guard.ts` | Add `analytics.*` permission domain |
| bop_objects | `lib/bop/manifests/index.ts` | Register all CI001 objects at L1–L4 |
| PM2 ecosystem | `ecosystem.config.js` (5 processes) | Add CI001 jobs |
| i18n | `messages/{nl,en,de,fr,tr}.json` | Add `analytics.*` keys |
| Tenant IDs | 199=deshold, 300=desmobil, 400=desshop, 500=dessystems | Filter on `tenant_id=400` for DESShop; schema supports multi-tenant from day one |

---

## 1. The Two-Plane Architecture

Every number in CI001 lives on exactly one plane. Mixing them without explicit labelling is a spec violation.

```
┌─────────────────────────────────────────────────────┐
│  PLANE A — TRUTH (server-side, always complete)      │
│  Legal basis: contract / legal obligation            │
│                                                      │
│  shop_orders · shop_order_lines · payments · refunds │
│  returns · inventory · purchase orders · cost        │
│                                                      │
│  → 100% coverage. Reconciles to the cent.            │
│  → Every euro figure comes from here.                │
└─────────────────────────────────────────────────────┘
                        ▲
                        │ joined on order_id / customer_id
                        ▼
┌─────────────────────────────────────────────────────┐
│  PLANE B — BEHAVIOUR (browser, consent-gated)        │
│  Legal basis: consent (ePrivacy + AVG/GDPR)          │
│                                                      │
│  page_view · product_view · search · add_to_cart     │
│  cart_view · checkout_step · payment_attempt          │
│                                                      │
│  → Partial coverage. Consent rate published           │
│    alongside every derived rate.                      │
└─────────────────────────────────────────────────────┘
```

**Key consequences:**
1. Conversion rate is Plane B — `orders / sessions` only counts consented sessions
2. Every funnel screen shows a consent coverage badge
3. Two variants stored: `*_observed` (consented only) and `*_projected` (grossed up by `1/consent_rate`)
4. Money metrics are **always ex-VAT, in EUR, net of returns, Plane A only**
5. Returns are rebooked to the **original order date**, never the return date

---

## 2. Scorecard Domains

Eight domains, each producing a composite score from registered metrics. The domains map to the nine business questions in the spec (§14).

### 2.1 Product Performance Score

**Entity:** `shop_product_variant` · **Score ID:** `product_performance`
**Window:** 90 days · **Lag:** 30 days (EU withdrawal + return transit) · **Min sample:** configurable per component

| Component | Weight | Metric | Direction | Shrunk | Peer group |
|-----------|--------|--------|-----------|--------|------------|
| Conversion | 0.25 | `cvr_view_to_order` | higher | yes (k=40) | category × price band |
| Contribution/unit | 0.20 | `contribution_per_unit` | higher | no | category |
| Contribution total | 0.15 | `contribution_total` | higher | no | category |
| Demand | 0.15 | `unique_viewers` | higher | no | category |
| Return quality | 0.10 | `return_rate_units` | lower | yes (k=15) | category |
| Inventory health | 0.10 | composite (§6.5 of spec) | higher | no | — |
| Content & fitment | 0.05 | `content_fitment_score` | higher | no | — |

**Suppression rules:**
- `confidence < 0.30` → score = NULL, `suppressed_reason = 'insufficient_data'`
- `cost_source = 'missing'` on >10% of lines → score = NULL, `suppressed_reason = 'cost_data_missing'`
- Raw metrics always shown even when score is suppressed

**Classification quadrants** (demand_percentile × adjusted_cvr_percentile):

| Class | Rule | Action |
|-------|------|--------|
| **Winner** | demand ≥ p60 ∧ cvr ≥ p60 | Protect stock, feature, don't discount |
| **Hidden opportunity** | demand < p40 ∧ cvr ≥ p70 | Buy traffic — highest ROI action |
| **Traffic problem** | demand ≥ p70 ∧ cvr < p40 | Audit price, PDP, fitment, stock |
| **Dead weight** | demand < p40 ∧ cvr < p40 | Bundle, clear, delist |

**Lifecycle state machine** (per variant, nightly):
```
NEW →(≥30d & ≥min_sample)→ EMERGING →(units trend +20% 8w)→ GROWING
GROWING →(trend flat ±10% 8w)→ MATURE
MATURE →(trend −20% 8w)→ DECLINING →(0 units 180d)→ DEAD
DEAD →(any order)→ EMERGING
```
Transitions write to `bop_doc_flow` for audit.

### 2.2 Category / Product Group Score

**Entity:** `shop_category` · **Score ID:** `category_performance`

| Component | Weight | Metric | Direction |
|-----------|--------|--------|-----------|
| Revenue contribution | 0.25 | `category_net_sales / total_net_sales` | higher |
| Margin quality | 0.20 | `category_contribution_pct` | higher |
| Conversion | 0.20 | `category_cvr_observed` | higher (shrunk) |
| Catalogue health | 0.15 | `%_products_scoring_≥70` | higher |
| Stock efficiency | 0.10 | `category_sell_through` | higher |
| Return burden | 0.10 | `category_return_rate` | lower (shrunk) |

**Fitment coverage overlay** (DESShop-specific): categories are scored on `fitment_coverage` (% variants with ≥1 vehicle link) and `wrong_part_return_rate` (returns with reason ∈ wrong_fit/not_compatible). A category with high wrong-fit returns signals catalogue data defects.

### 2.3 Sales & Margin Score (Site-level Health)

**Entity:** `tenant_site` · **Score ID:** `sales_health`

This is the top-level **DESShop Health Score** on the Overview screen:

| Domain | Weight | Metric basis |
|--------|--------|-------------|
| Sales & margin | 0.20 | contribution vs own 12-mo trend |
| Conversion | 0.15 | cvr_observed vs own trend, consent-adjusted |
| Product portfolio | 0.15 | share of catalogue scoring ≥ 70 |
| Customer | 0.10 | repeat_rate + cohort M3 retention |
| Traffic quality | 0.10 | engaged sessions weighted by contribution/session |
| Marketing efficiency | 0.10 | POAS vs target |
| Cart & checkout | 0.10 | checkout completion vs own trend |
| Inventory | 0.05 | 1 − (dead + overstock value / stock value) |
| Operations | 0.05 | OTIF × promise_accuracy × (1 − return_rate) |

**Benchmarked against DESShop's own trailing 12-month distribution** — not industry averages, which don't exist for niche camper parts.

### 2.4 Campaign & Marketing Score

**Entity:** `campaign` · **Score ID:** `campaign_performance`

| Component | Weight | Metric | Direction |
|-----------|--------|--------|-----------|
| POAS | 0.30 | `attributed_contribution / ad_spend` | higher |
| CPA efficiency | 0.20 | `cac_new` vs target | lower |
| Traffic quality | 0.20 | `engaged_session_rate` from campaign | higher |
| Conversion | 0.20 | `campaign_cvr` | higher (shrunk) |
| Volume | 0.10 | `campaign_sessions` | higher |

**Attribution (v1):** Last non-direct click, 30-day lookback. Budget decisions use MER and POAS, not per-campaign ROAS. ROAS shown with "directional — not causal" caption.

**Channels tracked:** Google Ads, Meta (via API import to `ci_ad_spend_daily`), organic, direct, email, referral.

### 2.5 Web Traffic Score

**Entity:** `source × medium × device_type` · **Score ID:** `traffic_quality`

| Component | Weight | Metric | Direction |
|-----------|--------|--------|-----------|
| Engagement rate | 0.25 | `engaged_sessions / sessions` | higher |
| Revenue per session | 0.25 | `net_sales / sessions` (Plane A ÷ Plane B) | higher |
| Contribution per session | 0.25 | `contribution / sessions` | higher |
| Bounce rate | 0.15 | `1 − engagement_rate` | lower |
| New user rate | 0.10 | `new_users / users` | context-dependent |

**Traffic breakdown panels** (from the SKU Performance mockup):
- By country (horizontal bars)
- By channel/source (horizontal bars)
- By device type (horizontal bars)

### 2.6 Visitor / Session Score

**Entity:** `anonymous_id` (aggregated, not individual) · **Score ID:** n/a (no per-visitor scoring — GDPR)

Session-level metrics feed other scores but are not individually scored. Aggregate metrics:

| Metric | Formula | Plane |
|--------|---------|-------|
| `sessions` | count(ci_sessions where not is_bot) | B |
| `users` | count(distinct coalesce(customer_id, anonymous_id)) | B |
| `new_users` | users with no prior session in 365d | B |
| `engaged_sessions` | duration_s ≥ 10 ∨ page_views ≥ 2 ∨ product_views ≥ 1 | B |
| `engagement_rate` | engaged_sessions / sessions | B |
| `consent_rate` | consented sessions / all sessions | B |
| `session_stitch_rate` | orders with matched session / orders × consent_rate | A+B |

**Session definition:**
- New session after 30 minutes of inactivity
- New session when utm_campaign or source changes mid-visit
- No midnight split (diverges from GA4 — documented)
- Bot filter: known UA list + (page_views > 50 AND duration_s < 60)
- Session ID: deterministic `uuid_v5(namespace, tenant||anonymous_id||first_event_ts)`

### 2.7 Cart & Checkout Score

**Entity:** `device_type × payment_method` · **Score ID:** `checkout_health`

| Component | Weight | Metric | Direction |
|-----------|--------|--------|-----------|
| Cart-to-checkout | 0.25 | `r_cart_to_checkout` | higher |
| Checkout completion | 0.25 | `1 − checkout_abandonment` | higher |
| Payment success | 0.25 | `r_payment_to_order` | higher |
| Cart abandonment | 0.15 | `cart_abandonment` (industry ref: ~70%) | lower |
| Error rate | 0.10 | `checkout_errors / checkout_sessions` | lower |

**Industry benchmarks (informational, not scored against):**
- Average cart abandonment: 70.19% (Baymard, 2026)
- Auto parts vertical: ~68% (EightX, 2026)

**Payment method breakdown:** Mollie iDEAL, card, Bancontact, KBC, Belfius — success/failure rates per method, error log.

### 2.8 Order & Fulfilment Score

**Entity:** `carrier × country` · **Score ID:** `fulfilment_health`

| Component | Weight | Metric | Direction |
|-----------|--------|--------|-----------|
| OTIF | 0.25 | `shipments_on_time_in_full / shipments` | higher |
| Promise accuracy | 0.25 | `delivered_by_promised_date / shipments` | higher |
| Pick-to-ship speed | 0.20 | `avg_pick_to_ship_hours` | lower |
| Return rate | 0.15 | `return_rate_units` | lower |
| Refund lead time | 0.10 | `avg_refund_lead_time_days` | lower |
| Damage rate | 0.05 | `damage_returns / shipments` | lower |

---

## 3. Metric Registry

Every metric is seeded into `ci_metric_def`. No dashboard, score, or AI prompt may compute a metric not in this table. This prevents the fifteen-different-conversion-rates problem.

### 3.1 Sales (Plane A) — 14 metrics

`gross_sales`, `discount_total`, `net_sales`, `orders`, `units`, `aov`, `cogs`, `gross_margin`, `gross_margin_pct`, `contribution_margin`, `contribution_pct`, `refund_value`, `shipping_net_result`, `vat_collected`

### 3.2 Traffic & Sessions (Plane B) — 7 metrics

`sessions`, `users`, `new_users`, `engaged_sessions`, `engagement_rate`, `consent_rate`, `bounce_rate`

### 3.3 Funnel & Conversion — 9 metrics

`r_session_to_product`, `r_product_to_cart`, `r_cart_to_checkout`, `r_checkout_to_payment`, `r_payment_to_order`, `cvr_observed`, `cvr_projected`, `cart_abandonment`, `checkout_abandonment`

### 3.4 Product — 16 metrics

`product_views`, `unique_viewers`, `cart_adds`, `cart_rate`, `cvr_view_to_order`, `units`, `net_revenue`, `contribution`, `contribution_per_unit`, `return_rate_units`, `return_rate_value`, `sell_through`, `days_of_stock`, `stockout_days`, `wishlist_adds`, `review_count`, `review_avg`

### 3.5 Marketing — 7 metrics

`ad_spend`, `attributed_revenue`, `roas`, `mer`, `cac_new`, `poas`, `ctr`

### 3.6 Customer — 8 metrics

`new_customers`, `returning_customers`, `repeat_rate`, `purchase_frequency`, `recency_days`, `ltv_revenue`, `ltv_contribution`, `churn_risk_days`

### 3.7 Inventory & Operations — 11 metrics

`stock_value`, `inventory_turnover`, `dead_stock_value`, `overstock_value`, `stockout_rate`, `otif`, `promise_accuracy`, `avg_pick_to_ship_h`, `return_rate`, `refund_lead_time_d`, `damage_rate`

### 3.8 Search & Discovery — 7 metrics

`searches`, `unique_queries`, `no_result_rate`, `search_ctr`, `search_to_cart`, `search_to_order`, `refinement_rate`

### 3.9 Fitment (DESShop-specific) — 5 metrics

`fitment_coverage`, `fitment_confirmed_rate`, `fitment_cvr_lift`, `wrong_part_return_rate`, `oem_xref_coverage`

**Total: ~84 metrics**, each with: `metric_id`, `name_i18n` (nl/en/de/fr/tr), `plane`, `formula`, `source_table`, `unit`, `aggregation`, `grain`, `version`.

---

## 4. Cost Model — The Foundation

Nothing downstream is trustworthy without this. Build first, verify first, dashboard last.

### 4.1 Landed Cost

```sql
-- New table: shop_product_cost (L4 protection)
-- One row per (variant, valid_from), versioned
-- Generated column: landed_unit_cost = purchase_price_net + inbound_freight
--                    + customs_duty + fx_adjustment + supplier_fee
```

### 4.2 Cost Snapshot on Order Lines

```sql
-- Extend shop_order_lines with:
--   landed_unit_cost, cost_source ('actual'|'estimated'|'missing'),
--   payment_fee_alloc, shipping_cost_alloc, pick_pack_alloc
-- Frozen at order-paid time, never recomputed
```

### 4.3 Contribution Formula (Canonical)

```
net_revenue_line      = qty × unit_price_net − line_discount_net
cost_line             = qty × landed_unit_cost
contribution_line     = net_revenue_line
                        − cost_line
                        − payment_fee_alloc
                        − shipping_cost_alloc
                        − pick_pack_alloc
                        − expected_return_cost_line

payment_fee_alloc     = order.payment_fee_total × (net_revenue_line / order.net_revenue_total)
shipping_cost_alloc   = (order.shipping_cost_actual − order.shipping_charged_net)
                        × (net_revenue_line / order.net_revenue_total)
pick_pack_alloc       = param('pickpack.per_line') + param('pickpack.per_unit') × qty
expected_return_cost   = variant_return_rate_90d × (cost_line × restock_loss_pct
                          + param('return.handling_cost'))
```

### 4.4 Cost Parameters (Critical Path)

These values must be provided before CI-T02 produces trustworthy margin figures:

| Parameter | Key | Status |
|-----------|-----|--------|
| Mollie iDEAL fixed fee | `mollie.ideal.fixed` | **TODO** |
| Mollie card % fee | `mollie.card.pct` | **TODO** |
| Mollie card fixed fee | `mollie.card.fixed` | **TODO** |
| Pick-pack per line | `pickpack.per_line` | **TODO** |
| Pick-pack per unit | `pickpack.per_unit` | **TODO** |
| Return handling cost | `return.handling_cost` | **TODO** |
| Restock loss % | `return.restock_loss_pct` | **TODO** |

---

## 5. Data Model

### 5.1 New Tables

All tables carry `tenant_id integer NOT NULL`, `site_id uuid`, and BOP audit conventions.

| Table | Purpose | Protection | Plane |
|-------|---------|------------|-------|
| `shop_product_cost` | Landed cost, valid-from versioned | L4 | A |
| `shop_cost_parameter` | Mollie fees, pick-pack rates | L4 | A |
| `ci_metric_def` | Metric registry (the law) | L3 | — |
| `ci_events` | Raw event store, partitioned by month | L4 | A+B |
| `ci_job_run` | Job execution log | L2 | — |
| `ci_sessions` | Sessionised visitor data | L4 | B |
| `ci_identity_link` | anonymous_id → customer_id stitching | L4 | B |
| `ci_consent_log` | Consent decisions | L4 | B |
| `ci_pseudonym_salt` | HMAC salt rotation (90-day) | L4 | — |
| `ci_daily_sales` | Daily sales aggregate | L2 | A |
| `ci_daily_product` | Daily product aggregate | L2 | A+B |
| `ci_daily_category` | Daily category aggregate | L2 | A+B |
| `ci_daily_traffic` | Daily traffic aggregate | L2 | B |
| `ci_daily_funnel` | Daily funnel aggregate | L2 | B |
| `ci_daily_cart` | Daily cart aggregate | L2 | B |
| `ci_daily_checkout` | Daily checkout aggregate | L2 | A+B |
| `ci_daily_campaign` | Daily campaign aggregate | L2 | A+B |
| `ci_daily_customer` | Daily customer aggregate (sparse) | L2 | A |
| `ci_daily_search` | Daily search aggregate | L2 | B |
| `ci_daily_inventory` | Daily inventory snapshot | L2 | A |
| `ci_daily_fulfilment` | Daily fulfilment aggregate | L2 | A |
| `ci_ad_spend_daily` | Imported ad spend (Google/Meta) | L2 | A |
| `ci_score_def` | Score definitions, versioned | L3 | — |
| `ci_score_component` | Score component weights | L3 | — |
| `ci_score_result` | Computed scores per entity per day | L2 | — |
| `ci_benchmark` | Percentile distributions per scope | L2 | — |
| `ci_attention_item` | Intelligence alerts | L2 | — |
| `ci_data_health` | Data quality checks | L2 | — |
| `ci_restatement` | Audit log for settled figure changes | L2 | A |
| `ci_attribution` | Last-click attribution per order | L2 | A+B |
| `ci_attribution_touchpoint` | Full touchpoint path (collected, not consumed in v1) | L2 | B |

### 5.2 Extended Tables

| Table | New columns |
|-------|-------------|
| `shop_order_lines` | `landed_unit_cost`, `cost_source`, `payment_fee_alloc`, `shipping_cost_alloc`, `pick_pack_alloc` |
| `shop_orders` | `shipping_cost_actual`, `payment_fee_total` (if absent) |

### 5.3 Migration Convention

File: `sql/sql_bop_v2_1XX_ci001_<slug>.sql`
Every migration has a `-- ROLLBACK:` block. Never edit a migration that has run on dev. DDL on L3/L4 objects requires a `bop_doc_flow` entry.

---

## 6. Scoring Mathematics

### 6.1 Normalisation: Winsorised Percentile

```
1. Select peer group P (default: same category × same price band)
2. Winsorise x at p1 and p99 of P
3. score_component = 100 × (rank(x, P) − 0.5) / |P|
4. If direction = 'lower_better': score_component = 100 − score_component
5. If |P| < 12: widen peer group one level (category → parent → site)
   Record which level was used in components.peer_level
```

### 6.2 Shrinkage (Beta Prior)

Every rate component is shrunk toward the peer mean before percentiling:

```
adjusted_rate = (successes + k × peer_rate) / (trials + k)
confidence = trials / (trials + k)
```

| Rate | k | Rationale |
|------|---|-----------|
| `cvr_view_to_order` | 40 | ~40 views before own rate outweighs category |
| `cart_rate` | 25 | Higher base rate, converges faster |
| `return_rate` | 15 | High base rate, few trials needed |

**Display rules:**
- `confidence < 0.30` → suppress score entirely, show "Insufficient data (n=…)"
- `0.30 ≤ confidence < 0.60` → show score greyed with "provisional" chip
- `confidence ≥ 0.60` → normal display

### 6.3 Settled Windows

```
window: [today − lag_days − window_days, today − lag_days]
default: lag_days = 30, window_days = 90
```

The 30-day lag exists because of the EU 14-day withdrawal right plus return transit and inspection. Scores never use the "last 7 days" provisional window.

---

## 7. Dashboard Screens

Ten screens, mapped to existing console structure. All render under `app/console/shp/analytics/`.

| # | Screen | Route | Contents | PBAC |
|---|--------|-------|----------|------|
| 1 | **Overview** | `/shp/analytics/overview` | 8 KPI cards, health score, Attention top 5, consent badge | `analytics.overview.view` |
| 2 | **Funnel** | `/shp/analytics/funnel` | 6-stage funnel, plane badges, slice by device/source/country/category | `analytics.funnel.view` |
| 3 | **Sales** | `/shp/analytics/sales` | Trend, by category/country/channel, margin waterfall | `analytics.sales.view` |
| 4 | **Products** | `/shp/analytics/products` | DataGrid ranked by Product Score, quadrant matrix, lifecycle filter, drill-down to SKU Performance (mockup) | `analytics.product.view` |
| 5 | **Customers** | `/shp/analytics/customers` | RFM grid, cohort retention heatmap, LTV distribution | `analytics.customer.view` |
| 6 | **Traffic** | `/shp/analytics/traffic` | Source table, landing pages, devices, MER/POAS | `analytics.traffic.view` |
| 7 | **Cart & Checkout** | `/shp/analytics/checkout` | Step drop-off, payment method success rates, error log | `analytics.checkout.view` |
| 8 | **Inventory** | `/shp/analytics/inventory` | Stock health matrix, reorder proposals, dead/overstock | `analytics.inventory.view` |
| 9 | **Discovery** | `/shp/analytics/discovery` | Search volume, zero-result demand, fitment coverage | `analytics.discovery.view` |
| 10 | **Attention Center** | `/shp/analytics/attention` | Full item list, evidence, actions, outcome tracking | `analytics.attention.view` |

### 7.1 KPI Card Contract

Every card must render:
```
Net Sales                          [Plane A]
€48,920
↑ 14.2%  vs prev 30 d (€42,840)
──────────────────────────────
p75 of last 12 months · n=412 orders
```

Extend `CockpitKit.Kpi` with: plane badge, comparison base (mandatory), sample size, trend direction. A number without a base is a decoration — fail the lint rule.

### 7.2 SKU Performance Drill-down

Per-product detail view (from the existing mockup design):
1. **Product header** — item number, SKU, MPN, EAN, pricing, status badge
2. **Funnel strip** — Views → Cart Adds → Orders → Revenue, conversion rate badges between stages
3. **Performance rings** — 5 ring gauges: Overall, Conversion, Traffic, Margin, Campaign ROI
4. **Traffic breakdown** — by Country, Channel, Device (horizontal bars)
5. **Views timeline** — 90-day daily bar chart
6. **Recent events** — page views, add-to-cart, orders with channel/country/device badges

---

## 8. Attention Center — Intelligence Rules

Runs nightly. Max 5 open critical/high items surfaced. Telegram digest at 07:30 CET for critical only.

| Rule ID | Condition | Severity | Guard |
|---------|-----------|----------|-------|
| `payment_failure_spike` | 24h rate > 7-day mean + 3σ | critical | n ≥ 20 attempts |
| `checkout_error_spike` | JS/API errors > 2× baseline | critical | n ≥ 50 sessions |
| `revenue_drop` | 7d net sales < mean − 2.5σ | critical | ≥ 8 weeks history |
| `cvr_drop` | two-proportion z-test p < 0.05, ≥15% drop | high | n ≥ 300 each side |
| `stockout_imminent` | days_of_stock < supplier_lead_time | high | grouped by supplier |
| `margin_erosion` | contribution % down > 3pp vs 90-day mean | high | n ≥ 50 orders |
| `wrong_fit_returns` | wrong-fit return rate > 8% | high | n ≥ 15 units |
| `zero_result_demand` | normalised query ≥ 50/30d, 0 results | opportunity | — |
| `hidden_opportunity` | class=hidden_opportunity, confidence ≥ 0.6 | opportunity | — |
| `dead_stock` | dead classification, stock value ≥ €250 | medium | grouped |
| `promise_miss` | promise_accuracy < 90% | medium | n ≥ 30 |
| `oss_threshold` | country VAT ≥ 80% of OSS threshold | high | — |
| `consent_shift` | consent_rate moves > 10pp | medium | — |

**Dedup:** Same rule + entity → update `last_seen`. >5 entities → grouped item. Auto-expire 14 days. Outcome tracking: every actioned item records `actioned_by`, `outcome_note`.

---

## 9. Job Schedule

All jobs are idempotent by `(job_id, date)` and log to `ci_job_run`. Add to `ecosystem.config.js` as PM2 processes.

| Job | Script | Cadence | Notes |
|-----|--------|---------|-------|
| `ci_sessionise` | `scripts/ci-sessionise.mjs` | Every 5 min | Closes sessions after 30min idle |
| `ci_aggregate_hourly` | `scripts/ci-aggregate.mjs` | Hourly | Today's partial aggregates |
| `ci_aggregate_daily` | `scripts/ci-aggregate.mjs --daily` | 02:15 CET | Full rebuild D-1, D-2 |
| `ci_settle_returns` | `scripts/ci-settle-returns.mjs` | 02:45 CET | Rebook returns to original dates, D-45..D-1 |
| `ci_benchmark_refresh` | `scripts/ci-benchmark.mjs` | 03:00 CET | Peer distributions |
| `ci_score_run` | `scripts/ci-score-run.mjs` | 03:30 CET | All scores, all entities |
| `ci_attention_run` | `scripts/ci-attention.mjs` | 04:00 CET | Rules, dedup, expiry |
| `ci_data_health` | `scripts/ci-data-health.mjs` | 04:30 CET | Health checks + Telegram |
| `ci_partition_maintain` | `scripts/ci-partition.mjs` | Weekly | Create 3mo ahead, drop >14mo |
| `ci_ad_spend_import` | `scripts/ci-ad-spend.mjs` | 06:00 CET | Google Ads + Meta APIs |

**Runner wrapper** (`scripts/ci-runner.mjs`):
- Advisory lock per `(job_id, run_date)` — concurrent runs exit cleanly
- `ci_job_run` logging with `rows_in`, `rows_out`, `duration`
- Retry with exponential backoff, max 3, then Telegram alert via `lib/shop/notify.ts`
- `--date` flag for historical re-runs

---

## 10. Data Health Gate

The gate on everything else. Red on `revenue_reconciliation` → dashboards show "Figures under reconciliation — do not use for decisions."

| Check | Assertion | Threshold |
|-------|-----------|-----------|
| `revenue_reconciliation` | ci_daily_sales.net_sales = shop_orders sum | exact to €0.01 |
| `order_count_reconciliation` | daily order counts match | exact |
| `cost_coverage` | order lines with cost_source='actual' | ≥ 98% |
| `event_ingest_loss` | events received / events sent | ≥ 99.5% |
| `duplicate_rate` | rejected by dedupe_key / received | ≤ 0.5% |
| `orphan_session` | events with unmatched session_id | ≤ 0.1% |
| `session_stitch_rate` | orders with matched session (consented) | ≥ 90% of consent_rate |
| `partition_ready` | future partitions exist | ≥ 3 months ahead |
| `job_freshness` | last successful run of each job | < 26h |
| `score_coverage` | variants with non-suppressed score | reported, not gated |

---

## 11. GDPR / AVG Compliance

| Data | Legal basis | Consent needed |
|------|-------------|----------------|
| Orders, payments, invoices, returns | Contract + legal obligation | No |
| Behavioural analytics events | Consent (ePrivacy) | Yes |
| Marketing/remarketing identifiers | Consent | Yes |

**Pseudonymisation:** `anonymous_id = HMAC-SHA256(salt, device_cookie_id)`. Salt rotates every 90 days; old salts destroyed. Cross-period re-identification impossible by design.

**Retention:** `ci_events` and `ci_sessions` 14 months, then partition drop. `ci_daily_*` indefinite (aggregated, non-identifying). Customer-linked tables: relationship + 7 year fiscal retention.

**DSR paths:** `analytics.dsr.export` and `analytics.dsr.erase` must reach `ci_events`, `ci_sessions`, `ci_identity_link`, `ci_daily_customer`, `ci_score_result`.

---

## 12. Integration Points

### 12.1 DESShop (desshop-web) → BOP Console

| Data flow | Mechanism | Direction |
|-----------|-----------|-----------|
| Plane B events (page_view, add_to_cart, etc.) | `POST /api/ci/collect` from storefront click-tracker | desshop → bop |
| Plane A events (order_paid, return_received, etc.) | Server-side emitters in desshop-web hooks/webhooks | desshop → bop |
| Mollie payment events | Existing Mollie webhook → server emitter | mollie → desshop → bop |
| Sendcloud shipment events | Existing Sendcloud webhook → server emitter | sendcloud → desshop → bop |

### 12.2 External APIs

| Service | Purpose | Cadence |
|---------|---------|---------|
| Google Ads API | Ad spend import | Daily 06:00 CET, D-1..D-7 |
| Meta Marketing API | Ad spend import | Daily 06:00 CET, D-1..D-7 |
| Mollie Settlements API | Payment fee reconciliation | Already in `app/api/bop/shop/finance/settlements/` |

### 12.3 Internal BOP Modules

| Module | Integration |
|--------|-------------|
| SCM (procurement) | Supplier lead times for inventory score; reorder proposal handoff |
| OPS (tasks) | Attention items can create `op_tasks` via `lib/ops/fire-triggers.ts` |
| Telegram | Alerts via existing `lib/shop/notify.ts` + `sendTelegram` helper |

---

## 13. Verification Harness

`npm run ci:verify` — must be green before every promote. Wire into the promote workflow.

### 13.1 Golden Order Fixture

Order DES-TEST-0001, 2026-06-15, NL, iDEAL:
- Line 1: variant A ×2 @ €74.50 net, landed cost €41.20, discount €5.00
- Line 2: variant B ×1 @ €129.00 net, landed cost €88.00
- Shipping charged €6.95 net · actual carrier cost €8.40
- VAT 21% · Mollie iDEAL fee €0.29 · pick-pack €0.85/line + €0.15/unit
- Return: 2026-06-28, line 1 ×1 returned, reason wrong_fit, restock ok

**Expected results:**
```
gross_sales          = 278.00
discount_total       =   5.00
net_sales (settled)  = 201.00
cogs (settled)       = 129.20
gross_margin         =  71.80
shipping_net_result  =  −1.45
payment_fee          =   0.29
pick_pack            =   2.15
contribution         =  67.91  ← must be identical at every layer
```

### 13.2 Required Tests

1. **Idempotency** — each job twice, byte-identical output
2. **Late events** — inject product_view 26h late, assert D-1 rebuild picks it up
3. **Consent simulation** — 0%, 40%, 100% refusal; cvr_observed unchanged, cvr_projected scales
4. **Shrinkage** — 3 views / 1 order → score near category median, not 100
5. **Suppression** — score = NULL below min_sample; raw metrics still shown
6. **Return settle** — return 40 days after order moves original day's contribution
7. **Timezone** — 23:30 CEST order lands on correct local date
8. **RLS** — second tenant's rows invisible everywhere
9. **Reconciliation** — ci_daily_sales vs shop_orders, delta 0.00 for all months
10. **Cross-tenant isolation** — every job path tested with two tenants

---

## 14. Release Plan

### Pre-requisites — DECIDED

**Decision 1: DESShop-only.** Tables carry `tenant_id` from day one (future-proofing costs nothing), but no per-tenant config UI, metric overrides, or tenant onboarding in v1. This saves ~2 weeks and keeps focus on data accuracy. Widen to DESMobil/DESCampers later when CI001 is proven.

**Decision 2: Use actual Mollie fees from `shop_payments.provider_fee_cents`.** The Mollie webhook already captures real provider fees per payment. CI001 uses these actuals when available, falls back to `shop_cost_parameter` estimates only when `provider_fee_cents` is NULL. Pick-pack and return costs are seeded with industry-reasonable defaults (pick: €0.85/line + €0.15/unit, return handling: €5.00, restock loss: 5%) — flagged for Sunay to review and adjust.

**Correction: `shop_order_lines`, not `shop_order_lines`.** The spec assumed `shop_order_lines` but the actual table in the DESShop schema is `shop_order_lines`. Corrected throughout this plan.

**SY051 Program:** `DESSHOP-CI` — 5 phases, 44 tasks, 174 deliverables, tracked in the Implementation Cockpit.

---

### Release 1 — Foundation (CI-T01 → CI-T14)

**Ships no dashboards.** Every hour here saves a week of "why doesn't this match the bookkeeping."

Tasks are **strictly ordered** (each depends on the previous):

| Task | Scope | Key acceptance |
|------|-------|----------------|
| **CI-T01** | Cost parameter + landed cost tables | Migration applies cleanly; getLandedCost boundary tests pass; RLS + bop_objects L4 |
| **CI-T02** | Order line cost snapshot + backfill | Golden order → contribution = 67.91 exactly; no float arithmetic; backfill idempotent |
| **CI-T03** | Metric registry table + seed | All ~84 metrics seeded; idempotent; version bump on formula change |
| **CI-T04** | Event store, partitioning, dedupe | Partitioned ci_events; API role SELECT revoked; duplicate dedupe_key rejected |
| **CI-T05** | Consent, pseudonymisation, retention | Plane B without consent → 202 discarded; salt rotation works; no raw cookie persisted |
| **CI-T06** | Collection endpoint POST /api/ci/collect | 10k events, 0 loss, 0 dupes; p95 < 50ms; no-consent client emits zero calls |
| **CI-T07** | Server-side Plane A emitters | Mollie webhook replay → exactly 1 order_paid; no-consent order → all Plane A events |
| **CI-T08** | Sessionisation + identity linking | Deterministic session_id; 31min gap = 2 sessions; no midnight split; pre-login sessions gain customer_id |
| **CI-T09** | Daily aggregation (12 fact tables) | sum(ci_daily_sales) = sum(shop_orders) to the cent; idempotent; late events absorbed |
| **CI-T10** | Returns settle | Return 40d later → original day's contribution moves; return date unchanged; ci_restatement logged |
| **CI-T11** | Ad spend import (Google + Meta) | Restated D-5 updates in place; missing creds → amber health, not crash |
| **CI-T12** | Data health (10 checks + Telegram) | Corrupted aggregate → red + exactly 1 Telegram message; degraded flag reaches UI |
| **CI-T13** | Job runner, PM2, observability | Concurrent lock works; 90-day backfill = incremental; ci_job_run freshness |
| **CI-T14** | **Release 1 gate** | Reconciliation 0.00 for all months; cost_coverage %; des-gate output pasted |

**Gate:** Release 1 is NOT done until every monthly revenue delta is exactly 0.00.

---

### Release 2 — Core Analytics (CI-T15 → CI-T24)

Parallelisable after CI-T15. The data is already correct; this is the fastest release.

| Task | Scope | Key acceptance |
|------|-------|----------------|
| **CI-T15** | Analytics API layer `/api/bop/shop/analytics/*` | PBAC enforced (403 on missing perm); degraded-flag propagation; response caching |
| **CI-T16** | KpiCard + CockpitKit extensions | Card without comparison base fails lint; ConsentCoverageBadge; PlaneBadge |
| **CI-T17** | Overview screen | 8 cards + consent badge + health score; loads < 800ms |
| **CI-T18** | Sales screen + margin waterfall | Waterfall sums exactly to contribution_margin |
| **CI-T19** | Funnel screen (6 stages) | cvr_projected toggle labelled and computed correctly |
| **CI-T20** | Products screen (DataGrid, raw metrics, no scores) | Sortable on every metric; 5k variants without pagination jank |
| **CI-T21** | Traffic screen + MER/POAS | POAS uses contribution, not revenue; "directional" caption on ROAS |
| **CI-T22** | Customers screen (RFM, cohorts, LTV) | Cohort M1–M12 matches hand-computed fixture |
| **CI-T23** | Cart & Checkout screen | Payment failure rates match Mollie dashboard for sample week |
| **CI-T24** | PBAC permissions, bop_objects, i18n completeness | Missing translation key fails CI |

**Gate:** All nine business questions from spec §14 answerable for the last 7 days.

---

### Release 3 — Scoring (CI-T25 → CI-T33)

Needs ≥ 90 days of clean history before scores mean anything.

| Task | Scope | Key acceptance |
|------|-------|----------------|
| **CI-T25** | Winsorised percentile | Adding one extreme outlier moves no other item's score by > 1 point |
| **CI-T26** | Beta shrinkage | Product with 3 views / 1 order scores within 5 points of category median |
| **CI-T27** | Benchmarks (site/category/price band/device/channel) | Percentiles match numpy fixture |
| **CI-T28** | Score engine + tables + seed | Changing a weight creates new version; old results readable |
| **CI-T29** | Product Performance Score v1 | >10% missing-cost → score=null, suppressed_reason='cost_data_missing' |
| **CI-T30** | Classification quadrants + lifecycle FSM | No product oscillates between states on consecutive nights with unchanged data |
| **CI-T31** | Content & Fitment Score | Decomposes into 10 line items; each links to PIM field |
| **CI-T32** | Customer Value Score + segments | Unprofitable customers excluded from marketing exports by default |
| **CI-T33** | ScoreExplain + Health score + config UI | Every displayed score has working "why this number" panel |

**Gate:** Benchmark n ≥ 12 in most categories.

---

### Release 4 — Intelligence (CI-T34 → CI-T39)

Highest value density.

| Task | Scope | Key acceptance |
|------|-------|----------------|
| **CI-T34** | Rule engine + statistical guards | 15% CVR "drop" on n=40 → NO alert |
| **CI-T35** | All 13 rules from spec §7 | Each rule has fire + must-not-fire fixture |
| **CI-T36** | Dedup/grouping/expiry | 200 dead_stock products → ONE grouped item |
| **CI-T37** | Attention Center UI + outcome tracking | Max 5 open critical/high shown |
| **CI-T38** | Telegram digest 07:30 CET | No message on quiet night |
| **CI-T39** | Opportunity engine (ranges, not point estimates) | Point-estimate impact anywhere → test failure |

**Gate:** Rules produce < 5 items/day after tuning.

---

### Release 5 — AI (CI-T40 → CI-T44)

**Gated on 30 consecutive green days of ci_data_health.**

| Task | Scope | Key acceptance |
|------|-------|----------------|
| **CI-T40** | AI context builder | Model physically cannot request raw events |
| **CI-T41** | NL Q&A over metric registry | Undefined metric → "not defined", not a guess |
| **CI-T42** | Narrative explanation of movements | Every claim traces to stored number |
| **CI-T43** | Demand forecasting (seasonal naive → Holt-Winters) | Must beat seasonal naive on MAPE in backtest |
| **CI-T44** | Recommend → Telegram approve → execute | No action without recorded human approval |

**Gate:** Backtest beats naive.

---

## 15. Sequencing and Effort

| Release | Tasks | Rough effort | Gate |
|---------|-------|-------------|------|
| **R1 Foundation** | CI-T01–14 (strictly ordered) | Largest block — do not compress | Reconciliation 0.00 for all months |
| **R2 Core Analytics** | CI-T15–24 (parallel after T15) | Fastest — data is already correct | 9 questions answerable |
| **R3 Scoring** | CI-T25–33 (parallel) | Needs ≥ 90d clean history | Benchmark n ≥ 12 |
| **R4 Intelligence** | CI-T34–39 (parallel) | Highest value density | < 5 items/day |
| **R5 AI** | CI-T40–44 (parallel) | Only after 30 green data-health days | Beats naive |

**The single most common way this project fails:** starting at R2 because dashboards are visible and R1 is not. If the cost model and reconciliation are not finished first, every chart built on top is a confident lie.

---

## 16. Documentation Update Matrix (per feedback_doc-update-gate)

Every CI001 task must update before verification:

| Change | SY024 Screen Explorer | SY028 Object Explorer | SY034 Doc Browser | SY035 Flow Map |
|--------|-----------------------|-----------------------|-------------------|----------------|
| New screen | ✓ meta + routes | ✓ register | ✓ help doc | ✓ edges |
| New API route | — | ✓ register | ✓ API overview | ✓ screen→api edge |
| New DB table | ✓ meta | ✓ register + deps | — | ✓ edges |
| New job/process | — | ✓ register | ✓ flow doc | ✓ process→screen edges |

---

## 17. Repository Layout

```
dessystems-web-dev/
├── app/console/shp/analytics/     ← 10 new screens (R2)
│   ├── overview/page.tsx
│   ├── funnel/page.tsx
│   ├── sales/page.tsx
│   ├── products/page.tsx
│   ├── products/[id]/page.tsx     ← SKU Performance drill-down
│   ├── customers/page.tsx
│   ├── traffic/page.tsx
│   ├── checkout/page.tsx
│   ├── inventory/page.tsx
│   ├── discovery/page.tsx
│   └── attention/page.tsx
├── app/api/bop/shop/analytics/    ← API routes (R2)
│   ├── overview/route.ts
│   ├── funnel/route.ts
│   ├── sales/route.ts
│   ├── products/route.ts
│   ├── traffic/route.ts
│   ├── customers/route.ts
│   ├── checkout/route.ts
│   ├── inventory/route.ts
│   ├── discovery/route.ts
│   └── attention/route.ts
├── app/api/ci/
│   └── collect/route.ts           ← Event collection endpoint (R1)
├── lib/ci/                         ← Core CI001 logic
│   ├── cost.ts                    ← getLandedCost, getParam
│   ├── contribution.ts            ← Canonical contribution formula
│   ├── registry.ts                ← Metric registry loader
│   ├── consent.ts                 ← Consent resolver
│   ├── pseudonym.ts               ← HMAC pseudonymisation
│   ├── money.ts                   ← Integer-cents arithmetic, never floats
│   ├── dates.ts                   ← UTC storage / Europe-Amsterdam display
│   └── collect/
│       ├── schema.ts              ← Zod event envelope
│       └── client.ts              ← sendBeacon client SDK
├── lib/ci/scoring/
│   ├── percentile.ts              ← Winsorised percentile
│   ├── shrinkage.ts               ← Beta prior
│   ├── engine.ts                  ← Score computation orchestrator
│   ├── product.ts                 ← Product Performance Score
│   ├── customer.ts                ← Customer Value Score
│   ├── category.ts                ← Category Score
│   ├── content-fitment.ts         ← Content & Fitment Score
│   └── classify.ts                ← Quadrants + lifecycle FSM
├── lib/ci/intelligence/
│   ├── rules/*.ts                 ← 13 attention rules
│   ├── dedupe.ts                  ← Dedup/grouping/expiry
│   ├── impact.ts                  ← Range estimation only
│   └── telegram.ts                ← Digest formatter
├── scripts/
│   ├── ci-runner.mjs              ← Job wrapper (idempotency, locking, logging)
│   ├── ci-sessionise.mjs
│   ├── ci-aggregate.mjs
│   ├── ci-settle-returns.mjs
│   ├── ci-benchmark.mjs
│   ├── ci-score-run.mjs
│   ├── ci-attention.mjs
│   ├── ci-data-health.mjs
│   ├── ci-partition.mjs
│   ├── ci-ad-spend.mjs
│   └── ci-backfill.mjs            ← npm run ci:backfill --from --to
├── sql/
│   ├── sql_bop_v2_101_ci001_cost_model.sql
│   ├── sql_bop_v2_102_ci001_order_cost_snapshot.sql
│   ├── sql_bop_v2_103_ci001_metric_registry.sql
│   ├── sql_bop_v2_104_ci001_events.sql
│   ├── sql_bop_v2_105_ci001_consent.sql
│   ├── sql_bop_v2_106_ci001_sessions.sql
│   ├── sql_bop_v2_107_ci001_daily_facts.sql
│   ├── sql_bop_v2_108_ci001_scoring.sql
│   ├── sql_bop_v2_109_ci001_attention.sql
│   ├── sql_bop_v2_110_ci001_data_health.sql
│   └── sql_bop_v2_111_ci001_ad_spend.sql
├── docs/
│   ├── DESSHOP_CI001_IMPLEMENTATION_PLAN.md  ← this file
│   └── ci001/
│       ├── SPEC.md
│       ├── metrics.seed.yaml
│       ├── scores.seed.yaml
│       └── fixtures/golden-order.json
└── __tests__/ci001/
    ├── golden-order.test.ts
    ├── idempotency.test.ts
    ├── consent.test.ts
    ├── shrinkage.test.ts
    ├── settle.test.ts
    └── reconciliation.test.ts
```

---

## 18. CLAUDE.md Module Rules

Add to the repo CLAUDE.md or `docs/ci001/CLAUDE.md`:

### Non-negotiables

1. **TWO PLANES.** Every metric is Plane A or Plane B. Never combine without `_projected` suffix and stored consent_rate.
2. **THE REGISTRY IS THE LAW.** No metric computed unless it exists in `ci_metric_def`. Inline ad-hoc SQL is a review failure.
3. **DASHBOARDS NEVER READ `ci_events`.** All reads go through `ci_daily_*`. API role has SELECT revoked on ci_events.
4. **MONEY IS EX-VAT, IN EUR, NET OF RETURNS, PLANE A.** Returns rebooked to original order date.
5. **NO COST, NO MARGIN.** `cost_source='missing'` excluded from margin metrics. Never coalesce to zero.
6. **JOBS ARE IDEMPOTENT BY (job_id, date).** Re-running produces byte-identical output. Every job writes to ci_job_run.
7. **SCORES REQUIRE SAMPLE.** Below min_sample → score NULL with suppressed_reason. Never default, never extrapolate.
8. **NO POINT-ESTIMATE IMPACT CLAIMS.** Always ranges with stated basis and confidence.
9. **MULTI-TENANT FROM DAY ONE.** Every table has tenant_id. Every query filters on it. Every table has RLS.
10. **BOP CONVENTIONS.** bop_objects registration, PBAC permissions (`analytics.*`), i18n NL/EN/DE/FR/TR, DataGrid for tables, Telegram alerting, `des-build` discipline.

### Migration conventions
- File: `sql/sql_bop_v2_1XX_ci001_<slug>.sql`
- Every migration has a `-- ROLLBACK:` block
- Never edit a migration that has run on dev — add a new one
- DDL on L3/L4 objects requires a `bop_doc_flow` entry

### Definition of done (every CI001 task)
- [ ] Migration applied cleanly on fresh DB and on dev
- [ ] RLS policy present and tested with second tenant
- [ ] Unit tests pass, including golden-order fixture where money is touched
- [ ] `ci_data_health` still green
- [ ] bop_objects entry created/updated
- [ ] i18n keys added for all 5 locales
- [ ] SY024/SY028/SY034/SY035 documentation updated (doc-update-gate)
- [ ] Nothing in prod was touched directly

---

## Appendix A — GA4 Divergences

| Topic | GA4 | DESShop CI |
|-------|-----|------------|
| Session midnight split | Yes | No |
| Attribution | Data-driven | Last non-direct click |
| Revenue basis | Often incl. VAT/shipping | Ex-VAT, ex-shipping, net of returns |
| Returns | Not reflected | Rebooked to original order date |
| Sampling | Yes, above thresholds | Never |
| Consent handling | Modelled/estimated | Observed + explicitly labelled projection |
| Source of truth for money | — | Always Plane A |

GA4 stays useful for acquisition cross-check. It is never the reference for a euro figure.

---

## Appendix B — Existing ANL Screens (keep operational)

The 30+ existing `app/console/anl/` screens serve broader BOP analytics (all tenants, all sites). They continue to operate alongside CI001. CI001 screens live under `app/console/shp/analytics/` and serve DESShop commerce intelligence specifically.

| Existing screen | Overlap with CI001 | Action |
|-----------------|-------------------|--------|
| `anl/overview` | Partial — general traffic stats | Keep; CI001 Overview has commerce KPIs |
| `anl/sessions` | Session data from dm_activity_sessions | Keep; CI001 uses ci_sessions (richer model) |
| `anl/page-views` | Page view counts | Keep; CI001 adds product-specific view tracking |
| `anl/realtime` | Live visitor count | Keep — CI001 doesn't do realtime in v1 |
| `anl/cloudflare` | CDN metrics | Keep — out of CI001 scope |

---

## Appendix C — Success Criteria

The module is done when Sunay can answer these without SQL, and the numbers reconcile to the bookkeeping:

1. What did we sell, and what did we actually earn on it after all costs?
2. Which products make money, which lose money, and which are hidden opportunities?
3. Where in the funnel are we losing people — and is that real or a consent artefact?
4. Which traffic and which campaigns are profitable on a POAS basis?
5. Who are the repeat customers, and which customers cost more than they bring?
6. What should be reordered this week, and what is dead capital on the shelf?
7. What are people searching for that we do not sell?
8. Which products or vehicle models generate wrong-fit returns?
9. What are the five things that need attention today?

If a screen does not serve one of these nine questions, it does not ship in v1.

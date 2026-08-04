# BOP V2 — Trade Flow Engine (BOP-TFE)

> **Program:** BOP-TFE | **Console:** /opt/dessystems-console | **Stack:** Next.js 14 / TypeScript / Supabase / Zoho SMTP / Telegram
> **Estimated effort:** ~33 FTE days (7 working weeks solo) | **Target:** 2026-10-15
> **Scope:** Lead → Case → Quotation → Order → Invoice → Handover → Warranty → Survey → Review
> **Status:** 4/8 phases done (54%) — P0-P3 deployed, P4-P7 pending
> **Last updated:** 2026-08-04

---

## Architecture Overview

| Object | Module | Status | Migration | Details |
|--------|--------|--------|-----------|---------|
| bop_cases | SAL | DEPLOYED (P0) | v2_70 | Business Case umbrella, auto-number CA-YYYYMM-XXXXX |
| bop_doc_flow | SAL | DEPLOYED (P0) | v2_70 | Document chain: converted/reversed/partial/replaced/spawned |
| bop_status_transitions | SAL | DEPLOYED (P0) | v2_70 | Audit trail for every status change |
| bop_customer_approvals | SAL | DEPLOYED (P0) | v2_70 | Token-based customer acceptance gates |
| bop_conversion_rules | SAL | DEPLOYED (P0) | v2_70 | Source+status → target mapping (9 seed rows) |
| bop_copy_control | SAL | DEPLOYED (P0) | v2_70 | Field mapping during conversion |
| bop_lead_transitions | CRM | DEPLOYED (P1) | v2_71 | Lead stage adjacency table (11 transition rules) |
| bop_quotation_transitions | SAL | DEPLOYED (P2) | v2_73 | Quotation status transitions (10 rules) |
| bop_order_transitions | SAL | DEPLOYED (P3) | v2_74 | Order status transitions (11 rules) |
| crm_leads | CRM | ADAPTED (P1) | v2_71 | +direction, channel, ref_code, converted_case_id, owner |
| sal_quotations | SAL | ADAPTED (P2) | v2_73 | +case_id, btw_regime, snapshot, version, replaces_id |
| sal_orders | SAL | ADAPTED (P3) | v2_74 | +case_id, btw_regime, vehicle_id, koopovereenkomst_url, delivery_terms, aanbetaling_pct, cancel_reason/type |
| fin_invoices | FIN | PENDING (P4) | — | +case_id, btw_regime, snapshot, invoice_pdf_url |
| sal_handovers | SAL | PENDING (P5) | — | NEW: vehicle delivery + checklist + signature |
| sal_warranties | SAL | PENDING (P6) | — | NEW: post-sale warranty tracking + claims |
| sal_surveys | SAL | PENDING (P6) | — | NEW: NPS + satisfaction + review routing |

---

## Deployed RPCs

| RPC | Phase | Purpose |
|-----|-------|---------|
| `bop_lead_allowed_transitions(lead_id)` | P1 | Returns valid next stages |
| `bop_lead_transition(lead_id, to_status, actor, reason)` | P1 | Validated stage change + audit trail |
| `bop_convert_lead(lead_id, target)` | P1 | Lead → Case + Quotation/Order atomically |
| `bop_quotation_allowed_transitions(quotation_id)` | P2 | Returns valid next statuses |
| `bop_quotation_transition(quotation_id, to_status, actor, reason)` | P2 | Validated status change + audit trail |
| `bop_quotation_send(quotation_id, actor)` | P2 | Freeze snapshot + create approval token |
| `bop_quotation_new_version(quotation_id, actor)` | P2 | Clone as draft v+1, expire old, doc_flow=replaced |
| `bop_approval_respond(token, response, reason, signature)` | P2 | Shared handler for quotation+order approval tokens |
| `bop_order_allowed_transitions(order_id)` | P3 | Returns valid next statuses |
| `bop_order_transition(order_id, to_status, actor, reason)` | P3 | Validated status change + audit trail |
| `bop_order_confirm(order_id, actor)` | P3 | OLS vehicle lock + approval token + confirmed |
| `bop_order_cancel(order_id, reason_type, reason, actor)` | P3 | Refund guard + lock release + cancelled |

---

## Deployed API Routes

| Route | Method | Phase | Purpose |
|-------|--------|-------|---------|
| `/api/bop/crm/leads` | GET/POST | P1 | Lead list (with direction/channel filters) + create |
| `/api/bop/crm/leads/[id]` | GET/PATCH | P1 | Lead detail + update |
| `/api/bop/crm/leads/[id]/transition` | GET/POST | P1 | Allowed transitions + execute transition |
| `/api/bop/crm/leads/[id]/convert` | POST | P1 | Convert lead → quotation/order |
| `/api/bop/sal/quotations/[id]/transition` | GET/POST | P2 | Allowed transitions + execute transition |
| `/api/bop/sal/quotations/[id]/send` | POST | P2 | Send quotation (freeze snapshot + approval token) |
| `/api/bop/sal/quotations/[id]/new-version` | POST | P2 | Create new version |
| `/api/bop/sal/orders/[id]/transition` | GET/POST | P3 | Allowed transitions + execute transition |
| `/api/bop/sal/orders/[id]/confirm` | POST | P3 | Confirm order (OLS lock + approval) |
| `/api/bop/sal/orders/[id]/cancel` | POST | P3 | Cancel order (refund guard) |
| `/api/bop/approve` | GET/POST | P2 | Public approval token handler |

---

## Deployed UI Screens

| Screen | Module | Phase | Changes |
|--------|--------|-------|---------|
| CR001 Leads | CRM | P1 | DataGrid with filter presets (All, Buy-side, Sell-side, Website, Marketplace, Qualified, Lost), search by ref/name, direction badges |
| CR002 Lead Detail | CRM | P1 | Validated transitions from RPC, Convert split-button (→Quotation / →Order), direction badge, converted banner |
| SA002 Quotation Detail | SAL | P2 | Validated transitions, Send to Customer button, New Version button, version badge (v2+), BTW regime badge (Marge/BTW belast), snapshot frozen banner, marge regime hides VAT line |
| SA010 Order Detail | SAL | P3 | Validated transitions (9-status flow), Confirm Order button, Cancel Order modal (reason type dropdown + free text), refund guard message, BTW regime badge, cancel reason banner, deposit % display |
| SY051 Implementation Cockpit | SYS | — | Compact program bar, OP001 task link with searchable dropdown, Refresh/Back buttons, Delete Program, Verify All |

---

## Rules for Every Phase

- All status transitions go through Postgres RPCs. No direct `UPDATE ... SET status` ever.
- Every conversion writes to `bop_doc_flow`. Every transition writes to `bop_status_transitions`.
- Never delete rows. Terminal states + soft-delete lifecycle only.
- Prices and BTW regime are COPIED between documents via `bop_copy_control`, never re-derived.
- New tables get RLS policies and register in `lib/bop/manifests/index.ts`.
- `bop_objects` registration: type must be `screen`, `api`, `table`, or `component` (NOT `rpc`). `lifecycle_state` must be `active` (NOT `ga`).
- `bop_dependencies` dep_type must be: `calls, renders, reads, writes, triggers, inherits, uses` (NOT `references` or `supports`).
- Email via Zoho SMTP (nodemailer) using existing 3-layer template system.
- Telegram alert on every customer-facing event.

---

## SQL Migration Files

| File | Phase | Status | Blocks |
|------|-------|--------|--------|
| `sql_bop_v2_70_trade_flow_foundation.sql` | P0 | Deployed | 6 tables + seeds + registration |
| `sql_bop_v2_71_lead_consolidation.sql` | P1 | Deployed | ALTER crm_leads + transitions table + 3 RPCs + counter |
| `sql_bop_v2_72_sy_tasks_op_link.sql` | SY051 | Deployed | op_task_id column + recreated progress views |
| `sql_bop_v2_73_quotation_versioning.sql` | P2 | Deployed | ALTER sal_quotations + transitions table + 4 RPCs + RLS |
| `sql_bop_v2_74_order_confirmation.sql` | P3 | Deployed | ALTER sal_orders + transitions table + 4 RPCs + RLS |

---

## Status Flows

### Lead (P1)
```
new → assigned → contacted → qualified → converted
                                        → lost
                                        → archived
```

### Quotation (P2)
```
draft → sent → viewed → accepted
             → viewed → declined
             → viewed → expired
       sent  → accepted / declined / expired
draft → cancelled
sent  → cancelled
accepted → expired (new_version_created)
```

### Order (P3)
```
draft → confirmed → customer_confirmed → in_preparation → ready → handover_scheduled → delivered → completed
                                                                                                 → cancelled (from draft/confirmed/customer_confirmed/in_preparation)
```
Guards: `confirmed` requires `koopovereenkomst_sent`, `customer_confirmed` requires `approval_token`, `handover_scheduled` requires `delivery_date_set`, `completed` requires `paid_in_full`, `cancelled` from customer_confirmed/in_preparation requires `refund_check`.

---

## Type Definitions

File: `lib/bop/types/trade-flow.ts`

```typescript
BUSINESS_LINES = ['vehicle_sale', 'camper_conversion', 'rental', 'ecommerce', 'sourcing']
CASE_LANGUAGES = ['en', 'nl', 'de', 'fr', 'tr']
DOC_FLOW_RELATIONS = ['converted', 'reversed', 'partial', 'replaced', 'spawned']
ACTOR_TYPES = ['staff', 'customer', 'system']
APPROVAL_METHODS = ['link', 'in_person', 'email_reply']
APPROVAL_STATUSES = ['pending', 'accepted', 'declined', 'expired']
COPY_MODES = ['copy', 'derive', 'require_input', 'constant']
DOC_OBJECTS = ['crm_leads', 'sal_quotations', 'sal_orders', 'fin_invoices', 'sal_handovers']
LEAD_DIRECTIONS = ['buy_side', 'sell_side']
LEAD_CHANNELS = ['website', 'marktplaats', 'autoscout', 'phone', 'walk_in', 'referral', 'whatsapp', 'contact_form', 'appointment']
LEAD_STAGES = ['new', 'assigned', 'contacted', 'qualified', 'converted', 'lost', 'archived']
QUOTATION_STATUSES = ['draft', 'sent', 'viewed', 'accepted', 'declined', 'expired', 'cancelled']
BTW_REGIMES = ['marge', 'btw_belast']
ORDER_STATUSES = ['draft', 'confirmed', 'customer_confirmed', 'in_preparation', 'ready', 'handover_scheduled', 'delivered', 'completed', 'cancelled']
CANCEL_REASON_TYPES = ['customer_withdrew', 'financing_failed', 'vehicle_issue', 'other']
```

---

## Phase 0 — Foundation Tables (DONE)

**Migration:** `sql_bop_v2_70_trade_flow_foundation.sql`
**Deployed:** 2026-08-03

6 tables created: `bop_cases`, `bop_doc_flow`, `bop_status_transitions`, `bop_customer_approvals`, `bop_conversion_rules`, `bop_copy_control`. Auto-numbering trigger for cases (CA-YYYYMM-XXXXX). 9 conversion rules seeded. Copy control field mappings for quotation→order and order→invoice. RLS policies on all tables. Counter registered (CA). All objects registered in `bop_objects` and `bop_dependencies`.

---

## Phase 1 — Lead Consolidation + Conversion Gate (DONE)

**Migration:** `sql_bop_v2_71_lead_consolidation.sql`
**Deployed:** 2026-08-03

Added `direction`, `channel`, `ref_code` (auto-numbered LD-YYYYMM-XXXXX), `converted_case_id`, `owner` to `crm_leads`. Stage migration: won→converted, proposal/negotiation→qualified. New constraint: new/assigned/contacted/qualified/converted/lost/archived. `bop_lead_transitions` table with 11 adjacency rules. 3 RPCs for validated transitions and lead conversion. Counter registered (LD).

CR001 rewritten: DataGrid with filter presets (All, Buy-side, Sell-side, Website, Marketplace, Qualified, Lost). CR002 rewritten: validated transition buttons from RPC, Convert split-button for qualified leads.

---

## Phase 2 — Quotation: Versions + Customer Acceptance (DONE)

**Migration:** `sql_bop_v2_73_quotation_versioning.sql`
**Deployed:** 2026-08-04

Added `case_id`, `btw_regime` (marge/btw_belast), `snapshot` (JSONB), `version` (integer), `replaces_id` (self-FK) to `sal_quotations`. Status expanded to include `viewed`. `bop_quotation_transitions` table with 10 rules.

RPCs:
- `bop_quotation_send`: validates draft status, freezes snapshot (lines + totals + btw + valid_until), creates approval token in `bop_customer_approvals`, transitions to `sent`
- `bop_quotation_new_version`: clones quotation as draft with version+1, expires old version, writes `replaced` to `bop_doc_flow`
- `bop_approval_respond`: shared handler for quotation and order approval tokens — validates token, checks expiry, updates approval row, transitions entity status

SA002 rewritten: validated transitions from RPC (no more free-form status buttons), "Send to Customer" button (draft only), "New Version" button (sent/viewed/declined), version badge for v2+, BTW regime badge, snapshot frozen banner, marge regime hides VAT line in totals.

API routes: `/quotations/[id]/transition` (GET/POST), `/send` (POST), `/new-version` (POST), `/approve` (GET/POST).

---

## Phase 3 — Order: Confirmation + Vehicle Lock + Koopovereenkomst (DONE)

**Migration:** `sql_bop_v2_74_order_confirmation.sql`
**Deployed:** 2026-08-04

Added `case_id`, `btw_regime`, `vehicle_id`, `koopovereenkomst_url`, `delivery_terms`, `aanbetaling_pct`, `cancel_reason`, `cancel_reason_type` to `sal_orders`. Status expanded from 5 to 9: draft → confirmed → customer_confirmed → in_preparation → ready → handover_scheduled → delivered → completed | cancelled. `bop_order_transitions` table with 11 rules including guards.

RPCs:
- `bop_order_confirm`: acquires OLS vehicle lock (checks for existing lock, raises if already locked), transitions to `confirmed`, creates approval token for customer confirmation
- `bop_order_cancel`: checks for paid deposits (returns `needs_refund: true` if credit note needed first), releases OLS vehicle lock, sets cancel_reason/type, transitions to `cancelled`

SA010 rewritten: validated transitions from RPC, "Confirm Order" button (draft only), Cancel Order modal with reason type dropdown (customer_withdrew/financing_failed/vehicle_issue/other) and free-text reason, refund guard message, BTW regime badge, cancel reason banner for cancelled orders.

API routes: `/orders/[id]/transition` (GET/POST), `/confirm` (POST), `/cancel` (POST).

---

## Phase 4 — Invoice Linking + Payment Tracking (PENDING, ~3 days)

**Goal:** Adapt FI001/FI011. Link invoices into trade flow via doc_flow, add derived payment state.

- **Adapt fin_invoices:** Add `case_id`, `btw_regime`, `snapshot` JSONB, `invoice_pdf_url`
- **`invoice_payment_state(id)`:** Returns {status: unpaid|partial|paid, overdue: bool, credited: none|partial|full}
- **`bop_create_invoice_from_order(order_id, kind, amount?, user_id)`:** kind=deposit|final|credit_note
- **FI011 UI:** Case breadcrumb, source order link, derived payment badges
- **FI001 UI:** Add case_number column + filter
- **Invoice PDF template** with marge/btw_belast variants

---

## Phase 5 — Handover: Mobile Checklist + Signature (PENDING, ~5 days)

**Goal:** New sal_handovers table + mobile-first checklist screen (SA019).

- **Flow:** `scheduled → in_progress → executed → completed`
- **`bop_handover_complete`:** Single transaction — signature + warranty + survey schedule + OLS release + order→delivered
- **SA019:** Single-column mobile, sections: Odometer → Fuel → Keys → Accessories → Photos → RDW refs → Notes → SignaturePad

---

## Phase 6 — Post-Sale: Warranty + Survey + NPS + Review (PENDING, ~4 days)

**Goal:** Warranty tracking with claim flow. Customer survey at +7d. Smart review routing.

- **sal_warranties:** starts_at, term_months, expires_at (generated), status (active/claimed/expired/voided)
- **sal_surveys:** NPS 0-10, rating 1-5, feedback, would_recommend
- **Smart routing:** NPS ≥ 9 → Google/Trustpilot links; NPS ≤ 6 → internal queue + Telegram
- **Daily cron:** Warranty expiry

---

## Phase 7 — Case Timeline + Derived Statuses + Guard Rails (PENDING, ~4 days)

**Goal:** Derived status functions, Case detail with unified timeline, guard rails.

- **Derived functions:** `invoice_payment_state(id)`, `vehicle_availability(id)`, `case_stage(id)`
- **TR001 Case Detail:** Header + timeline (UNION of doc_flow + transitions + approvals + comm_history)
- **TR000 Case List:** DataGrid with case_number, customer, business_line, stage, owner
- **Guard Rails:** DB trigger preventing direct status UPDATE outside RPC context

---

## SY051 Implementation Cockpit

| Phase | Status | Tasks | Deliverables | Progress |
|-------|--------|-------|-------------|----------|
| P0 Foundation | done | 6/6 | 18/18 | 100% |
| P1 Lead Consolidation | done | 4/4 | 18/18 | 100% |
| P2 Quotation Versioning | done | 5/5 | 20/20 | 100% |
| P3 Order Confirmation | done | 5/5 | 17/17 | 100% |
| P4 Invoice Linking | not started | 0/4 | 0/11 | 0% |
| P5 Handover | not started | 0/4 | 0/15 | 0% |
| P6 Post-Sale | not started | 0/4 | 0/14 | 0% |
| P7 Case Timeline | not started | 0/5 | 0/22 | 0% |

---

## Lessons Learned / Constraints

| Constraint | Details |
|-----------|---------|
| `bop_objects.type` | Only: `screen`, `api`, `table`, `component` — NOT `rpc` |
| `bop_objects.lifecycle_state` | Only: `active`, `dev`, `deprecated` — NOT `ga` |
| `bop_dependencies.dep_type` | Only: `calls, renders, reads, writes, triggers, inherits, uses` — NOT `references` or `supports` |
| `sy_phases.status` | Only: `draft, active, paused, done, cancelled` — NOT `verified` |
| Supabase SQL Editor | Stops at first error in multi-statement blocks — run each block separately |
| Dev server | Runs from `/opt/dessystems-console-dev/` on port 4401 — files must be synced from `/opt/dessystems-console/` |
| Nginx ports | Never start Next.js on nginx-owned ports (80, 443, 3003, 4400) |

---

## Risk Register

| Risk | Mitigation |
|------|------------|
| Legacy lead data merge | Additive migration. Old tables kept. Row-count reconciliation. |
| Approval token leakage | UUID token, single-use, expiry, rate limiting. |
| OLS lock stale/deadlock | Existing 4-min TTL + heartbeat + admin force-release. |
| No PDF generation | Phase 2/3 approval pages work without PDF. PDF gen deferred to P4. |
| Solo bus factor | Each phase independently deployable + revertible. |

---

## Timeline

| Phase | Scope | Days | Status |
|-------|-------|------|--------|
| 0 | Foundation tables (6 new) | 3 | DONE |
| 1 | Lead consolidation + conversion gate | 4 | DONE |
| 2 | Quotation lifecycle + customer approval | 5 | DONE |
| 3 | Order + vehicle lock + koopovereenkomst | 5 | DONE |
| 4 | Invoice linking + payment tracking | 3 | PENDING |
| 5 | Handover + signature | 5 | PENDING |
| 6 | Post-sale automation | 4 | PENDING |
| 7 | Case timeline + guards | 4 | PENDING |
| **Total** | | **33** | **4/8 done** |

Phases 0-3 deliver usable vehicle trade flow. Phases 4-7 complete the automation layer.

# Trade Flow Engine — Test Scenarios

**Program:** BOP-TFE  
**Version:** 1.0  
**Date:** 2026-08-09  
**Status:** Active — P0-P4 completed, P5-P7 pending

---

## How to use this document

Each phase has numbered test scenarios. For each scenario:
1. Follow the **Steps** exactly in order
2. Check the **Expected Result** after each step
3. If a step fails, note the discrepancy in SY051 (discrepancy field)
4. When all scenarios for a task pass, tick the **Tested** checkbox in SY051

---

## P0 — Foundation

### T0.1 — Status Machine Tables Exist

**Scope:** Verify all foundation tables are deployed and accessible.

| # | Step | Expected Result |
|---|------|-----------------|
| 1 | Open Supabase SQL Editor | Editor loads |
| 2 | Run: `SELECT count(*) FROM bop_cases` | Returns a number (0 or more), no error |
| 3 | Run: `SELECT count(*) FROM bop_doc_flow` | Returns a number, no error |
| 4 | Run: `SELECT count(*) FROM bop_status_transitions` | Returns a number, no error |
| 5 | Run: `SELECT count(*) FROM bop_customer_approvals` | Returns a number, no error |
| 6 | Run: `SELECT count(*) FROM bop_conversion_rules` | Returns a number, no error |
| 7 | Run: `SELECT count(*) FROM bop_copy_control` | Returns a number, no error |

### T0.2 — Status Transitions Adjacency

**Scope:** Verify the adjacency-table pattern works correctly.

| # | Step | Expected Result |
|---|------|-----------------|
| 1 | Run: `SELECT DISTINCT object_type FROM bop_status_transitions` | Lists object types: lead, quotation, order (at minimum) |
| 2 | Run: `SELECT from_status, to_status FROM bop_status_transitions WHERE object_type = 'lead' ORDER BY from_status` | Returns valid lead transitions (e.g. new→qualified, qualified→converted) |
| 3 | Run: `SELECT from_status, to_status FROM bop_status_transitions WHERE object_type = 'quotation' ORDER BY from_status` | Returns quotation transitions |
| 4 | Run: `SELECT from_status, to_status FROM bop_status_transitions WHERE object_type = 'order' ORDER BY from_status` | Returns 9-status order flow |

### T0.3 — Doc Flow Configuration

**Scope:** Verify document flow chain is configured.

| # | Step | Expected Result |
|---|------|-----------------|
| 1 | Run: `SELECT source_type, target_type, copy_rule FROM bop_doc_flow ORDER BY source_type` | Shows flow chain: lead→quotation→order→invoice |
| 2 | Verify each row has a valid `copy_rule` | Rules reference bop_copy_control entries |

---

## P1 — Lead Consolidation

### T1.1 — Lead Stage Machine RPCs

**Scope:** Verify lead transition RPCs function correctly.

| # | Step | Expected Result |
|---|------|-----------------|
| 1 | Navigate to CR001 (CRM Leads list) in console | Page loads, leads are listed |
| 2 | Open any lead in status "new" | Lead detail page shows current status "new" |
| 3 | Check available transitions | Allowed transitions show as buttons (e.g. "Qualify", "Reject") |
| 4 | Click "Qualify" (or equivalent transition) | Status changes to "qualified", toast confirms |
| 5 | Verify the transition is logged | Check activity/event log shows the status change |
| 6 | Try an invalid transition (e.g. "qualified" → "new") | Should be blocked/not available |

### T1.2 — Lead Auto-Numbering (ref_code)

**Scope:** Verify leads get automatic reference numbers.

| # | Step | Expected Result |
|---|------|-----------------|
| 1 | Create a new lead via CR001 | Lead is created |
| 2 | Check the `ref_code` field | Auto-generated reference number is populated (format: L-XXXXX or similar) |
| 3 | Create a second lead | ref_code increments sequentially |

### T1.3 — Lead Conversion

**Scope:** Verify lead-to-quotation conversion works.

| # | Step | Expected Result |
|---|------|-----------------|
| 1 | Open a lead in "qualified" status | Lead detail loads |
| 2 | Click "Convert to Quotation" | Conversion dialog appears |
| 3 | Confirm conversion | New quotation is created, lead status → "converted" |
| 4 | Open the created quotation | Quotation has customer data copied from lead |
| 5 | Run: `SELECT * FROM bop_cases WHERE source_type = 'lead' AND source_id = '<lead_id>'` | Case record links lead to quotation |

---

## P2 — Quotation Versioning

### T2.1 — Quotation Creation and Send

**Scope:** Verify quotation send freezes snapshot and creates approval token.

| # | Step | Expected Result |
|---|------|-----------------|
| 1 | Navigate to SA002 (Quotations) | Quotation list loads |
| 2 | Open a draft quotation | Detail page shows status "draft" |
| 3 | Add/verify line items, marge, BTW | Values display correctly |
| 4 | Click "Send" | Confirmation dialog appears |
| 5 | Confirm send | Status → "sent", snapshot is frozen |
| 6 | Run: `SELECT snapshot, approval_token FROM sal_quotations WHERE id = '<quot_id>'` | `snapshot` is not null (JSON), `approval_token` is not null |

### T2.2 — Quotation Versioning

**Scope:** Verify version chain works.

| # | Step | Expected Result |
|---|------|-----------------|
| 1 | Open a sent quotation | Detail page shows "sent" status |
| 2 | Click "New Version" | New quotation is created |
| 3 | Check the new version | `version` is incremented, `replaces_id` points to original |
| 4 | Check the original quotation | Status is now "superseded" or "expired" |
| 5 | Run: `SELECT id, version, replaces_id, status FROM sal_quotations WHERE replaces_id = '<original_id>' OR id = '<original_id>' ORDER BY version` | Shows version chain with correct statuses |

### T2.3 — Customer Approval Response

**Scope:** Verify shared approval link works.

| # | Step | Expected Result |
|---|------|-----------------|
| 1 | Get the approval token from a sent quotation | Token exists |
| 2 | Open the customer approval URL in incognito | Quotation summary page loads (public) |
| 3 | Click "Accept" | Status → "accepted" |
| 4 | Verify in console | SA002 shows quotation as "accepted" |

---

## P3 — Order Confirmation

### T3.1 — Order Status Flow (9 statuses)

**Scope:** Verify the complete order flow: draft → confirmed → customer_confirmed → in_preparation → ready → handover_scheduled → delivered → completed.

| # | Step | Expected Result |
|---|------|-----------------|
| 1 | Navigate to SA010 (Orders) | Order list loads |
| 2 | Open a draft order | Detail shows status "draft" |
| 3 | Click "Confirm" | Status → "confirmed", OLS vehicle lock activated |
| 4 | Verify vehicle lock | Run: `SELECT locked FROM ols_vehicles WHERE id = '<vehicle_id>'` → true |
| 5 | Customer confirms (via approval link or manual) | Status → "customer_confirmed" |
| 6 | Progress through: in_preparation → ready | Each transition works, buttons appear correctly |
| 7 | Set handover_scheduled | Status updates, handover date is set |
| 8 | Mark as delivered | Status → "delivered" |
| 9 | Complete the order | Status → "completed" |

### T3.2 — Order Cancellation with Refund Guard

**Scope:** Verify cancellation flow and vehicle lock release.

| # | Step | Expected Result |
|---|------|-----------------|
| 1 | Open a confirmed order | Status is "confirmed" or later |
| 2 | Click "Cancel" | Cancel modal appears |
| 3 | If payments exist, verify refund check | Modal shows refund warning/status |
| 4 | Confirm cancellation | Status → "cancelled" |
| 5 | Verify vehicle lock released | Run: `SELECT locked FROM ols_vehicles WHERE id = '<vehicle_id>'` → false or null |
| 6 | Verify case record | `bop_cases` shows cancellation event |

### T3.3 — Invalid Transitions Blocked

**Scope:** Verify invalid status transitions are rejected.

| # | Step | Expected Result |
|---|------|-----------------|
| 1 | Open a "completed" order | Status is "completed" |
| 2 | Try to change status to "draft" | No button available, or API returns error |
| 3 | Open a "cancelled" order | Status is "cancelled" |
| 4 | Try to change status to "confirmed" | Blocked — cancelled is terminal |

---

## P4 — Invoice Linking

### T4.1 — Invoice-to-Order Link

**Scope:** Verify invoices are correctly linked to orders via TFE columns.

| # | Step | Expected Result |
|---|------|-----------------|
| 1 | Run: `SELECT column_name FROM information_schema.columns WHERE table_name = 'fin_invoices' AND column_name IN ('order_id', 'case_id', 'tfe_status')` | All TFE columns exist |
| 2 | Create an invoice linked to an order | Invoice created with `order_id` populated |
| 3 | Verify in bop_doc_flow | Document flow chain: lead → quotation → order → invoice is complete |

---

## Cross-Phase Tests

### TX.1 — End-to-End Flow (Golden Path)

**Scope:** Verify the complete deal lifecycle from lead to invoice.

| # | Step | Expected Result |
|---|------|-----------------|
| 1 | Create a new lead in CR001 | Lead created with auto ref_code |
| 2 | Qualify the lead | Status → "qualified" |
| 3 | Convert lead to quotation | Quotation created, lead → "converted" |
| 4 | Edit quotation, add line items | Line items saved |
| 5 | Send quotation | Snapshot frozen, approval token created |
| 6 | Accept quotation (customer approval) | Status → "accepted" |
| 7 | Convert quotation to order | Order created in "draft" |
| 8 | Confirm order | Status → "confirmed", vehicle locked |
| 9 | Progress through order statuses to "completed" | All 9 statuses transition correctly |
| 10 | Verify bop_cases chain | Cases link: lead → quotation → order through the full chain |
| 11 | Verify bop_doc_flow | Document flow records exist for each conversion |

### TX.2 — RLS / Permission Guard

**Scope:** Verify row-level security on TFE tables.

| # | Step | Expected Result |
|---|------|-----------------|
| 1 | Run: `SELECT tablename FROM pg_tables WHERE tablename LIKE 'bop_%' AND schemaname = 'public'` | All TFE tables listed |
| 2 | Run: `SELECT tablename, policyname FROM pg_policies WHERE tablename LIKE 'bop_%'` | RLS policies exist on TFE tables |
| 3 | Try accessing data as unauthenticated user (anon key) | Should be blocked or return empty |

### TX.3 — SY043 Visual Flow Viewer

**Scope:** Verify the TFE visual pipeline viewer works.

| # | Step | Expected Result |
|---|------|-----------------|
| 1 | Navigate to SY043 (`/console/sys/tfe-flow`) | Page loads with pipeline visualization |
| 2 | Click on each business object (Lead, Quote, Order, etc.) | Object detail expands, shows status flow |
| 3 | Verify status colors and transitions match implemented flows | Visual matches P0-P3 status machines |
| 4 | Check SY034 → SY043 badge link | In Documentation Browser, trade-flow-engine docs show SY043 badge |
| 5 | Click SY043 badge | Opens Visual Flow Viewer for correct flow |

### TX.4 — SY051 Implementation Cockpit Consistency

**Scope:** Verify SY051 tracks TFE progress correctly.

| # | Step | Expected Result |
|---|------|-----------------|
| 1 | Navigate to SY051 (`/console/sys/impl`) | Page loads |
| 2 | Select BOP-TFE program | Program loads with phases P0-P7 |
| 3 | Expand all phases | Tasks and deliverables visible |
| 4 | Click "Verify All" | Auto-verification runs on all deliverables |
| 5 | Check progress percentages | P0-P4 should show high completion, P5-P7 pending |
| 6 | Test "Tested" checkbox on a completed task | Checkbox toggles, tested_at timestamp shown |
| 7 | Test discrepancy note on a task | Edit, save, verify persisted |

---

## P5-P7 — Pending Phases (Test when implemented)

### P5 — Handover & Delivery
- Afleverbon scheduling flow
- Delivery confirmation and sign-off
- Handover document generation

### P6 — Warranty Tracking
- Warranty period activation on delivery
- Warranty expiry notifications
- Warranty claim flow

### P7 — Survey/NPS Automation
- Auto-survey trigger after completion
- NPS score collection
- Feedback routing to CRM

---

## Test Completion Checklist

| Phase | Scenarios | Status |
|-------|-----------|--------|
| P0 Foundation | T0.1, T0.2, T0.3 | ☐ |
| P1 Lead Consolidation | T1.1, T1.2, T1.3 | ☐ |
| P2 Quotation Versioning | T2.1, T2.2, T2.3 | ☐ |
| P3 Order Confirmation | T3.1, T3.2, T3.3 | ☐ |
| P4 Invoice Linking | T4.1 | ☐ |
| Cross-Phase | TX.1, TX.2, TX.3, TX.4 | ☐ |

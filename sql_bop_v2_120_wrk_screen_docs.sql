-- BOP V2 Migration 120 — WRK screen help documentation
-- Inserts bop_documentation rows for all 13 WK screens (WK001–WK013)
-- Doc types: overview, faq, reference (3 per screen = 39 rows)

BEGIN;

-- ── WK001 — Workshop Dashboard ─────────────────────────────────────
INSERT INTO bop_documentation (target_type, target_id, doc_type, seq, title, body_md, module, status, owner)
VALUES
('screen', 'WK001', 'overview', 0, 'Workshop Dashboard',
 '**Workshop Dashboard** (`WK001`) belongs to the Workshop Intelligence module. Route: `/console/wrk/dashboard`.\n\nCentral overview of workshop activity: open work orders, today''s planning slots, pending approvals, efficiency metrics, and upcoming APK reminders. All KPI tiles refresh on page load.',
 'WRK', 'active', 'ai-draft'),

('screen', 'WK001', 'faq', 1, 'Where does this data live?',
 'Primary tables: `wrk_orders`, `wrk_planning_slots`, `wrk_approvals`, `wrk_efficiency_metrics`, `wrk_apk_reminders` (Supabase/Postgres). This screen is read-only — it aggregates data from other WRK screens.',
 'WRK', 'active', 'ai-draft'),

('screen', 'WK001', 'reference', 1, 'APIs & data',
 '- `/api/bop/wrk/dashboard` — GET → `wrk_orders`, `wrk_planning_slots`, `wrk_approvals`, `wrk_efficiency_metrics`, `wrk_apk_reminders`',
 'WRK', 'active', 'ai-draft'),

-- ── WK002 — Work Orders ────────────────────────────────────────────
('screen', 'WK002', 'overview', 0, 'Work Orders',
 '**Work Orders** (`WK002`) belongs to the Workshop Intelligence module. Route: `/console/wrk/orders`.\n\nCreate, edit, and manage workshop work orders with order lines. Supports full lifecycle: draft → scheduled → in_progress → waiting_parts → waiting_approval → completed → invoiced. Includes RDW plate lookup for Dutch vehicle registration and technician assignment.',
 'WRK', 'active', 'ai-draft'),

('screen', 'WK002', 'faq', 1, 'Where does this data live?',
 'Primary tables: `wrk_orders`, `wrk_order_lines`, `wrk_technicians`, `ast_assets` (Supabase/Postgres). This screen writes — work orders and lines are created/updated immediately. The `total` column on `wrk_order_lines` is auto-calculated (GENERATED ALWAYS).',
 'WRK', 'active', 'ai-draft'),

('screen', 'WK002', 'reference', 1, 'APIs & data',
 '- `/api/bop/wrk/orders` — GET/POST/PATCH/DELETE → `wrk_orders`, `wrk_order_lines`\n- `/api/bop/wrk/plate-lookup` — GET → `ast_assets` (RDW vehicle lookup)\n- `/api/bop/wrk/technicians` — GET → `wrk_technicians`',
 'WRK', 'active', 'ai-draft'),

-- ── WK003 — Planning Board ─────────────────────────────────────────
('screen', 'WK003', 'overview', 0, 'Planning Board',
 '**Planning Board** (`WK003`) belongs to the Workshop Intelligence module. Route: `/console/wrk/planning`.\n\nVisual planning board for scheduling work orders into time slots by technician. Drag-and-drop interface for daily and weekly workshop capacity planning.',
 'WRK', 'active', 'ai-draft'),

('screen', 'WK003', 'faq', 1, 'Where does this data live?',
 'Primary tables: `wrk_planning_slots`, `wrk_technicians` (Supabase/Postgres). This screen writes — slots are created and updated as you assign orders to technicians and time blocks.',
 'WRK', 'active', 'ai-draft'),

('screen', 'WK003', 'reference', 1, 'APIs & data',
 '- `/api/bop/wrk/planning` — GET/POST/PATCH/DELETE → `wrk_planning_slots`, `wrk_technicians`',
 'WRK', 'active', 'ai-draft'),

-- ── WK004 — Efficiency KPI ─────────────────────────────────────────
('screen', 'WK004', 'overview', 0, 'Efficiency KPI',
 '**Efficiency KPI** (`WK004`) belongs to the Workshop Intelligence module. Route: `/console/wrk/efficiency`.\n\nTracks workshop efficiency metrics per technician and period: productive hours vs. available hours, utilisation rate, revenue per hour, and trend analysis.',
 'WRK', 'active', 'ai-draft'),

('screen', 'WK004', 'faq', 1, 'Where does this data live?',
 'Primary tables: `wrk_efficiency_metrics`, `wrk_technicians` (Supabase/Postgres). This screen writes — efficiency records are logged per technician per period.',
 'WRK', 'active', 'ai-draft'),

('screen', 'WK004', 'reference', 1, 'APIs & data',
 '- `/api/bop/wrk/efficiency` — GET/POST → `wrk_efficiency_metrics`\n- `/api/bop/wrk/technicians` — GET → `wrk_technicians`',
 'WRK', 'active', 'ai-draft'),

-- ── WK005 — Inspection Checklist ───────────────────────────────────
('screen', 'WK005', 'overview', 0, 'Inspection Checklist',
 '**Inspection Checklist** (`WK005`) belongs to the Workshop Intelligence module. Route: `/console/wrk/inspections`.\n\nDigital vehicle inspection forms linked to work orders. Technicians record check items (pass/fail/advisory), attach photos, and flag items that need customer approval or additional work.',
 'WRK', 'active', 'ai-draft'),

('screen', 'WK005', 'faq', 1, 'Where does this data live?',
 'Primary tables: `wrk_inspections`, `wrk_orders`, `wrk_labour_rates` (Supabase/Postgres). This screen writes — inspection results are saved per work order. Rates are read-only for cost estimation.',
 'WRK', 'active', 'ai-draft'),

('screen', 'WK005', 'reference', 1, 'APIs & data',
 '- `/api/bop/wrk/inspections` — GET/POST/PATCH → `wrk_inspections`\n- `/api/bop/wrk/orders` — GET → `wrk_orders` (linked WO context)\n- `/api/bop/wrk/rates` — GET → `wrk_labour_rates` (cost lookup)',
 'WRK', 'active', 'ai-draft'),

-- ── WK006 — APK Reminders ──────────────────────────────────────────
('screen', 'WK006', 'overview', 0, 'APK Reminders',
 '**APK Reminders** (`WK006`) belongs to the Workshop Intelligence module. Route: `/console/wrk/apk-reminders`.\n\nManages the Dutch APK (Algemene Periodieke Keuring) inspection reminder campaign. Tracks vehicle APK expiry dates, sends reminders to customers, and converts reminders into work orders.',
 'WRK', 'active', 'ai-draft'),

('screen', 'WK006', 'faq', 1, 'Where does this data live?',
 'Primary tables: `wrk_apk_reminders` (Supabase/Postgres). This screen writes — reminder records are created and updated as campaigns run and customers respond.',
 'WRK', 'active', 'ai-draft'),

('screen', 'WK006', 'reference', 1, 'APIs & data',
 '- `/api/bop/wrk/apk-reminders` — GET/POST/PATCH → `wrk_apk_reminders`',
 'WRK', 'active', 'ai-draft'),

-- ── WK007 — Customer Approvals ─────────────────────────────────────
('screen', 'WK007', 'overview', 0, 'Customer Approvals',
 '**Customer Approvals** (`WK007`) belongs to the Workshop Intelligence module. Route: `/console/wrk/approvals`.\n\nTracks additional work items that require customer approval before proceeding. Items come from inspections (WK005) or technician recommendations. Shows approval status and links back to the parent work order.',
 'WRK', 'active', 'ai-draft'),

('screen', 'WK007', 'faq', 1, 'Where does this data live?',
 'Primary tables: `wrk_approvals`, `wrk_orders` (Supabase/Postgres). This screen writes — approval records are created from inspections and updated when the customer responds.',
 'WRK', 'active', 'ai-draft'),

('screen', 'WK007', 'reference', 1, 'APIs & data',
 '- `/api/bop/wrk/approvals` — GET/POST/PATCH → `wrk_approvals`\n- `/api/bop/wrk/orders` — GET → `wrk_orders` (parent WO context)',
 'WRK', 'active', 'ai-draft'),

-- ── WK008 — Customer Status ────────────────────────────────────────
('screen', 'WK008', 'overview', 0, 'Customer Status',
 '**Customer Status** (`WK008`) belongs to the Workshop Intelligence module. Route: `/console/wrk/status`.\n\nCustomer-facing work order status tracker. Shows the current stage of each vehicle in the workshop — useful for front-desk staff and customer-facing status pages.',
 'WRK', 'active', 'ai-draft'),

('screen', 'WK008', 'faq', 1, 'Where does this data live?',
 'Primary tables: `wrk_orders` (Supabase/Postgres). This screen is read-only — it reads work order status and presents a simplified customer view.',
 'WRK', 'active', 'ai-draft'),

('screen', 'WK008', 'reference', 1, 'APIs & data',
 '- `/api/bop/wrk/status` — GET → `wrk_orders`',
 'WRK', 'active', 'ai-draft'),

-- ── WK009 — Daily Briefing ─────────────────────────────────────────
('screen', 'WK009', 'overview', 0, 'Daily Briefing',
 '**Daily Briefing** (`WK009`) belongs to the Workshop Intelligence module. Route: `/console/wrk/briefing`.\n\nMorning briefing view for workshop managers: today''s planned work orders, technician availability, pending APK reminders, and any carryover from yesterday. Designed for a quick stand-up review.',
 'WRK', 'active', 'ai-draft'),

('screen', 'WK009', 'faq', 1, 'Where does this data live?',
 'Primary tables: `wrk_orders`, `wrk_planning_slots`, `wrk_technicians`, `wrk_apk_reminders` (Supabase/Postgres). This screen is read-only — it aggregates today''s schedule and outstanding items.',
 'WRK', 'active', 'ai-draft'),

('screen', 'WK009', 'reference', 1, 'APIs & data',
 '- `/api/bop/wrk/briefing` — GET → `wrk_orders`, `wrk_planning_slots`, `wrk_technicians`, `wrk_apk_reminders`',
 'WRK', 'active', 'ai-draft'),

-- ── WK010 — Repair Recommendations ─────────────────────────────────
('screen', 'WK010', 'overview', 0, 'Repair Recommendations',
 '**Repair Recommendations** (`WK010`) belongs to the Workshop Intelligence module. Route: `/console/wrk/recommendations`.\n\nAI-assisted repair and upsell recommendations based on vehicle history, mileage, inspection results, and service intervals. Helps technicians identify additional work that adds value for the customer.',
 'WRK', 'active', 'ai-draft'),

('screen', 'WK010', 'faq', 1, 'Where does this data live?',
 'Primary tables: `wrk_orders`, `wrk_planning_slots`, `wrk_technicians`, `wrk_efficiency_metrics`, `wrk_apk_reminders` (Supabase/Postgres). This screen is read-only — it analyses existing data to generate recommendations.',
 'WRK', 'active', 'ai-draft'),

('screen', 'WK010', 'reference', 1, 'APIs & data',
 '- `/api/bop/wrk/recommendations` — GET → `wrk_orders`, `wrk_planning_slots`, `wrk_technicians`, `wrk_efficiency_metrics`, `wrk_apk_reminders`',
 'WRK', 'active', 'ai-draft'),

-- ── WK011 — Labour Rates ───────────────────────────────────────────
('screen', 'WK011', 'overview', 0, 'Labour Rates',
 '**Labour Rates** (`WK011`) belongs to the Workshop Intelligence module. Route: `/console/wrk/rates`.\n\nManage hourly labour rates by work type (mechanical, electrical, bodywork, diagnostic, etc.). Rates are used by work orders and inspections for cost calculations.',
 'WRK', 'active', 'ai-draft'),

('screen', 'WK011', 'faq', 1, 'Where does this data live?',
 'Primary tables: `wrk_labour_rates` (Supabase/Postgres). This screen writes — rates are created and updated directly. Changes take effect on new work orders immediately.',
 'WRK', 'active', 'ai-draft'),

('screen', 'WK011', 'reference', 1, 'APIs & data',
 '- `/api/bop/wrk/rates` — GET/POST/PATCH/DELETE → `wrk_labour_rates`',
 'WRK', 'active', 'ai-draft'),

-- ── WK012 — Service Packages ───────────────────────────────────────
('screen', 'WK012', 'overview', 0, 'Service Packages',
 '**Service Packages** (`WK012`) belongs to the Workshop Intelligence module. Route: `/console/wrk/packages`.\n\nDefine and manage predefined service packages (e.g. "Small Service", "APK + Service", "Winter Check"). Each package bundles labour lines and optional parts, making it easy to create consistent work orders.',
 'WRK', 'active', 'ai-draft'),

('screen', 'WK012', 'faq', 1, 'Where does this data live?',
 'Primary tables: `wrk_service_packages` (Supabase/Postgres). This screen writes — packages are created and edited directly. They are referenced when creating work orders.',
 'WRK', 'active', 'ai-draft'),

('screen', 'WK012', 'reference', 1, 'APIs & data',
 '- `/api/bop/wrk/packages` — GET/POST/PATCH/DELETE → `wrk_service_packages`',
 'WRK', 'active', 'ai-draft'),

-- ── WK013 — DMS Integration ────────────────────────────────────────
('screen', 'WK013', 'overview', 0, 'DMS Integration',
 '**DMS Integration** (`WK013`) belongs to the Workshop Intelligence module. Route: `/console/wrk/dms-integration`.\n\nAutoflex DMS (Dealer Management System) integration hub. Configure API credentials, manage field mappings between BOP and Autoflex, trigger manual syncs, and monitor sync logs. Supports bi-directional data exchange for vehicles, customers, work orders, and parts.',
 'WRK', 'active', 'ai-draft'),

('screen', 'WK013', 'faq', 1, 'Where does this data live?',
 'Primary tables: `wrk_autoflex_config`, `wrk_autoflex_sync_logs`, `wrk_autoflex_field_maps`, `wrk_orders`, `ast_assets`, `crm_leads`, `shp_products` (Supabase/Postgres). This screen writes — configuration and field mappings are editable. Sync logs are read-only audit trails.',
 'WRK', 'active', 'ai-draft'),

('screen', 'WK013', 'reference', 1, 'APIs & data',
 '- `/api/bop/wrk/autoflex` — GET/POST/PATCH → `wrk_autoflex_config`, `wrk_autoflex_sync_logs`, `wrk_orders`, `ast_assets`, `crm_leads`, `shp_products`\n- `/api/bop/wrk/autoflex/logs` — GET → `wrk_autoflex_sync_logs`',
 'WRK', 'active', 'ai-draft')

ON CONFLICT DO NOTHING;

COMMIT;

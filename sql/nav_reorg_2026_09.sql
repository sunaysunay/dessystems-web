-- Navigation reorganization (bop_screens nav_group / nav_subgroup / nav_order / nav_visible)
-- Goal: business-domain grouping, merge Sales & CRM + Sales, fix orphan/dead entries.
-- Run as one transaction. Read-only verification query at the bottom.

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────
-- 0. Dead entries: routes with no page on disk → hide from nav (keep rows)
-- ─────────────────────────────────────────────────────────────────────────
UPDATE bop_screens SET nav_visible = false WHERE screen_id IN (
  'AS003',                                  -- /inventory/lifecycle (no page)
  'CM001',                                  -- /bop/inbox (no page)
  'CE003',                                  -- template [id] detail
  'MK010','MK011','MK012','MK013','MK014','MK015','MK016','MK017', -- CBT trade: registry only, 404
  'MK009',                                  -- banner-terms: backend API missing
  'MK019',                                  -- dealer-reserve: in-memory prototype
  'SH011','SH012',                          -- collections / import (no page)
  'SH022','SH023','SH024','SH025','SH026',  -- old fulfil routes (no page; replaced by SH080-083)
  'SH034','SH042','SH043','SH061',          -- shop finance payments / damage / replacements / hazards (no page)
  'SH055',                                  -- procure/dropship (no page; replaced by SH083)
  'WF001',                                  -- /workflows (no page)
  'AI001','AI002'                           -- AI Command Center / Tool Registry: hardcoded stubs
);

-- Route corrections (page exists at a different path)
UPDATE bop_screens SET route = '/console'                                  WHERE screen_id = 'BO001';  -- Dashboard
UPDATE bop_screens SET route = '/console/shp/procure/cycle-count'          WHERE screen_id = 'SH053';
UPDATE bop_screens SET route = '/console/shp/procure/goods-in'             WHERE screen_id = 'SH054';
UPDATE bop_screens SET route = '/console/config/content-engine'            WHERE screen_id = 'CE001';
UPDATE bop_screens SET route = '/console/config/content-engine/templates'  WHERE screen_id = 'CE002';
UPDATE bop_screens SET route = '/console/config/content-engine/templates/[id]' WHERE screen_id = 'CE003';

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Real screens on disk that were never registered in bop_screens
-- ─────────────────────────────────────────────────────────────────────────
INSERT INTO bop_screens (screen_id, module, func_type, sequence, title, route, status, lifecycle_state, parent_id, nav_group, nav_subgroup, nav_order, nav_visible) VALUES
  ('SA019','SAL','list',    '019','Handovers',           '/console/sal/handovers',              'active','dev',NULL,   'sales','aftersale',10,true),
  ('SA022','SAL','list',    '022','Surveys',             '/console/sal/surveys',                'active','dev',NULL,   'sales','aftersale',30,true),
  ('SA023','SAL','list',    '023','Warranties',          '/console/sal/warranties',             'active','dev',NULL,   'sales','aftersale',20,true),
  ('SH071','SHP','dashboard','071','Control Tower',      '/console/shp/control-tower',          'active','dev','SH000','shop',NULL,2,true),
  ('SH057','SHP','cockpit', '057','Procurement Cockpit', '/console/shp/procure/cockpit',        'active','dev','SH000','shop','2_procurement',59,true),
  ('SH080','SHP','list',    '080','Picking Queue',       '/console/shp/fulfil/picking',         'active','dev','SH000','shop','5_shipping',31,true),
  ('SH081','SHP','list',    '081','Packing Queue',       '/console/shp/fulfil/packing',         'active','dev','SH000','shop','5_shipping',32,true),
  ('SH082','SHP','list',    '082','Shipping Management', '/console/shp/fulfil/shipping',        'active','dev','SH000','shop','5_shipping',33,true),
  ('SH083','SHP','list',    '083','Dropship Dispatch',   '/console/shp/fulfil/dropship',        'active','dev','SH000','shop','5_shipping',34,true),
  ('SH084','SHP','list',    '084','Refunds',             '/console/shp/aftersales/refunds',     'active','dev','SH000','shop','7_aftersales',52,true),
  ('SH085','SHP','list',    '085','Return Inspections',  '/console/shp/aftersales/inspections', 'active','dev','SH000','shop','7_aftersales',51,true),
  ('SH086','SHP','list',    '086','Compliance Fees',     '/console/shp/compliance/fees',        'active','dev','SH000','shop','8_compliance',71,true),
  ('SH110','SHP','analytics','110','Scoring',            '/console/shp/analytics/scoring',      'active','dev','SH000','shop','9_analytics',111,true),
  ('OP016','OPS','dashboard','016','Goals Dashboard',    '/console/ops/goals/dashboard',        'active','dev',NULL,   'tools',NULL,3,true)
ON CONFLICT (screen_id) DO NOTHING;

INSERT INTO bop_screen_roles (screen_id, role, can_read, can_write, can_delete)
SELECT s.screen_id, r.role, true, true, true
FROM (VALUES ('SA019'),('SA022'),('SA023'),('SH071'),('SH057'),('SH080'),('SH081'),('SH082'),('SH083'),('SH084'),('SH085'),('SH086'),('SH110'),('OP016')) AS s(screen_id)
CROSS JOIN (VALUES ('super_admin'),('platform_admin')) AS r(role)
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Overview
-- ─────────────────────────────────────────────────────────────────────────
UPDATE bop_screens SET nav_group='overview', nav_subgroup=NULL,       nav_order=1,  nav_visible=true WHERE screen_id='BO001'; -- Dashboard (/console)
UPDATE bop_screens SET nav_group='overview', nav_subgroup=NULL,       nav_order=2  WHERE screen_id='AN001'; -- Exec Dashboard
UPDATE bop_screens SET nav_group='overview', nav_subgroup=NULL,       nav_order=10 WHERE screen_id='BO002'; -- Analytics (subgroup parent)
UPDATE bop_screens SET nav_group='overview', nav_subgroup='insights', nav_order=1  WHERE screen_id='AN002'; -- Conversion Funnel
UPDATE bop_screens SET nav_group='overview', nav_subgroup='insights', nav_order=2  WHERE screen_id='AN004'; -- Traffic & Acquisition
UPDATE bop_screens SET nav_group='overview', nav_subgroup='insights', nav_order=3  WHERE screen_id='AN003'; -- Session Intelligence
UPDATE bop_screens SET nav_group='overview', nav_subgroup='insights', nav_order=4  WHERE screen_id='AN005'; -- Listing Performance
UPDATE bop_screens SET nav_group='overview', nav_subgroup='insights', nav_order=5  WHERE screen_id='AN006'; -- Quality Monitor

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Operations (vehicle assets) — flat; tasks/goals move to Tools
-- ─────────────────────────────────────────────────────────────────────────
UPDATE bop_screens SET nav_group='operations', nav_subgroup=NULL, nav_order=1 WHERE screen_id='AS001';
UPDATE bop_screens SET nav_group='operations', nav_subgroup=NULL, nav_order=2 WHERE screen_id='IN001';
UPDATE bop_screens SET nav_group='operations', nav_subgroup=NULL, nav_order=3 WHERE screen_id='IN002';
UPDATE bop_screens SET nav_group='operations', nav_subgroup=NULL, nav_order=4 WHERE screen_id='IN006'; -- Model Catalog next to Brands
UPDATE bop_screens SET nav_group='operations', nav_subgroup=NULL, nav_order=5 WHERE screen_id='IN003';
UPDATE bop_screens SET nav_group='operations', nav_subgroup=NULL, nav_order=6 WHERE screen_id='IN004';
UPDATE bop_screens SET nav_group='operations', nav_subgroup=NULL, nav_order=7 WHERE screen_id='IN005';
UPDATE bop_screens SET nav_group='operations' WHERE nav_group='Operations'; -- case fix (OP013-015 stay hidden)

-- ─────────────────────────────────────────────────────────────────────────
-- 4. Sales & CRM — merged group 'sales' with 3 sub-menus
-- ─────────────────────────────────────────────────────────────────────────
UPDATE bop_screens SET nav_group='sales', nav_subgroup='crm', nav_order=1 WHERE screen_id='CR001'; -- Leads
UPDATE bop_screens SET nav_group='sales', nav_subgroup='crm', nav_order=2 WHERE screen_id='CR008'; -- Deals
UPDATE bop_screens SET nav_group='sales', nav_subgroup='crm', nav_order=3 WHERE screen_id='CR006'; -- Pipeline Kanban
UPDATE bop_screens SET nav_group='sales', nav_subgroup='crm', nav_order=4 WHERE screen_id='CR005'; -- Customers
UPDATE bop_screens SET nav_group='sales', nav_subgroup='crm', nav_order=5 WHERE screen_id='CR004'; -- Activities
UPDATE bop_screens SET nav_group='sales', nav_subgroup='crm', nav_order=6 WHERE screen_id='SA007'; -- Appointments
UPDATE bop_screens SET nav_group='sales', nav_subgroup='crm', nav_order=7 WHERE screen_id='CR030'; -- Client Portal
UPDATE bop_screens SET nav_group='sales', nav_subgroup='crm', nav_order=99 WHERE screen_id IN ('CR002','CR009','CR021'); -- detail pages (hidden)

UPDATE bop_screens SET nav_group='sales', nav_subgroup='selling', nav_order=1  WHERE screen_id='TR000'; -- Cases (end-to-end)
UPDATE bop_screens SET nav_group='sales', nav_subgroup='selling', nav_order=2  WHERE screen_id='SA013'; -- Sell Leads
UPDATE bop_screens SET nav_group='sales', nav_subgroup='selling', nav_order=3  WHERE screen_id='SA017'; -- Buyer Inquiries
UPDATE bop_screens SET nav_group='sales', nav_subgroup='selling', nav_order=4  WHERE screen_id='SA015'; -- Buyer Inbox
UPDATE bop_screens SET nav_group='sales', nav_subgroup='selling', nav_order=5  WHERE screen_id='SA001'; -- Quotations
UPDATE bop_screens SET nav_group='sales', nav_subgroup='selling', nav_order=6  WHERE screen_id='SA003'; -- Quote Builder
UPDATE bop_screens SET nav_group='sales', nav_subgroup='selling', nav_order=7  WHERE screen_id='SA004'; -- Quotes
UPDATE bop_screens SET nav_group='sales', nav_subgroup='selling', nav_order=8  WHERE screen_id='SA009'; -- Orders
UPDATE bop_screens SET nav_group='sales', nav_subgroup='selling', nav_order=9  WHERE screen_id='SA005'; -- Payments
UPDATE bop_screens SET nav_group='sales', nav_subgroup='selling', nav_order=10 WHERE screen_id='SA008'; -- Rentals
UPDATE bop_screens SET nav_group='sales', nav_subgroup='selling', nav_order=11 WHERE screen_id='SA011'; -- Sales Dashboard
UPDATE bop_screens SET nav_group='sales', nav_subgroup='selling', nav_order=99 WHERE screen_id IN ('TR001','SA002','SA010','SA014','SA016','SA018','PT001');

UPDATE bop_screens SET nav_group='sales', nav_subgroup='aftersale', nav_order=40 WHERE screen_id='SA006'; -- Reviews

-- ─────────────────────────────────────────────────────────────────────────
-- 5. Marketing & Channels — merged 'marketing' group: publishing + growth
-- ─────────────────────────────────────────────────────────────────────────
UPDATE bop_screens SET nav_group='marketing', nav_subgroup='publishing', nav_order=1 WHERE screen_id='MP001'; -- Listing Manager
UPDATE bop_screens SET nav_group='marketing', nav_subgroup='publishing', nav_order=2 WHERE screen_id='MP004'; -- Channel Publisher
UPDATE bop_screens SET nav_group='marketing', nav_subgroup='publishing', nav_order=3 WHERE screen_id='PB002'; -- Publish Queue
UPDATE bop_screens SET nav_group='marketing', nav_subgroup='publishing', nav_order=4 WHERE screen_id='PB001'; -- My Publications
UPDATE bop_screens SET nav_group='marketing', nav_subgroup='publishing', nav_order=5 WHERE screen_id='MP002'; -- Channel Analytics
UPDATE bop_screens SET nav_group='marketing', nav_subgroup='publishing', nav_order=6 WHERE screen_id='AU001'; -- Auction Manager
UPDATE bop_screens SET nav_group='marketing', nav_subgroup='publishing', nav_order=7 WHERE screen_id='MP005'; -- Layout Manager
UPDATE bop_screens SET nav_group='marketing', nav_subgroup='publishing', nav_order=8 WHERE screen_id='MP006'; -- BPM Calculator
UPDATE bop_screens SET nav_group='marketing', nav_subgroup='publishing', nav_order=99 WHERE screen_id IN ('MP003','AU002','AU004'); -- detail pages (hidden)

UPDATE bop_screens SET nav_group='marketing', nav_subgroup='growth', nav_order=10 WHERE screen_id='GR000';
UPDATE bop_screens SET nav_group='marketing', nav_subgroup='growth', nav_order=20 WHERE screen_id='GR001';
UPDATE bop_screens SET nav_group='marketing', nav_subgroup='growth', nav_order=30 WHERE screen_id='GR002';
UPDATE bop_screens SET nav_group='marketing', nav_subgroup='growth', nav_order=40 WHERE screen_id='GR003';
UPDATE bop_screens SET nav_group='marketing', nav_subgroup='growth', nav_order=50 WHERE screen_id='GR004';
UPDATE bop_screens SET nav_group='marketing', nav_subgroup='growth', nav_order=60 WHERE screen_id='GR005';

-- ─────────────────────────────────────────────────────────────────────────
-- 6. Intelligence = analysis only; AI studio/campaigns move to Marketing › Growth
-- ─────────────────────────────────────────────────────────────────────────
UPDATE bop_screens SET nav_group='intelligence', nav_subgroup=NULL, nav_order=1 WHERE screen_id='MK001'; -- AI Overview
UPDATE bop_screens SET nav_group='intelligence', nav_subgroup=NULL, nav_order=2 WHERE screen_id='MK002'; -- Market Evaluation
UPDATE bop_screens SET nav_group='intelligence', nav_subgroup=NULL, nav_order=3 WHERE screen_id='MK003'; -- Competitors
UPDATE bop_screens SET nav_group='intelligence', nav_subgroup=NULL, nav_order=4 WHERE screen_id='MK004'; -- Brand Tracker
UPDATE bop_screens SET nav_group='intelligence', nav_subgroup=NULL, nav_order=5 WHERE screen_id='MK005'; -- Listing Intelligence
UPDATE bop_screens SET nav_group='intelligence', nav_subgroup=NULL, nav_order=6 WHERE screen_id='CR003'; -- Lead Statistics
UPDATE bop_screens SET nav_group='intelligence', nav_subgroup=NULL, nav_order=7 WHERE screen_id='SA012'; -- Margin Calculator

UPDATE bop_screens SET nav_group='marketing', nav_subgroup='growth', nav_order=70 WHERE screen_id='MK006'; -- AI Campaigns
UPDATE bop_screens SET nav_group='marketing', nav_subgroup='growth', nav_order=80 WHERE screen_id='MK007'; -- AI Vehicle Studio
UPDATE bop_screens SET nav_group='marketing', nav_subgroup='growth', nav_order=81 WHERE screen_id='MK008'; -- Preset Backgrounds
UPDATE bop_screens SET nav_group='marketing' WHERE nav_group='marketplace'; -- retire old group value

-- ─────────────────────────────────────────────────────────────────────────
-- 7. Shop — flow-ordered subgroups; SH000 launchpad becomes the "Modules" parent
-- ─────────────────────────────────────────────────────────────────────────
UPDATE bop_screens SET nav_group='shop', nav_subgroup=NULL, nav_order=1   WHERE screen_id='SH009'; -- Dashboard
UPDATE bop_screens SET nav_group='shop', nav_subgroup=NULL, nav_order=3   WHERE screen_id='SH070'; -- Monitor
UPDATE bop_screens SET nav_group='shop', nav_subgroup=NULL, nav_order=5,  nav_visible=true WHERE screen_id='SH000'; -- launchpad (parent link)
UPDATE bop_screens SET nav_group='shop', nav_subgroup=NULL, nav_order=95  WHERE screen_id='SH008'; -- Settings
UPDATE bop_screens SET nav_group='shop', nav_subgroup=NULL, nav_order=200 WHERE screen_id='SH090'; -- Guide
UPDATE bop_screens SET nav_subgroup='3_warehouse', nav_order=26 WHERE screen_id='SH053'; -- Cycle Count → Warehouse
UPDATE bop_screens SET nav_subgroup='9_analytics' WHERE nav_group='shop' AND nav_subgroup='analytics';

-- ─────────────────────────────────────────────────────────────────────────
-- 8. Tools — Tasks / Goals return here (from broken Operations subgroups)
-- ─────────────────────────────────────────────────────────────────────────
UPDATE bop_screens SET nav_group='tools', nav_subgroup=NULL, nav_order=1 WHERE screen_id='OP001'; -- Tasks
UPDATE bop_screens SET nav_group='tools', nav_subgroup=NULL, nav_order=2 WHERE screen_id='OP002'; -- Goals
UPDATE bop_screens SET nav_group='tools', nav_subgroup=NULL WHERE screen_id IN ('OP009','OP010','OP011','OP013','OP014','OP015'); -- child views (hidden)

-- ─────────────────────────────────────────────────────────────────────────
-- 9. System — sub-menus reshuffled; new: communication, aiPlatform, docs
-- ─────────────────────────────────────────────────────────────────────────
UPDATE bop_screens SET nav_group='system', nav_subgroup='users', nav_order=6 WHERE screen_id='SY041'; -- Dealer Applications
UPDATE bop_screens SET nav_group='system', nav_subgroup='accessRoles', nav_order=8 WHERE screen_id='SY025'; -- Security Events (from infra)

UPDATE bop_screens SET nav_group='system', nav_subgroup='configuration', nav_order=1  WHERE screen_id='SY004';
UPDATE bop_screens SET nav_group='system', nav_subgroup='configuration', nav_order=2  WHERE screen_id='SY003';
UPDATE bop_screens SET nav_group='system', nav_subgroup='configuration', nav_order=3  WHERE screen_id='SY050'; -- Feature Matrix
UPDATE bop_screens SET nav_group='system', nav_subgroup='configuration', nav_order=4  WHERE screen_id='SY044'; -- Theme Config (was top-level 'configuration' group)
UPDATE bop_screens SET nav_group='system', nav_subgroup='configuration', nav_order=5  WHERE screen_id='SY018';
UPDATE bop_screens SET nav_group='system', nav_subgroup='configuration', nav_order=6  WHERE screen_id='SY019';
UPDATE bop_screens SET nav_group='system', nav_subgroup='configuration', nav_order=7  WHERE screen_id='SY024';
UPDATE bop_screens SET nav_group='system', nav_subgroup='configuration', nav_order=8  WHERE screen_id='SY013';
UPDATE bop_screens SET nav_group='system', nav_subgroup='configuration', nav_order=9  WHERE screen_id='CE001'; -- Content Engine
UPDATE bop_screens SET nav_group='system', nav_subgroup='configuration', nav_order=10 WHERE screen_id='CE002'; -- Tab Templates
UPDATE bop_screens SET nav_group='system', nav_subgroup='configuration', nav_order=99 WHERE screen_id='CE003';

UPDATE bop_screens SET nav_group='system', nav_subgroup='communication', nav_order=1 WHERE screen_id='SY039'; -- Template Studio
UPDATE bop_screens SET nav_group='system', nav_subgroup='communication', nav_order=2 WHERE screen_id='SY036'; -- Email Style Library
UPDATE bop_screens SET nav_group='system', nav_subgroup='communication', nav_order=3 WHERE screen_id='SY037'; -- Automation Engine
UPDATE bop_screens SET nav_group='system', nav_subgroup='communication', nav_order=4 WHERE screen_id='SY038'; -- Communication Log
UPDATE bop_screens SET nav_group='system', nav_subgroup='communication', nav_order=5, nav_visible=true WHERE screen_id='SY040'; -- Support Center

UPDATE bop_screens SET nav_group='system', nav_subgroup='aiPlatform', nav_order=1 WHERE screen_id='AI005'; -- Model Configuration
UPDATE bop_screens SET nav_group='system', nav_subgroup='aiPlatform', nav_order=2 WHERE screen_id='AI003'; -- Prompt Manager
UPDATE bop_screens SET nav_group='system', nav_subgroup='aiPlatform', nav_order=3 WHERE screen_id='AI004'; -- AI Action Audit
UPDATE bop_screens SET nav_group='system', nav_subgroup='aiPlatform', nav_order=8 WHERE screen_id='AI001'; -- (hidden stub)
UPDATE bop_screens SET nav_group='system', nav_subgroup='aiPlatform', nav_order=9 WHERE screen_id='AI002'; -- (hidden stub)

UPDATE bop_screens SET nav_group='system', nav_subgroup='docs', nav_order=1 WHERE screen_id='SY034'; -- Documentation Browser
UPDATE bop_screens SET nav_group='system', nav_subgroup='docs', nav_order=2 WHERE screen_id='SY033'; -- Process Library
UPDATE bop_screens SET nav_group='system', nav_subgroup='docs', nav_order=3 WHERE screen_id='SY035'; -- Flow Map
UPDATE bop_screens SET nav_group='system', nav_subgroup='docs', nav_order=4 WHERE screen_id='SY043'; -- TFE Flow Viewer (was group 'System')
UPDATE bop_screens SET nav_group='system', nav_subgroup='docs', nav_order=5 WHERE screen_id='SY028'; -- Object Explorer
UPDATE bop_screens SET nav_group='system', nav_subgroup='docs', nav_order=6 WHERE screen_id='SY014'; -- Handoff Doc (from infra)

UPDATE bop_screens SET nav_group='system', nav_subgroup='development', nav_order=9  WHERE screen_id='SY042'; -- Quality Inspector (from infra)
UPDATE bop_screens SET nav_group='system', nav_subgroup='development', nav_order=10 WHERE screen_id='SY029'; -- Data Explorer (from configuration)
UPDATE bop_screens SET nav_group='system', nav_subgroup='development', nav_order=80 WHERE screen_id='SY051';
UPDATE bop_screens SET nav_group='system', nav_subgroup='development', nav_order=99 WHERE screen_id='SY053';

UPDATE bop_screens SET nav_group='system', nav_subgroup='infrastructure', nav_order=1 WHERE screen_id='SY008';
UPDATE bop_screens SET nav_group='system', nav_subgroup='infrastructure', nav_order=2 WHERE screen_id='SY006'; -- Systems Overview
UPDATE bop_screens SET nav_group='system', nav_subgroup='infrastructure', nav_order=3 WHERE screen_id='SY005';
UPDATE bop_screens SET nav_group='system', nav_subgroup='infrastructure', nav_order=4 WHERE screen_id='SY007';
UPDATE bop_screens SET nav_group='system', nav_subgroup='infrastructure', nav_order=5 WHERE screen_id='SY032';
UPDATE bop_screens SET nav_group='system', nav_subgroup='infrastructure', nav_order=6 WHERE screen_id='SY017';
UPDATE bop_screens SET nav_group='system', nav_subgroup='infrastructure', nav_order=7 WHERE screen_id='SY009';
UPDATE bop_screens SET nav_group='system', nav_subgroup='infrastructure', nav_order=8 WHERE screen_id='SY010';

-- Retire the obsolete 'salesCrm' group value and leftover capitalised groups
UPDATE bop_screens SET nav_group='sales' WHERE nav_group IN ('salesCrm','Sales');
UPDATE bop_screens SET nav_group='system' WHERE nav_group='System';

COMMIT;

-- Verification (read-only): no rows should remain with unknown group values
-- select nav_group, nav_subgroup, count(*) from bop_screens where nav_visible group by 1,2 order by 1,2;

-- BOP v2.127 — Autovacuum Tuning for Small/High-Churn Tables
-- Default autovacuum triggers at 50 dead rows + 20% of live rows.
-- For small tables (<100 rows), dead tuples never reach 50 so vacuum never runs.
-- This lowers thresholds for affected tables.

-- Small tables: lower threshold to 5 rows, scale factor to 10%
-- This means vacuum triggers at 5 dead + 10% of live rows

-- Core BOP tables (high write/update activity)
ALTER TABLE bop_listings SET (autovacuum_vacuum_threshold = 5, autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE bop_user_profiles SET (autovacuum_vacuum_threshold = 5, autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE bop_user_tenants SET (autovacuum_vacuum_threshold = 5, autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE bop_user_roles SET (autovacuum_vacuum_threshold = 5, autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE bop_user_prefs SET (autovacuum_vacuum_threshold = 5, autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE bop_user_appearance SET (autovacuum_vacuum_threshold = 5, autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE bop_sessions SET (autovacuum_vacuum_threshold = 5, autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE bop_tenants SET (autovacuum_vacuum_threshold = 5, autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE bop_roles SET (autovacuum_vacuum_threshold = 5, autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE bop_screens SET (autovacuum_vacuum_threshold = 5, autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE bop_modules SET (autovacuum_vacuum_threshold = 5, autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE bop_settings SET (autovacuum_vacuum_threshold = 5, autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE bop_objects SET (autovacuum_vacuum_threshold = 5, autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE bop_protected_tables SET (autovacuum_vacuum_threshold = 5, autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE bop_counter SET (autovacuum_vacuum_threshold = 5, autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE bop_ref_counter SET (autovacuum_vacuum_threshold = 5, autovacuum_vacuum_scale_factor = 0.1);

-- Listing-related tables
ALTER TABLE bop_listing_media SET (autovacuum_vacuum_threshold = 5, autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE bop_listing_pricing SET (autovacuum_vacuum_threshold = 5, autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE bop_listing_channels SET (autovacuum_vacuum_threshold = 5, autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE bop_listing_content SET (autovacuum_vacuum_threshold = 5, autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE bop_listing_analytics SET (autovacuum_vacuum_threshold = 5, autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE bop_listing_specs_car SET (autovacuum_vacuum_threshold = 5, autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE bop_listing_specs_van SET (autovacuum_vacuum_threshold = 5, autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE bop_listing_specs_truck SET (autovacuum_vacuum_threshold = 5, autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE bop_listing_specs_camper SET (autovacuum_vacuum_threshold = 5, autovacuum_vacuum_scale_factor = 0.1);

-- Commerce tables
ALTER TABLE admin_quote SET (autovacuum_vacuum_threshold = 5, autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE admin_roles SET (autovacuum_vacuum_threshold = 5, autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE shop_orders SET (autovacuum_vacuum_threshold = 5, autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE shop_products SET (autovacuum_vacuum_threshold = 5, autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE shop_variants SET (autovacuum_vacuum_threshold = 5, autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE shop_customers SET (autovacuum_vacuum_threshold = 5, autovacuum_vacuum_scale_factor = 0.1);

-- Marketing/email tables
ALTER TABLE bop_email_template SET (autovacuum_vacuum_threshold = 5, autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE bop_email_brand SET (autovacuum_vacuum_threshold = 5, autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE bop_mkt_campaigns SET (autovacuum_vacuum_threshold = 5, autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE bop_comm_history SET (autovacuum_vacuum_threshold = 5, autovacuum_vacuum_scale_factor = 0.1);

-- Operations tables
ALTER TABLE op_goals SET (autovacuum_vacuum_threshold = 5, autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE op_tasks SET (autovacuum_vacuum_threshold = 5, autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE objectives SET (autovacuum_vacuum_threshold = 5, autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE key_results SET (autovacuum_vacuum_threshold = 5, autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE tasks SET (autovacuum_vacuum_threshold = 5, autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE counters SET (autovacuum_vacuum_threshold = 5, autovacuum_vacuum_scale_factor = 0.1);

-- High-churn activity tables (standard threshold but more aggressive scale)
ALTER TABLE activity_log SET (autovacuum_vacuum_scale_factor = 0.05);
ALTER TABLE activity_log2 SET (autovacuum_vacuum_scale_factor = 0.05);
ALTER TABLE session_events SET (autovacuum_vacuum_scale_factor = 0.05);
ALTER TABLE sessions SET (autovacuum_vacuum_scale_factor = 0.05);

-- Studio/agent tables
ALTER TABLE bop_studio_steps SET (autovacuum_vacuum_threshold = 5, autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE bop_studio_images SET (autovacuum_vacuum_threshold = 5, autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE bop_studio_sessions SET (autovacuum_vacuum_threshold = 5, autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE bop_ai_agents SET (autovacuum_vacuum_threshold = 5, autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE agent_jobs SET (autovacuum_vacuum_threshold = 5, autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE agent_run_log SET (autovacuum_vacuum_threshold = 5, autovacuum_vacuum_scale_factor = 0.1);

-- Domain/lead tables
ALTER TABLE domain_registry SET (autovacuum_vacuum_threshold = 5, autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE sell_leads SET (autovacuum_vacuum_threshold = 5, autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE crm_leads SET (autovacuum_vacuum_threshold = 5, autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE lead SET (autovacuum_vacuum_threshold = 5, autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE listing SET (autovacuum_vacuum_threshold = 5, autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE listing_det SET (autovacuum_vacuum_threshold = 5, autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE listing_pub SET (autovacuum_vacuum_threshold = 5, autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE tenants SET (autovacuum_vacuum_threshold = 5, autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE brands SET (autovacuum_vacuum_threshold = 5, autovacuum_vacuum_scale_factor = 0.1);

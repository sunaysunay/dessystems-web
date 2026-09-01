-- BOP V2 Migration 118 — Autoflex DMS integration tables + WK013 registry
-- Phase 3: Autoflex API Validation

-- ── 1. Autoflex configuration table ─────────────────────────────────
CREATE TABLE IF NOT EXISTS wrk_autoflex_config (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   INTEGER NOT NULL DEFAULT 300,
  endpoint    TEXT NOT NULL DEFAULT 'https://api.autoflex.nl/v2',
  api_key     TEXT NOT NULL DEFAULT '',
  dealer_id   TEXT NOT NULL DEFAULT '',
  timeout_ms  INTEGER NOT NULL DEFAULT 30000,
  enabled     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id)
);

ALTER TABLE wrk_autoflex_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wrk_autoflex_config_tenant" ON wrk_autoflex_config;
CREATE POLICY "wrk_autoflex_config_tenant" ON wrk_autoflex_config
  USING (tenant_id = current_setting('app.tenant_id', true)::int)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::int);

-- ── 2. Sync log table ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wrk_autoflex_sync_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       INTEGER NOT NULL DEFAULT 300,
  sync_type       TEXT NOT NULL CHECK (sync_type IN ('vehicles', 'work_orders', 'customers', 'parts')),
  direction       TEXT NOT NULL DEFAULT 'pull' CHECK (direction IN ('pull', 'push')),
  records_synced  INTEGER NOT NULL DEFAULT 0,
  records_failed  INTEGER NOT NULL DEFAULT 0,
  errors          JSONB DEFAULT '[]'::jsonb,
  duration_ms     INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wrk_autoflex_sync_logs_tenant
  ON wrk_autoflex_sync_logs (tenant_id, created_at DESC);

ALTER TABLE wrk_autoflex_sync_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wrk_autoflex_sync_logs_tenant" ON wrk_autoflex_sync_logs;
CREATE POLICY "wrk_autoflex_sync_logs_tenant" ON wrk_autoflex_sync_logs
  USING (tenant_id = current_setting('app.tenant_id', true)::int)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::int);

-- ── 3. Field mapping config table ───────────────────────────────────
CREATE TABLE IF NOT EXISTS wrk_autoflex_field_maps (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       INTEGER NOT NULL DEFAULT 300,
  entity_type     TEXT NOT NULL CHECK (entity_type IN ('vehicle', 'work_order', 'customer', 'part')),
  source_field    TEXT NOT NULL,
  target_field    TEXT NOT NULL,
  transform       TEXT DEFAULT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, entity_type, source_field)
);

ALTER TABLE wrk_autoflex_field_maps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wrk_autoflex_field_maps_tenant" ON wrk_autoflex_field_maps;
CREATE POLICY "wrk_autoflex_field_maps_tenant" ON wrk_autoflex_field_maps
  USING (tenant_id = current_setting('app.tenant_id', true)::int)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::int);

-- ── 4. Register WK013 screen ────────────────────────────────────────
INSERT INTO bop_screens (screen_id, module, func_type, sequence, title, route, nav_group, nav_order, nav_visible, lifecycle_state)
VALUES ('WK013', 'WRK', 'integration', 13, 'DMS Integration', '/console/wrk/dms-integration', 'Workshop', 13, true, 'dev')
ON CONFLICT (screen_id) DO UPDATE SET
  title = EXCLUDED.title,
  route = EXCLUDED.route,
  nav_group = EXCLUDED.nav_group,
  nav_order = EXCLUDED.nav_order;

-- ── 5. Assign roles to WK013 ────────────────────────────────────────
INSERT INTO bop_screen_roles (screen_id, role, can_read, can_write, can_delete)
VALUES
  ('WK013', 'super_admin',    true, true, true),
  ('WK013', 'platform_admin', true, true, true),
  ('WK013', 'tenant_admin',   true, true, false),
  ('WK013', 'workshop_lead',  true, true, false),
  ('WK013', 'manager',        true, false, false)
ON CONFLICT (screen_id, role) DO NOTHING;

-- ── 6. Insert default field mappings ────────────────────────────────
INSERT INTO wrk_autoflex_field_maps (tenant_id, entity_type, source_field, target_field) VALUES
  (300, 'vehicle', 'licensePlate', 'license_plate'),
  (300, 'vehicle', 'vin', 'vin'),
  (300, 'vehicle', 'make', 'make'),
  (300, 'vehicle', 'model', 'model'),
  (300, 'vehicle', 'year', 'year'),
  (300, 'vehicle', 'mileage', 'mileage'),
  (300, 'vehicle', 'lastServiceDate', 'last_service_date'),
  (300, 'work_order', 'orderNumber', 'wo_number'),
  (300, 'work_order', 'status', 'status'),
  (300, 'work_order', 'type', 'type'),
  (300, 'work_order', 'description', 'description'),
  (300, 'work_order', 'createdAt', 'created_at'),
  (300, 'work_order', 'completedAt', 'completed_at'),
  (300, 'customer', 'name', 'company_name'),
  (300, 'customer', 'email', 'email'),
  (300, 'customer', 'phone', 'phone'),
  (300, 'customer', 'address', 'address'),
  (300, 'customer', 'city', 'city'),
  (300, 'customer', 'postalCode', 'postal_code'),
  (300, 'part', 'partNumber', 'sku'),
  (300, 'part', 'description', 'name'),
  (300, 'part', 'price', 'price'),
  (300, 'part', 'stock', 'stock_qty'),
  (300, 'part', 'category', 'category')
ON CONFLICT (tenant_id, entity_type, source_field) DO NOTHING;

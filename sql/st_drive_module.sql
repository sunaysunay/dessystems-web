-- ============================================================
-- ST Storage Module — standalone Google Drive connectivity
-- Tables: st_drive_accounts, st_files
-- Fully independent of dessiteAG_V4 (no tenants.google_* columns used).
-- Run on des-dev Supabase first, verify, then promote.
-- ============================================================

-- 1. Per-tenant Drive connection (BOP-owned, replaces reliance on tenants.google_* columns)
CREATE TABLE IF NOT EXISTS st_drive_accounts (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_key         text NOT NULL UNIQUE,          -- 'campers' | 'mobil' | 'shop' | 'group' | 'systems' ...
  display_name       text NOT NULL,
  google_email       text,                          -- account that granted access (filled on connect)
  refresh_token      text,                          -- OAuth refresh token (service-role access only, RLS deny)
  root_folder_id     text,                          -- Drive folder id of the BOP root for this tenant
  root_folder_name   text NOT NULL DEFAULT 'BOP',
  status             text NOT NULL DEFAULT 'disconnected'
                       CHECK (status IN ('disconnected','connected','error')),
  quota_used_bytes   bigint,
  quota_limit_bytes  bigint,
  quota_measured_at  timestamptz,
  last_error         text,
  connected_at       timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- 2. File index — authoritative record of every file BOP touches
CREATE TABLE IF NOT EXISTS st_files (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id         uuid NOT NULL REFERENCES st_drive_accounts(id) ON DELETE CASCADE,
  drive_file_id      text NOT NULL,
  file_name          text NOT NULL,
  mime_type          text,
  size_bytes         bigint,
  web_view_link      text,
  folder_path        text,                          -- human path hint, e.g. 'BOP/Invoices'
  linked_object_type text,                          -- 'listing' | 'case' | 'invoice' | null
  linked_object_id   uuid,
  status             text NOT NULL DEFAULT 'active'
                       CHECK (status IN ('active','trashed')),
  created_by         uuid,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, drive_file_id)
);

CREATE INDEX IF NOT EXISTS idx_st_files_linked
  ON st_files (account_id, linked_object_type, linked_object_id);
CREATE INDEX IF NOT EXISTS idx_st_files_name_fts
  ON st_files USING gin (to_tsvector('simple', file_name));

-- 3. RLS: deny-all for anon/authenticated — access only via service role (API routes)
ALTER TABLE st_drive_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE st_files          ENABLE ROW LEVEL SECURITY;

-- 4. updated_at triggers
CREATE OR REPLACE FUNCTION st_touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_st_drive_accounts_touch ON st_drive_accounts;
CREATE TRIGGER trg_st_drive_accounts_touch BEFORE UPDATE ON st_drive_accounts
  FOR EACH ROW EXECUTE FUNCTION st_touch_updated_at();
DROP TRIGGER IF EXISTS trg_st_files_touch ON st_files;
CREATE TRIGGER trg_st_files_touch BEFORE UPDATE ON st_files
  FOR EACH ROW EXECUTE FUNCTION st_touch_updated_at();

-- 5. Seed tenant slots (disconnected until OAuth flow runs)
INSERT INTO st_drive_accounts (tenant_key, display_name) VALUES
  ('campers', 'DES Campers'),
  ('mobil',   'DES Mobil'),
  ('shop',    'DES Shop'),
  ('group',   'Group / Holding'),
  ('systems', 'DES Systems')
ON CONFLICT (tenant_key) DO NOTHING;

-- 6. BOP registration
INSERT INTO bop_modules (module_id, code, name, layer, layer_name, phase, status)
VALUES ('STR', 'ST', 'Storage', 2, 'Operations', 2, 'in_progress')
ON CONFLICT (module_id) DO NOTHING;

INSERT INTO bop_screens (screen_id, module, func_type, sequence, title, route, nav_group, nav_order, nav_visible, lifecycle_state)
VALUES ('ST001', 'STR', 'transactional', 1, 'Drive Storage', '/console/st/drive', 'system', 55, true, 'dev')
ON CONFLICT (screen_id) DO NOTHING;

INSERT INTO bop_screen_roles (screen_id, role, can_read, can_write, can_delete) VALUES
  ('ST001', 'super_admin',    true, true, true),
  ('ST001', 'platform_admin', true, true, true),
  ('ST001', 'tenant_manager', true, true, false)
ON CONFLICT DO NOTHING;

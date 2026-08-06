-- ============================================================
-- BOP V2 — Phase 84: OP002 PBAC permissions
-- Registers OP002 screens + grants to roles
-- ============================================================

-- ── 1. Update OP002 screen status to active ────────────────
UPDATE bop_screens SET status = 'active', title = 'Strategy Cockpit'
WHERE screen_id = 'OP002';

-- ── 2. Grant PBAC permissions to roles ─────────────────────
INSERT INTO bop_screen_roles (screen_id, role, can_read, can_write, can_delete)
VALUES
  ('OP002', 'super_admin', true, true, true),
  ('OP002', 'platform_admin', true, true, true),
  ('OP002', 'tenant_manager', true, true, false),
  ('OP002', 'editor', true, true, false),
  ('OP002', 'viewer', true, false, false)
ON CONFLICT (screen_id, role) DO UPDATE SET
  can_read = EXCLUDED.can_read,
  can_write = EXCLUDED.can_write,
  can_delete = EXCLUDED.can_delete;

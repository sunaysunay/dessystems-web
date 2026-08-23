-- ============================================================
-- CI001 — Commerce Intelligence: Consent, Pseudonymisation, Retention
-- Task: CI-T05
-- Spec: §1, §11
-- ============================================================

-- ── 1. ci_pseudonym_salt ──
-- HMAC-SHA256 salt for pseudonymising device cookie IDs.
-- Rotates every 90 days. Old salts destroyed after rotation period.
-- Cross-period re-identification impossible by design.

CREATE TABLE IF NOT EXISTS ci_pseudonym_salt (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    integer NOT NULL,
  salt         text NOT NULL,
  active_from  timestamptz NOT NULL,
  active_until timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, active_from)
);

ALTER TABLE ci_pseudonym_salt ENABLE ROW LEVEL SECURITY;

CREATE POLICY ci_pseudonym_salt_tenant_isolation ON ci_pseudonym_salt
  USING (tenant_id = current_setting('app.tenant_id', true)::integer)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::integer);

-- Seed initial salt for DESShop
INSERT INTO ci_pseudonym_salt (tenant_id, salt, active_from)
VALUES (400, encode(gen_random_bytes(32), 'hex'), now())
ON CONFLICT (tenant_id, active_from) DO NOTHING;

-- ── 2. ci_consent_log ──
-- Records consent decisions per visitor. One row per decision event.

CREATE TABLE IF NOT EXISTS ci_consent_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       integer NOT NULL,
  anonymous_id    text NOT NULL,
  consent_given   boolean NOT NULL,
  consent_scope   text NOT NULL DEFAULT 'analytics',
  consent_version text,
  ip_hash         text,
  user_agent      text,
  recorded_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ci_consent_log_anon
  ON ci_consent_log (tenant_id, anonymous_id, recorded_at DESC);

ALTER TABLE ci_consent_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY ci_consent_log_tenant_isolation ON ci_consent_log
  USING (tenant_id = current_setting('app.tenant_id', true)::integer)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::integer);

-- ── 3. ci_sessions ──
-- Sessionised visitor data. Plane B, consent-gated.
-- Session ID: deterministic uuid_v5(namespace, tenant||anonymous_id||first_event_ts)

CREATE TABLE IF NOT EXISTS ci_sessions (
  id              uuid PRIMARY KEY,
  tenant_id       integer NOT NULL,
  anonymous_id    text NOT NULL,
  customer_id     uuid,
  started_at      timestamptz NOT NULL,
  ended_at        timestamptz,
  session_date    date NOT NULL,
  duration_s      integer,
  page_views      integer NOT NULL DEFAULT 0,
  product_views   integer NOT NULL DEFAULT 0,
  cart_adds       integer NOT NULL DEFAULT 0,
  checkout_steps  integer NOT NULL DEFAULT 0,
  search_count    integer NOT NULL DEFAULT 0,
  has_order       boolean NOT NULL DEFAULT false,
  is_engaged      boolean GENERATED ALWAYS AS (
    duration_s >= 10 OR page_views >= 2 OR product_views >= 1
  ) STORED,
  is_bot          boolean NOT NULL DEFAULT false,
  is_bounce       boolean GENERATED ALWAYS AS (page_views <= 1 AND duration_s < 10) STORED,
  consent_given   boolean NOT NULL DEFAULT false,

  -- Entry source
  landing_page    text,
  utm_source      text,
  utm_medium      text,
  utm_campaign    text,
  referrer        text,
  device_type     text,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ci_sessions_tenant_date
  ON ci_sessions (tenant_id, session_date);

CREATE INDEX IF NOT EXISTS idx_ci_sessions_anon
  ON ci_sessions (tenant_id, anonymous_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_ci_sessions_customer
  ON ci_sessions (tenant_id, customer_id)
  WHERE customer_id IS NOT NULL;

ALTER TABLE ci_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY ci_sessions_tenant_isolation ON ci_sessions
  USING (tenant_id = current_setting('app.tenant_id', true)::integer)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::integer);

-- ── 4. ci_identity_link ──
-- Links anonymous_id → customer_id when a visitor logs in or places an order.
-- Used for session stitching and cross-device identity resolution.

CREATE TABLE IF NOT EXISTS ci_identity_link (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       integer NOT NULL,
  anonymous_id    text NOT NULL,
  customer_id     uuid NOT NULL,
  linked_at       timestamptz NOT NULL DEFAULT now(),
  link_source     text NOT NULL CHECK (link_source IN ('login','order','manual')),
  UNIQUE (tenant_id, anonymous_id, customer_id)
);

CREATE INDEX IF NOT EXISTS idx_ci_identity_anon
  ON ci_identity_link (tenant_id, anonymous_id);

CREATE INDEX IF NOT EXISTS idx_ci_identity_customer
  ON ci_identity_link (tenant_id, customer_id);

ALTER TABLE ci_identity_link ENABLE ROW LEVEL SECURITY;

CREATE POLICY ci_identity_link_tenant_isolation ON ci_identity_link
  USING (tenant_id = current_setting('app.tenant_id', true)::integer)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::integer);

-- ── 5. bop_objects ──

INSERT INTO bop_objects (object_id, type, module, name, status, description)
VALUES
  ('table:ci_pseudonym_salt', 'table', 'SHP', 'ci_pseudonym_salt', 'active',
   'HMAC salt for pseudonymising cookie IDs. L4 — rotates every 90 days.'),
  ('table:ci_consent_log', 'table', 'SHP', 'ci_consent_log', 'active',
   'Consent decision log per visitor. L4.'),
  ('table:ci_sessions', 'table', 'SHP', 'ci_sessions', 'active',
   'Sessionised visitor data. Plane B, consent-gated. L4.'),
  ('table:ci_identity_link', 'table', 'SHP', 'ci_identity_link', 'active',
   'Anonymous → customer identity stitching. L4.')
ON CONFLICT (object_id) DO NOTHING;

-- ── ROLLBACK ──
-- DELETE FROM bop_objects WHERE object_id IN ('table:ci_pseudonym_salt','table:ci_consent_log','table:ci_sessions','table:ci_identity_link');
-- DROP POLICY IF EXISTS ci_identity_link_tenant_isolation ON ci_identity_link;
-- DROP POLICY IF EXISTS ci_sessions_tenant_isolation ON ci_sessions;
-- DROP POLICY IF EXISTS ci_consent_log_tenant_isolation ON ci_consent_log;
-- DROP POLICY IF EXISTS ci_pseudonym_salt_tenant_isolation ON ci_pseudonym_salt;
-- DROP TABLE IF EXISTS ci_identity_link;
-- DROP TABLE IF EXISTS ci_sessions;
-- DROP TABLE IF EXISTS ci_consent_log;
-- DROP TABLE IF EXISTS ci_pseudonym_salt;

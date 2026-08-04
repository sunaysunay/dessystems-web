-- ============================================================
-- P2  Quotation: Versions + Customer Acceptance
-- Migration: sql_bop_v2_73_quotation_versioning.sql
-- ============================================================

-- ── 1. ALTER sal_quotations: add versioning + case columns ──

ALTER TABLE sal_quotations
  ADD COLUMN IF NOT EXISTS case_id        uuid REFERENCES bop_cases(id),
  ADD COLUMN IF NOT EXISTS btw_regime     text DEFAULT 'btw_belast',
  ADD COLUMN IF NOT EXISTS snapshot       jsonb,
  ADD COLUMN IF NOT EXISTS version        integer DEFAULT 1 NOT NULL,
  ADD COLUMN IF NOT EXISTS replaces_id    uuid REFERENCES sal_quotations(id);

-- ── 2. Status expansion: add 'viewed' ──

ALTER TABLE sal_quotations DROP CONSTRAINT IF EXISTS sal_quotations_status_check;
ALTER TABLE sal_quotations ADD CONSTRAINT sal_quotations_status_check
  CHECK (status IN ('draft','sent','viewed','accepted','declined','expired','cancelled'));

-- ── 3. BTW regime constraint ──

ALTER TABLE sal_quotations DROP CONSTRAINT IF EXISTS sal_quotations_btw_regime_check;
ALTER TABLE sal_quotations ADD CONSTRAINT sal_quotations_btw_regime_check
  CHECK (btw_regime IN ('marge','btw_belast'));

-- ── 4. Quotation status transitions ──

CREATE TABLE IF NOT EXISTS bop_quotation_transitions (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id   uuid DEFAULT current_setting('app.tenant_id', true)::uuid,
  from_status text NOT NULL,
  to_status   text NOT NULL,
  guard       text,
  UNIQUE(tenant_id, from_status, to_status)
);

INSERT INTO bop_quotation_transitions (from_status, to_status, guard) VALUES
  ('draft',    'sent',      'snapshot_frozen'),
  ('sent',     'viewed',    NULL),
  ('sent',     'accepted',  'approval_token'),
  ('sent',     'declined',  'approval_token'),
  ('sent',     'expired',   'valid_until_passed'),
  ('viewed',   'accepted',  'approval_token'),
  ('viewed',   'declined',  'approval_token'),
  ('viewed',   'expired',   'valid_until_passed'),
  ('draft',    'cancelled', NULL),
  ('sent',     'cancelled', NULL),
  ('accepted', 'expired',   'new_version_created')
ON CONFLICT DO NOTHING;

-- ── 5. RPC: bop_quotation_allowed_transitions ──

CREATE OR REPLACE FUNCTION bop_quotation_allowed_transitions(p_quotation_id uuid)
RETURNS TABLE(to_status text, guard text) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_current text;
BEGIN
  SELECT status INTO v_current FROM sal_quotations WHERE id = p_quotation_id;
  IF v_current IS NULL THEN RAISE EXCEPTION 'quotation not found'; END IF;
  RETURN QUERY
    SELECT t.to_status, t.guard
    FROM bop_quotation_transitions t
    WHERE t.from_status = v_current;
END;
$$;

-- ── 6. RPC: bop_quotation_transition ──

CREATE OR REPLACE FUNCTION bop_quotation_transition(
  p_quotation_id uuid,
  p_to_status    text,
  p_actor        text DEFAULT 'system',
  p_reason       text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_current text;
  v_allowed boolean;
BEGIN
  SELECT status INTO v_current FROM sal_quotations WHERE id = p_quotation_id FOR UPDATE;
  IF v_current IS NULL THEN RAISE EXCEPTION 'quotation not found'; END IF;

  SELECT EXISTS(
    SELECT 1 FROM bop_quotation_transitions
    WHERE from_status = v_current AND to_status = p_to_status
  ) INTO v_allowed;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'transition % -> % not allowed', v_current, p_to_status;
  END IF;

  UPDATE sal_quotations SET status = p_to_status, updated_at = now() WHERE id = p_quotation_id;

  INSERT INTO bop_status_transitions (entity_type, entity_id, from_status, to_status, changed_by, reason)
  VALUES ('quotation', p_quotation_id, v_current, p_to_status, p_actor, p_reason);
END;
$$;

-- ── 7. RPC: bop_quotation_send (freeze snapshot + transition) ──

CREATE OR REPLACE FUNCTION bop_quotation_send(
  p_quotation_id uuid,
  p_actor        text DEFAULT 'system'
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_q       sal_quotations%ROWTYPE;
  v_snap    jsonb;
  v_token   uuid;
BEGIN
  SELECT * INTO v_q FROM sal_quotations WHERE id = p_quotation_id FOR UPDATE;
  IF v_q IS NULL THEN RAISE EXCEPTION 'quotation not found'; END IF;
  IF v_q.status <> 'draft' THEN RAISE EXCEPTION 'can only send from draft status'; END IF;

  -- Freeze snapshot
  v_snap := jsonb_build_object(
    'lines', v_q.lines,
    'vat_scheme', v_q.vat_scheme,
    'btw_regime', COALESCE(v_q.btw_regime, 'btw_belast'),
    'valid_until', v_q.valid_until,
    'notes', v_q.notes,
    'frozen_at', now()
  );

  UPDATE sal_quotations SET snapshot = v_snap, status = 'sent', updated_at = now()
  WHERE id = p_quotation_id;

  -- Create approval token
  v_token := gen_random_uuid();
  INSERT INTO bop_customer_approvals (entity_type, entity_id, token, expires_at)
  VALUES ('quotation', p_quotation_id, v_token, COALESCE(v_q.valid_until, now() + interval '30 days'));

  -- Audit trail
  INSERT INTO bop_status_transitions (entity_type, entity_id, from_status, to_status, changed_by, reason)
  VALUES ('quotation', p_quotation_id, 'draft', 'sent', p_actor, 'Quotation sent to customer');

  RETURN jsonb_build_object('token', v_token, 'snapshot', v_snap);
END;
$$;

-- ── 8. RPC: bop_quotation_new_version ──

CREATE OR REPLACE FUNCTION bop_quotation_new_version(
  p_quotation_id uuid,
  p_actor        text DEFAULT 'system'
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_old     sal_quotations%ROWTYPE;
  v_new_id  uuid;
  v_new_ver integer;
BEGIN
  SELECT * INTO v_old FROM sal_quotations WHERE id = p_quotation_id FOR UPDATE;
  IF v_old IS NULL THEN RAISE EXCEPTION 'quotation not found'; END IF;

  v_new_ver := v_old.version + 1;

  INSERT INTO sal_quotations (
    tenant_id, quote_number, partner_id, asset_id, type, status,
    vat_scheme, btw_regime, valid_until, lines, notes, case_id,
    version, replaces_id
  ) VALUES (
    v_old.tenant_id, v_old.quote_number, v_old.partner_id, v_old.asset_id,
    v_old.type, 'draft',
    v_old.vat_scheme, v_old.btw_regime, v_old.valid_until, v_old.lines,
    v_old.notes, v_old.case_id,
    v_new_ver, p_quotation_id
  ) RETURNING id INTO v_new_id;

  -- Expire old version
  UPDATE sal_quotations SET status = 'expired', updated_at = now() WHERE id = p_quotation_id;

  -- Doc flow
  INSERT INTO bop_doc_flow (source_type, source_id, target_type, target_id, relation)
  VALUES ('quotation', p_quotation_id, 'quotation', v_new_id, 'replaced');

  INSERT INTO bop_status_transitions (entity_type, entity_id, from_status, to_status, changed_by, reason)
  VALUES ('quotation', p_quotation_id, v_old.status, 'expired', p_actor, 'Replaced by version ' || v_new_ver);

  RETURN v_new_id;
END;
$$;

-- ── 9. RPC: bop_approval_respond ──

CREATE OR REPLACE FUNCTION bop_approval_respond(
  p_token     uuid,
  p_response  text,  -- 'accepted' or 'declined'
  p_reason    text DEFAULT NULL,
  p_signature text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_approval bop_customer_approvals%ROWTYPE;
BEGIN
  SELECT * INTO v_approval FROM bop_customer_approvals
  WHERE token = p_token AND responded_at IS NULL
  FOR UPDATE;

  IF v_approval IS NULL THEN
    RETURN jsonb_build_object('error', 'Invalid or already used token');
  END IF;

  IF v_approval.expires_at < now() THEN
    RETURN jsonb_build_object('error', 'Token has expired');
  END IF;

  UPDATE bop_customer_approvals SET
    response   = p_response,
    reason     = p_reason,
    signature  = p_signature,
    responded_at = now()
  WHERE id = v_approval.id;

  -- Transition the entity
  IF v_approval.entity_type = 'quotation' THEN
    UPDATE sal_quotations SET status = p_response, updated_at = now()
    WHERE id = v_approval.entity_id;

    INSERT INTO bop_status_transitions (entity_type, entity_id, from_status, to_status, changed_by, reason)
    VALUES ('quotation', v_approval.entity_id, 'sent', p_response, 'customer', p_reason);
  ELSIF v_approval.entity_type = 'order' THEN
    UPDATE sal_orders SET status = 'customer_confirmed', updated_at = now()
    WHERE id = v_approval.entity_id;

    INSERT INTO bop_status_transitions (entity_type, entity_id, from_status, to_status, changed_by, reason)
    VALUES ('order', v_approval.entity_id, 'confirmed', 'customer_confirmed', 'customer', p_reason);
  END IF;

  RETURN jsonb_build_object('ok', true, 'entity_type', v_approval.entity_type, 'entity_id', v_approval.entity_id);
END;
$$;

-- ── 10. Register objects + counter ──

INSERT INTO bop_objects (object_id, type, module, name, route, status, lifecycle_state)
VALUES
  ('table:bop_quotation_transitions', 'table', 'SAL', 'Quotation Transitions', NULL, 'active', 'active'),
  ('api:bop_quotation_send',          'api',   'SAL', 'Send Quotation',        NULL, 'active', 'active'),
  ('api:bop_quotation_new_version',   'api',   'SAL', 'New Quotation Version', NULL, 'active', 'active'),
  ('api:bop_approval_respond',        'api',   'SAL', 'Approval Respond',      NULL, 'active', 'active'),
  ('api:bop_quotation_transition',    'api',   'SAL', 'Quotation Transition',  NULL, 'active', 'active'),
  ('api:bop_quotation_allowed_transitions', 'api', 'SAL', 'Quotation Allowed Transitions', NULL, 'active', 'active')
ON CONFLICT (object_id) DO NOTHING;

-- ── 11. RLS policies ──

DO $$ BEGIN
  EXECUTE 'ALTER TABLE bop_quotation_transitions ENABLE ROW LEVEL SECURITY';
  CREATE POLICY bop_quotation_transitions_tenant ON bop_quotation_transitions
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

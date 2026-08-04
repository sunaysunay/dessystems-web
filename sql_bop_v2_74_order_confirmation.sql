-- ============================================================
-- P3  Order: Confirmation + Vehicle Lock + Koopovereenkomst
-- Migration: sql_bop_v2_74_order_confirmation.sql
-- ============================================================

-- ── 1. ALTER sal_orders: add TFE columns ──

ALTER TABLE sal_orders
  ADD COLUMN IF NOT EXISTS case_id                uuid REFERENCES bop_cases(id),
  ADD COLUMN IF NOT EXISTS btw_regime             text DEFAULT 'btw_belast',
  ADD COLUMN IF NOT EXISTS vehicle_id             uuid,
  ADD COLUMN IF NOT EXISTS koopovereenkomst_url   text,
  ADD COLUMN IF NOT EXISTS delivery_terms         text,
  ADD COLUMN IF NOT EXISTS aanbetaling_pct        numeric(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cancel_reason          text,
  ADD COLUMN IF NOT EXISTS cancel_reason_type     text;

-- ── 2. Status expansion ──

ALTER TABLE sal_orders DROP CONSTRAINT IF EXISTS sal_orders_status_check;
ALTER TABLE sal_orders ADD CONSTRAINT sal_orders_status_check
  CHECK (status IN (
    'draft','confirmed','customer_confirmed',
    'in_preparation','ready','handover_scheduled',
    'delivered','completed','cancelled'
  ));

-- ── 3. BTW regime constraint ──

ALTER TABLE sal_orders DROP CONSTRAINT IF EXISTS sal_orders_btw_regime_check;
ALTER TABLE sal_orders ADD CONSTRAINT sal_orders_btw_regime_check
  CHECK (btw_regime IN ('marge','btw_belast'));

-- ── 4. Cancel reason type constraint ──

ALTER TABLE sal_orders DROP CONSTRAINT IF EXISTS sal_orders_cancel_reason_type_check;
ALTER TABLE sal_orders ADD CONSTRAINT sal_orders_cancel_reason_type_check
  CHECK (cancel_reason_type IS NULL OR cancel_reason_type IN (
    'customer_withdrew','financing_failed','vehicle_issue','other'
  ));

-- ── 5. Order status transitions ──

CREATE TABLE IF NOT EXISTS bop_order_transitions (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id   uuid DEFAULT current_setting('app.tenant_id', true)::uuid,
  from_status text NOT NULL,
  to_status   text NOT NULL,
  guard       text,
  UNIQUE(tenant_id, from_status, to_status)
);

INSERT INTO bop_order_transitions (from_status, to_status, guard) VALUES
  ('draft',              'confirmed',           'koopovereenkomst_sent'),
  ('confirmed',          'customer_confirmed',  'approval_token'),
  ('customer_confirmed', 'in_preparation',      NULL),
  ('in_preparation',     'ready',               NULL),
  ('ready',              'handover_scheduled',  'delivery_date_set'),
  ('handover_scheduled', 'delivered',           NULL),
  ('delivered',          'completed',           'paid_in_full'),
  -- Cancellation from multiple states
  ('draft',              'cancelled',           NULL),
  ('confirmed',          'cancelled',           'no_deposit_paid'),
  ('customer_confirmed', 'cancelled',           'refund_check'),
  ('in_preparation',     'cancelled',           'refund_check')
ON CONFLICT DO NOTHING;

-- ── 6. RPC: bop_order_allowed_transitions ──

CREATE OR REPLACE FUNCTION bop_order_allowed_transitions(p_order_id uuid)
RETURNS TABLE(to_status text, guard text) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_current text;
BEGIN
  SELECT status INTO v_current FROM sal_orders WHERE id = p_order_id;
  IF v_current IS NULL THEN RAISE EXCEPTION 'order not found'; END IF;
  RETURN QUERY
    SELECT t.to_status, t.guard
    FROM bop_order_transitions t
    WHERE t.from_status = v_current;
END;
$$;

-- ── 7. RPC: bop_order_transition ──

CREATE OR REPLACE FUNCTION bop_order_transition(
  p_order_id   uuid,
  p_to_status  text,
  p_actor      text DEFAULT 'system',
  p_reason     text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_current text;
  v_allowed boolean;
BEGIN
  SELECT status INTO v_current FROM sal_orders WHERE id = p_order_id FOR UPDATE;
  IF v_current IS NULL THEN RAISE EXCEPTION 'order not found'; END IF;

  SELECT EXISTS(
    SELECT 1 FROM bop_order_transitions
    WHERE from_status = v_current AND to_status = p_to_status
  ) INTO v_allowed;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'transition % -> % not allowed', v_current, p_to_status;
  END IF;

  UPDATE sal_orders SET status = p_to_status, updated_at = now() WHERE id = p_order_id;

  INSERT INTO bop_status_transitions (entity_type, entity_id, from_status, to_status, changed_by, reason)
  VALUES ('order', p_order_id, v_current, p_to_status, p_actor, p_reason);
END;
$$;

-- ── 8. RPC: bop_order_confirm (lock vehicle + generate koopovereenkomst + approval) ──

CREATE OR REPLACE FUNCTION bop_order_confirm(
  p_order_id uuid,
  p_actor    text DEFAULT 'system'
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_o       sal_orders%ROWTYPE;
  v_token   uuid;
  v_lock_id uuid;
BEGIN
  SELECT * INTO v_o FROM sal_orders WHERE id = p_order_id FOR UPDATE;
  IF v_o IS NULL THEN RAISE EXCEPTION 'order not found'; END IF;
  IF v_o.status <> 'draft' THEN RAISE EXCEPTION 'can only confirm from draft'; END IF;

  -- Acquire OLS lock on vehicle if vehicle_id is set
  IF v_o.vehicle_id IS NOT NULL THEN
    SELECT id INTO v_lock_id FROM bop_object_locks
    WHERE object_type = 'vehicle' AND object_id = v_o.vehicle_id AND released_at IS NULL;

    IF v_lock_id IS NOT NULL THEN
      RAISE EXCEPTION 'Vehicle is already locked by another order';
    END IF;

    INSERT INTO bop_object_locks (object_type, object_id, locked_by, lock_reason, context)
    VALUES ('vehicle', v_o.vehicle_id, p_actor, 'order_confirmation',
            jsonb_build_object('order_id', p_order_id, 'order_number', v_o.order_number))
    RETURNING id INTO v_lock_id;
  END IF;

  -- Transition to confirmed
  UPDATE sal_orders SET status = 'confirmed', updated_at = now() WHERE id = p_order_id;

  -- Create approval token for customer confirmation
  v_token := gen_random_uuid();
  INSERT INTO bop_customer_approvals (entity_type, entity_id, token, expires_at)
  VALUES ('order', p_order_id, v_token, now() + interval '14 days');

  INSERT INTO bop_status_transitions (entity_type, entity_id, from_status, to_status, changed_by, reason)
  VALUES ('order', p_order_id, 'draft', 'confirmed', p_actor, 'Order confirmed, koopovereenkomst sent');

  RETURN jsonb_build_object('token', v_token, 'lock_id', v_lock_id);
END;
$$;

-- ── 9. RPC: bop_order_cancel ──

CREATE OR REPLACE FUNCTION bop_order_cancel(
  p_order_id    uuid,
  p_reason_type text,
  p_reason      text,
  p_actor       text DEFAULT 'system'
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_o           sal_orders%ROWTYPE;
  v_has_deposit boolean := false;
BEGIN
  SELECT * INTO v_o FROM sal_orders WHERE id = p_order_id FOR UPDATE;
  IF v_o IS NULL THEN RAISE EXCEPTION 'order not found'; END IF;
  IF v_o.status IN ('delivered','completed','cancelled') THEN
    RAISE EXCEPTION 'cannot cancel order in % status', v_o.status;
  END IF;

  -- Check for paid deposits (invoices linked to this order)
  SELECT EXISTS(
    SELECT 1 FROM bop_doc_flow df
    JOIN fin_invoices fi ON fi.id = df.target_id
    WHERE df.source_type = 'order' AND df.source_id = p_order_id
      AND df.target_type = 'invoice'
      AND fi.status = 'paid'
  ) INTO v_has_deposit;

  IF v_has_deposit THEN
    RETURN jsonb_build_object('needs_refund', true, 'message', 'Paid deposits exist. Create credit note before cancelling.');
  END IF;

  -- Release vehicle lock
  IF v_o.vehicle_id IS NOT NULL THEN
    UPDATE bop_object_locks SET released_at = now(), release_reason = 'order_cancelled'
    WHERE object_type = 'vehicle' AND object_id = v_o.vehicle_id AND released_at IS NULL;
  END IF;

  -- Cancel
  UPDATE sal_orders SET
    status = 'cancelled',
    cancel_reason_type = p_reason_type,
    cancel_reason = p_reason,
    updated_at = now()
  WHERE id = p_order_id;

  INSERT INTO bop_status_transitions (entity_type, entity_id, from_status, to_status, changed_by, reason)
  VALUES ('order', p_order_id, v_o.status, 'cancelled', p_actor, p_reason_type || ': ' || p_reason);

  RETURN jsonb_build_object('ok', true, 'needs_refund', false);
END;
$$;

-- ── 10. Register objects ──

INSERT INTO bop_objects (object_id, type, module, name, route, status, lifecycle_state)
VALUES
  ('table:bop_order_transitions',        'table', 'SAL', 'Order Transitions',         NULL, 'active', 'active'),
  ('api:bop_order_confirm',              'api',   'SAL', 'Order Confirm',             NULL, 'active', 'active'),
  ('api:bop_order_cancel',               'api',   'SAL', 'Order Cancel',              NULL, 'active', 'active'),
  ('api:bop_order_transition',           'api',   'SAL', 'Order Transition',          NULL, 'active', 'active'),
  ('api:bop_order_allowed_transitions',  'api',   'SAL', 'Order Allowed Transitions', NULL, 'active', 'active')
ON CONFLICT (object_id) DO NOTHING;

-- ── 11. RLS policies ──

DO $$ BEGIN
  EXECUTE 'ALTER TABLE bop_order_transitions ENABLE ROW LEVEL SECURITY';
  CREATE POLICY bop_order_transitions_tenant ON bop_order_transitions
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

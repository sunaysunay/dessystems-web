-- ============================================================
-- P5  Handover: Mobile Checklist + Signature
-- Migration: sql_bop_v2_76_handover.sql
-- ============================================================

-- ── 1. CREATE sal_handovers ──

CREATE TABLE IF NOT EXISTS sal_handovers (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       uuid DEFAULT current_setting('app.tenant_id', true)::uuid,
  handover_number text,
  order_id        uuid NOT NULL REFERENCES sal_orders(id),
  case_id         uuid REFERENCES bop_cases(id),
  vehicle_id      uuid,
  partner_id      uuid REFERENCES mdm_business_partners(id),
  status          text DEFAULT 'scheduled' NOT NULL,
  scheduled_at    timestamptz,
  started_at      timestamptz,
  completed_at    timestamptz,
  -- Checklist data
  odometer_km     integer,
  fuel_level      text,
  keys_count      integer DEFAULT 2,
  accessories     jsonb DEFAULT '[]'::jsonb,
  photos          jsonb DEFAULT '[]'::jsonb,
  rdw_tenaamstelling text,
  rdw_ref         text,
  notes           text,
  -- Signature
  signature_data  text,
  signed_by       text,
  signed_at       timestamptz,
  -- Warranty link
  warranty_id     uuid,
  -- Survey link
  survey_id       uuid,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- ── 2. Status constraint ──

ALTER TABLE sal_handovers DROP CONSTRAINT IF EXISTS sal_handovers_status_check;
ALTER TABLE sal_handovers ADD CONSTRAINT sal_handovers_status_check
  CHECK (status IN ('scheduled','in_progress','executed','completed','cancelled'));

-- ── 3. Fuel level constraint ──

ALTER TABLE sal_handovers DROP CONSTRAINT IF EXISTS sal_handovers_fuel_check;
ALTER TABLE sal_handovers ADD CONSTRAINT sal_handovers_fuel_check
  CHECK (fuel_level IS NULL OR fuel_level IN ('empty','quarter','half','three_quarter','full','electric_pct'));

-- ── 4. Auto-number trigger ──

CREATE OR REPLACE FUNCTION sal_handover_number_trigger()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_prefix text;
  v_count  bigint;
BEGIN
  IF NEW.handover_number IS NULL THEN
    v_prefix := 'HO-' || to_char(now(), 'YYYYMM');
    SELECT count(*) INTO v_count FROM sal_handovers WHERE handover_number LIKE v_prefix || '%';
    NEW.handover_number := v_prefix || '-' || lpad((v_count + 1)::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sal_handover_number ON sal_handovers;
CREATE TRIGGER trg_sal_handover_number
  BEFORE INSERT ON sal_handovers
  FOR EACH ROW EXECUTE FUNCTION sal_handover_number_trigger();

-- ── 5. Handover status transitions ──

CREATE TABLE IF NOT EXISTS bop_handover_transitions (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id   uuid DEFAULT current_setting('app.tenant_id', true)::uuid,
  from_status text NOT NULL,
  to_status   text NOT NULL,
  guard       text,
  UNIQUE(tenant_id, from_status, to_status)
);

INSERT INTO bop_handover_transitions (from_status, to_status, guard) VALUES
  ('scheduled',    'in_progress',  NULL),
  ('in_progress',  'executed',     'checklist_complete'),
  ('executed',     'completed',    'signature_captured'),
  ('scheduled',    'cancelled',    NULL),
  ('in_progress',  'cancelled',    NULL)
ON CONFLICT DO NOTHING;

-- ── 6. RPC: bop_handover_allowed_transitions ──

CREATE OR REPLACE FUNCTION bop_handover_allowed_transitions(p_handover_id uuid)
RETURNS TABLE(to_status text, guard text) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_current text;
BEGIN
  SELECT status INTO v_current FROM sal_handovers WHERE id = p_handover_id;
  IF v_current IS NULL THEN RAISE EXCEPTION 'handover not found'; END IF;
  RETURN QUERY
    SELECT t.to_status, t.guard
    FROM bop_handover_transitions t
    WHERE t.from_status = v_current;
END;
$$;

-- ── 7. RPC: bop_handover_transition ──

CREATE OR REPLACE FUNCTION bop_handover_transition(
  p_handover_id uuid,
  p_to_status   text,
  p_actor       text DEFAULT 'system',
  p_reason      text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_current text;
  v_allowed boolean;
BEGIN
  SELECT status INTO v_current FROM sal_handovers WHERE id = p_handover_id FOR UPDATE;
  IF v_current IS NULL THEN RAISE EXCEPTION 'handover not found'; END IF;

  SELECT EXISTS(
    SELECT 1 FROM bop_handover_transitions
    WHERE from_status = v_current AND to_status = p_to_status
  ) INTO v_allowed;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'transition % -> % not allowed', v_current, p_to_status;
  END IF;

  UPDATE sal_handovers SET status = p_to_status, updated_at = now() WHERE id = p_handover_id;

  IF p_to_status = 'in_progress' THEN
    UPDATE sal_handovers SET started_at = now() WHERE id = p_handover_id;
  ELSIF p_to_status = 'completed' THEN
    UPDATE sal_handovers SET completed_at = now() WHERE id = p_handover_id;
  END IF;

  INSERT INTO bop_status_transitions (entity_type, entity_id, from_status, to_status, changed_by, reason)
  VALUES ('handover', p_handover_id, v_current, p_to_status, p_actor, p_reason);
END;
$$;

-- ── 8. RPC: bop_handover_complete ──
-- Single transaction: signature + OLS release + order → delivered

CREATE OR REPLACE FUNCTION bop_handover_complete(
  p_handover_id  uuid,
  p_signature    text,
  p_signed_by    text,
  p_actor        text DEFAULT 'system'
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_h        sal_handovers%ROWTYPE;
  v_order_id uuid;
BEGIN
  SELECT * INTO v_h FROM sal_handovers WHERE id = p_handover_id FOR UPDATE;
  IF v_h IS NULL THEN RAISE EXCEPTION 'handover not found'; END IF;
  IF v_h.status <> 'executed' THEN RAISE EXCEPTION 'can only complete from executed status'; END IF;

  -- Save signature
  UPDATE sal_handovers SET
    signature_data = p_signature,
    signed_by = p_signed_by,
    signed_at = now(),
    status = 'completed',
    completed_at = now(),
    updated_at = now()
  WHERE id = p_handover_id;

  -- Audit trail
  INSERT INTO bop_status_transitions (entity_type, entity_id, from_status, to_status, changed_by, reason)
  VALUES ('handover', p_handover_id, 'executed', 'completed', p_actor, 'Signature captured, handover completed');

  -- Release OLS vehicle lock
  IF v_h.vehicle_id IS NOT NULL THEN
    UPDATE bop_object_locks SET released_at = now(), release_reason = 'handover_completed'
    WHERE object_type = 'vehicle' AND object_id = v_h.vehicle_id AND released_at IS NULL;
  END IF;

  -- Transition order to delivered
  v_order_id := v_h.order_id;
  IF v_order_id IS NOT NULL THEN
    UPDATE sal_orders SET status = 'delivered', updated_at = now() WHERE id = v_order_id AND status = 'handover_scheduled';

    INSERT INTO bop_status_transitions (entity_type, entity_id, from_status, to_status, changed_by, reason)
    VALUES ('order', v_order_id, 'handover_scheduled', 'delivered', p_actor, 'Handover completed — vehicle delivered');

    -- Doc flow
    INSERT INTO bop_doc_flow (source_type, source_id, target_type, target_id, relation)
    VALUES ('order', v_order_id, 'handover', p_handover_id, 'spawned');
  END IF;

  RETURN jsonb_build_object('ok', true, 'order_id', v_order_id);
END;
$$;

-- ── 9. RPC: bop_create_handover_from_order ──

CREATE OR REPLACE FUNCTION bop_create_handover_from_order(
  p_order_id     uuid,
  p_scheduled_at timestamptz DEFAULT now(),
  p_actor        text DEFAULT 'system'
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_o     sal_orders%ROWTYPE;
  v_ho_id uuid;
BEGIN
  SELECT * INTO v_o FROM sal_orders WHERE id = p_order_id;
  IF v_o IS NULL THEN RAISE EXCEPTION 'order not found'; END IF;
  IF v_o.status NOT IN ('ready', 'handover_scheduled') THEN
    RAISE EXCEPTION 'order must be in ready or handover_scheduled status';
  END IF;

  INSERT INTO sal_handovers (
    tenant_id, order_id, case_id, vehicle_id, partner_id,
    status, scheduled_at
  ) VALUES (
    v_o.tenant_id, p_order_id, v_o.case_id, v_o.vehicle_id, v_o.partner_id,
    'scheduled', p_scheduled_at
  ) RETURNING id INTO v_ho_id;

  -- Transition order to handover_scheduled if ready
  IF v_o.status = 'ready' THEN
    UPDATE sal_orders SET status = 'handover_scheduled', updated_at = now() WHERE id = p_order_id;
    INSERT INTO bop_status_transitions (entity_type, entity_id, from_status, to_status, changed_by, reason)
    VALUES ('order', p_order_id, 'ready', 'handover_scheduled', p_actor, 'Handover scheduled');
  END IF;

  INSERT INTO bop_status_transitions (entity_type, entity_id, from_status, to_status, changed_by, reason)
  VALUES ('handover', v_ho_id, NULL, 'scheduled', p_actor, 'Handover created from order');

  RETURN jsonb_build_object('handover_id', v_ho_id);
END;
$$;

-- ── 10. Register objects ──

INSERT INTO bop_objects (object_id, type, module, name, route, status, lifecycle_state)
VALUES
  ('table:sal_handovers',                    'table', 'SAL', 'Handovers',                    NULL, 'active', 'active'),
  ('table:bop_handover_transitions',         'table', 'SAL', 'Handover Transitions',         NULL, 'active', 'active'),
  ('api:bop_handover_allowed_transitions',   'api',   'SAL', 'Handover Allowed Transitions', NULL, 'active', 'active'),
  ('api:bop_handover_transition',            'api',   'SAL', 'Handover Transition',          NULL, 'active', 'active'),
  ('api:bop_handover_complete',              'api',   'SAL', 'Handover Complete',             NULL, 'active', 'active'),
  ('api:bop_create_handover_from_order',     'api',   'SAL', 'Create Handover from Order',    NULL, 'active', 'active')
ON CONFLICT (object_id) DO NOTHING;

-- ── 11. Register counter ──

INSERT INTO bop_counter (object_name, short_code, counter)
VALUES ('sal_handovers', 'HO', 0)
ON CONFLICT (object_name) DO NOTHING;

-- ── 12. RLS policies ──

DO $$ BEGIN
  EXECUTE 'ALTER TABLE sal_handovers ENABLE ROW LEVEL SECURITY';
  CREATE POLICY sal_handovers_tenant ON sal_handovers
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'ALTER TABLE bop_handover_transitions ENABLE ROW LEVEL SECURITY';
  CREATE POLICY bop_handover_transitions_tenant ON bop_handover_transitions
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

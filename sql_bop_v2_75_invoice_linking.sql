-- ============================================================
-- P4  Invoice Linking + Payment Tracking
-- Migration: sql_bop_v2_75_invoice_linking.sql
-- ============================================================

-- ── 1. ALTER fin_invoices: add TFE columns ──

ALTER TABLE fin_invoices
  ADD COLUMN IF NOT EXISTS case_id          uuid REFERENCES bop_cases(id),
  ADD COLUMN IF NOT EXISTS btw_regime       text DEFAULT 'btw_belast',
  ADD COLUMN IF NOT EXISTS snapshot         jsonb,
  ADD COLUMN IF NOT EXISTS invoice_pdf_url  text,
  ADD COLUMN IF NOT EXISTS order_id         uuid REFERENCES sal_orders(id),
  ADD COLUMN IF NOT EXISTS invoice_kind     text DEFAULT 'final';

-- ── 2. Status constraint (formalise existing app-level statuses) ──

ALTER TABLE fin_invoices DROP CONSTRAINT IF EXISTS fin_invoices_status_check;
ALTER TABLE fin_invoices ADD CONSTRAINT fin_invoices_status_check
  CHECK (status IN ('draft','sent','partial','paid','overdue','cancelled','credited'));

-- ── 3. BTW regime constraint ──

ALTER TABLE fin_invoices DROP CONSTRAINT IF EXISTS fin_invoices_btw_regime_check;
ALTER TABLE fin_invoices ADD CONSTRAINT fin_invoices_btw_regime_check
  CHECK (btw_regime IN ('marge','btw_belast'));

-- ── 4. Invoice kind constraint ──

ALTER TABLE fin_invoices DROP CONSTRAINT IF EXISTS fin_invoices_kind_check;
ALTER TABLE fin_invoices ADD CONSTRAINT fin_invoices_kind_check
  CHECK (invoice_kind IN ('deposit','final','credit_note'));

-- ── 5. Invoice status transitions ──

CREATE TABLE IF NOT EXISTS bop_invoice_transitions (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id   uuid DEFAULT current_setting('app.tenant_id', true)::uuid,
  from_status text NOT NULL,
  to_status   text NOT NULL,
  guard       text,
  UNIQUE(tenant_id, from_status, to_status)
);

INSERT INTO bop_invoice_transitions (from_status, to_status, guard) VALUES
  ('draft',     'sent',       'snapshot_frozen'),
  ('sent',      'partial',    'payment_received'),
  ('sent',      'paid',       'fully_paid'),
  ('sent',      'overdue',    'past_due_date'),
  ('partial',   'paid',       'fully_paid'),
  ('partial',   'overdue',    'past_due_date'),
  ('overdue',   'partial',    'payment_received'),
  ('overdue',   'paid',       'fully_paid'),
  ('draft',     'cancelled',  NULL),
  ('sent',      'cancelled',  NULL),
  ('paid',      'credited',   'credit_note_issued')
ON CONFLICT DO NOTHING;

-- ── 6. RPC: bop_invoice_allowed_transitions ──

CREATE OR REPLACE FUNCTION bop_invoice_allowed_transitions(p_invoice_id uuid)
RETURNS TABLE(to_status text, guard text) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_current text;
BEGIN
  SELECT status INTO v_current FROM fin_invoices WHERE id = p_invoice_id;
  IF v_current IS NULL THEN RAISE EXCEPTION 'invoice not found'; END IF;
  RETURN QUERY
    SELECT t.to_status, t.guard
    FROM bop_invoice_transitions t
    WHERE t.from_status = v_current;
END;
$$;

-- ── 7. RPC: bop_invoice_transition ──

CREATE OR REPLACE FUNCTION bop_invoice_transition(
  p_invoice_id uuid,
  p_to_status  text,
  p_actor      text DEFAULT 'system',
  p_reason     text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_current text;
  v_allowed boolean;
BEGIN
  SELECT status INTO v_current FROM fin_invoices WHERE id = p_invoice_id FOR UPDATE;
  IF v_current IS NULL THEN RAISE EXCEPTION 'invoice not found'; END IF;

  SELECT EXISTS(
    SELECT 1 FROM bop_invoice_transitions
    WHERE from_status = v_current AND to_status = p_to_status
  ) INTO v_allowed;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'transition % -> % not allowed', v_current, p_to_status;
  END IF;

  UPDATE fin_invoices SET status = p_to_status, updated_at = now() WHERE id = p_invoice_id;

  INSERT INTO bop_status_transitions (entity_type, entity_id, from_status, to_status, changed_by, reason)
  VALUES ('invoice', p_invoice_id, v_current, p_to_status, p_actor, p_reason);
END;
$$;

-- ── 8. RPC: bop_create_invoice_from_order ──

CREATE OR REPLACE FUNCTION bop_create_invoice_from_order(
  p_order_id   uuid,
  p_kind       text,    -- 'deposit', 'final', 'credit_note'
  p_amount     numeric DEFAULT NULL,
  p_actor      text DEFAULT 'system'
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_o          sal_orders%ROWTYPE;
  v_inv_id     uuid;
  v_inv_number text;
  v_prefix     text;
  v_count      bigint;
  v_amount     numeric;
  v_lines      jsonb;
BEGIN
  SELECT * INTO v_o FROM sal_orders WHERE id = p_order_id;
  IF v_o IS NULL THEN RAISE EXCEPTION 'order not found'; END IF;

  -- Generate invoice number
  v_prefix := 'INV-' || to_char(now(), 'YYYYMM');
  SELECT count(*) INTO v_count FROM fin_invoices WHERE invoice_number LIKE v_prefix || '%';
  v_inv_number := v_prefix || '-' || lpad((v_count + 1)::text, 4, '0');

  -- Determine amount
  IF p_kind = 'deposit' THEN
    v_amount := COALESCE(p_amount, COALESCE(v_o.aanbetaling_pct, 0) / 100.0 * COALESCE((v_o.lines->0->>'unit_price')::numeric, 0));
    v_lines := jsonb_build_array(jsonb_build_object(
      'description', 'Deposit for order ' || COALESCE(v_o.order_number, v_o.id::text),
      'qty', 1, 'unit_price', v_amount, 'tax_rate', CASE WHEN v_o.btw_regime = 'marge' THEN 0 ELSE 21 END
    ));
  ELSIF p_kind = 'credit_note' THEN
    v_amount := COALESCE(p_amount, 0);
    v_lines := jsonb_build_array(jsonb_build_object(
      'description', 'Credit note for order ' || COALESCE(v_o.order_number, v_o.id::text),
      'qty', 1, 'unit_price', -1 * abs(v_amount), 'tax_rate', CASE WHEN v_o.btw_regime = 'marge' THEN 0 ELSE 21 END
    ));
  ELSE -- final
    v_amount := COALESCE(p_amount, 0);
    v_lines := v_o.lines;
  END IF;

  INSERT INTO fin_invoices (
    tenant_id, invoice_number, partner_id, order_id, quotation_id,
    case_id, btw_regime, invoice_kind, type, status, lines,
    amount, vat_scheme, due_date
  ) VALUES (
    v_o.tenant_id, v_inv_number, v_o.partner_id, p_order_id, v_o.quotation_id,
    v_o.case_id, COALESCE(v_o.btw_regime, 'btw_belast'), p_kind, 'AR', 'draft', v_lines,
    v_amount, CASE WHEN v_o.btw_regime = 'marge' THEN 'marge' ELSE 'standard' END,
    (now() + interval '30 days')::date
  ) RETURNING id INTO v_inv_id;

  -- Doc flow
  INSERT INTO bop_doc_flow (source_type, source_id, target_type, target_id, relation)
  VALUES ('order', p_order_id, 'invoice', v_inv_id,
    CASE WHEN p_kind = 'credit_note' THEN 'reversed' ELSE 'spawned' END);

  INSERT INTO bop_status_transitions (entity_type, entity_id, from_status, to_status, changed_by, reason)
  VALUES ('invoice', v_inv_id, NULL, 'draft', p_actor,
    p_kind || ' invoice created from order ' || COALESCE(v_o.order_number, v_o.id::text));

  RETURN jsonb_build_object('invoice_id', v_inv_id, 'invoice_number', v_inv_number, 'kind', p_kind, 'amount', v_amount);
END;
$$;

-- ── 9. RPC: invoice_payment_state ──

CREATE OR REPLACE FUNCTION invoice_payment_state(p_invoice_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_inv     fin_invoices%ROWTYPE;
  v_paid    numeric;
  v_status  text;
  v_overdue boolean;
  v_credited text;
  v_credit_total numeric;
BEGIN
  SELECT * INTO v_inv FROM fin_invoices WHERE id = p_invoice_id;
  IF v_inv IS NULL THEN RAISE EXCEPTION 'invoice not found'; END IF;

  -- Total paid from fin_payments
  SELECT COALESCE(sum(amount), 0) INTO v_paid
  FROM fin_payments WHERE invoice_id = p_invoice_id;

  -- Determine status
  IF v_paid >= COALESCE(v_inv.amount, 0) AND v_inv.amount > 0 THEN
    v_status := 'paid';
  ELSIF v_paid > 0 THEN
    v_status := 'partial';
  ELSE
    v_status := 'unpaid';
  END IF;

  -- Overdue check
  v_overdue := v_inv.due_date IS NOT NULL AND v_inv.due_date < current_date AND v_status <> 'paid';

  -- Credit note check
  SELECT COALESCE(sum(abs(fi.amount)), 0) INTO v_credit_total
  FROM bop_doc_flow df
  JOIN fin_invoices fi ON fi.id = df.target_id
  WHERE df.source_type = 'invoice' AND df.source_id = p_invoice_id
    AND df.relation = 'reversed';

  IF v_credit_total >= COALESCE(v_inv.amount, 0) AND v_credit_total > 0 THEN
    v_credited := 'full';
  ELSIF v_credit_total > 0 THEN
    v_credited := 'partial';
  ELSE
    v_credited := 'none';
  END IF;

  RETURN jsonb_build_object(
    'status', v_status,
    'overdue', v_overdue,
    'credited', v_credited,
    'total', COALESCE(v_inv.amount, 0),
    'paid', v_paid,
    'balance', COALESCE(v_inv.amount, 0) - v_paid,
    'credit_total', v_credit_total
  );
END;
$$;

-- ── 10. Register objects ──

INSERT INTO bop_objects (object_id, type, module, name, route, status, lifecycle_state)
VALUES
  ('table:bop_invoice_transitions',          'table', 'FIN', 'Invoice Transitions',          NULL, 'active', 'active'),
  ('api:bop_invoice_allowed_transitions',    'api',   'FIN', 'Invoice Allowed Transitions',  NULL, 'active', 'active'),
  ('api:bop_invoice_transition',             'api',   'FIN', 'Invoice Transition',            NULL, 'active', 'active'),
  ('api:bop_create_invoice_from_order',      'api',   'FIN', 'Create Invoice from Order',     NULL, 'active', 'active'),
  ('api:invoice_payment_state',              'api',   'FIN', 'Invoice Payment State',         NULL, 'active', 'active')
ON CONFLICT (object_id) DO NOTHING;

-- ── 11. RLS policies ──

DO $$ BEGIN
  EXECUTE 'ALTER TABLE bop_invoice_transitions ENABLE ROW LEVEL SECURITY';
  CREATE POLICY bop_invoice_transitions_tenant ON bop_invoice_transitions
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

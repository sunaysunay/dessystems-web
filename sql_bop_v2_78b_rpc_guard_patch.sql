-- ============================================================
-- P7b  Patch existing RPCs to set app.rpc_context before status changes
-- Run AFTER sql_bop_v2_78_case_timeline.sql
-- ============================================================

-- Helper: re-create bop_set_rpc_context (idempotent)
CREATE OR REPLACE FUNCTION bop_set_rpc_context()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('app.rpc_context', 'true', true);
END;
$$;

-- ── Patch bop_lead_transition ──
CREATE OR REPLACE FUNCTION bop_lead_transition(
  p_lead_id uuid, p_to_stage text, p_actor text DEFAULT 'system', p_reason text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_lead crm_leads%ROWTYPE;
  v_ok   boolean;
BEGIN
  PERFORM bop_set_rpc_context();
  SELECT * INTO v_lead FROM crm_leads WHERE id = p_lead_id FOR UPDATE;
  IF v_lead IS NULL THEN RAISE EXCEPTION 'lead not found'; END IF;
  SELECT EXISTS(SELECT 1 FROM bop_lead_transitions WHERE from_stage = v_lead.stage AND to_stage = p_to_stage) INTO v_ok;
  IF NOT v_ok THEN RAISE EXCEPTION 'transition % → % not allowed', v_lead.stage, p_to_stage; END IF;
  UPDATE crm_leads SET stage = p_to_stage, updated_at = now() WHERE id = p_lead_id;
  INSERT INTO bop_status_transitions (tenant_id, object_type, object_id, from_status, to_status, actor, reason)
  VALUES (v_lead.tenant_id, 'lead', p_lead_id, v_lead.stage, p_to_stage, p_actor, p_reason);
  RETURN jsonb_build_object('ok', true, 'from', v_lead.stage, 'to', p_to_stage);
END;
$$;

-- ── Patch bop_quotation_transition ──
CREATE OR REPLACE FUNCTION bop_quotation_transition(
  p_quotation_id uuid, p_to_status text, p_actor text DEFAULT 'system', p_reason text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_q sal_quotations%ROWTYPE;
  v_ok boolean;
BEGIN
  PERFORM bop_set_rpc_context();
  SELECT * INTO v_q FROM sal_quotations WHERE id = p_quotation_id FOR UPDATE;
  IF v_q IS NULL THEN RAISE EXCEPTION 'quotation not found'; END IF;
  SELECT EXISTS(SELECT 1 FROM bop_quotation_transitions WHERE from_status = v_q.status AND to_status = p_to_status) INTO v_ok;
  IF NOT v_ok THEN RAISE EXCEPTION 'transition % → % not allowed', v_q.status, p_to_status; END IF;
  UPDATE sal_quotations SET status = p_to_status, updated_at = now() WHERE id = p_quotation_id;
  INSERT INTO bop_status_transitions (tenant_id, object_type, object_id, from_status, to_status, actor, reason)
  VALUES (v_q.tenant_id, 'quotation', p_quotation_id, v_q.status, p_to_status, p_actor, p_reason);
  RETURN jsonb_build_object('ok', true, 'from', v_q.status, 'to', p_to_status);
END;
$$;

-- ── Patch bop_order_transition ──
CREATE OR REPLACE FUNCTION bop_order_transition(
  p_order_id uuid, p_to_status text, p_actor text DEFAULT 'system', p_reason text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_o sal_orders%ROWTYPE;
  v_ok boolean;
BEGIN
  PERFORM bop_set_rpc_context();
  SELECT * INTO v_o FROM sal_orders WHERE id = p_order_id FOR UPDATE;
  IF v_o IS NULL THEN RAISE EXCEPTION 'order not found'; END IF;
  SELECT EXISTS(SELECT 1 FROM bop_order_transitions WHERE from_status = v_o.status AND to_status = p_to_status) INTO v_ok;
  IF NOT v_ok THEN RAISE EXCEPTION 'transition % → % not allowed', v_o.status, p_to_status; END IF;
  UPDATE sal_orders SET status = p_to_status, updated_at = now() WHERE id = p_order_id;
  INSERT INTO bop_status_transitions (tenant_id, object_type, object_id, from_status, to_status, actor, reason)
  VALUES (v_o.tenant_id, 'order', p_order_id, v_o.status, p_to_status, p_actor, p_reason);
  RETURN jsonb_build_object('ok', true, 'from', v_o.status, 'to', p_to_status);
END;
$$;

-- ── Patch bop_invoice_transition ──
CREATE OR REPLACE FUNCTION bop_invoice_transition(
  p_invoice_id uuid, p_to_status text, p_actor text DEFAULT 'system', p_reason text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_inv fin_invoices%ROWTYPE;
  v_ok boolean;
BEGIN
  PERFORM bop_set_rpc_context();
  SELECT * INTO v_inv FROM fin_invoices WHERE id = p_invoice_id FOR UPDATE;
  IF v_inv IS NULL THEN RAISE EXCEPTION 'invoice not found'; END IF;
  SELECT EXISTS(SELECT 1 FROM bop_invoice_transitions WHERE from_status = v_inv.status AND to_status = p_to_status) INTO v_ok;
  IF NOT v_ok THEN RAISE EXCEPTION 'transition % → % not allowed', v_inv.status, p_to_status; END IF;
  UPDATE fin_invoices SET status = p_to_status, updated_at = now() WHERE id = p_invoice_id;
  INSERT INTO bop_status_transitions (tenant_id, object_type, object_id, from_status, to_status, actor, reason)
  VALUES (v_inv.tenant_id, 'invoice', p_invoice_id, v_inv.status, p_to_status, p_actor, p_reason);
  RETURN jsonb_build_object('ok', true, 'from', v_inv.status, 'to', p_to_status);
END;
$$;

-- ── Patch bop_handover_transition ──
CREATE OR REPLACE FUNCTION bop_handover_transition(
  p_handover_id uuid, p_to_status text, p_actor text DEFAULT 'system', p_reason text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_h sal_handovers%ROWTYPE;
  v_ok boolean;
BEGIN
  PERFORM bop_set_rpc_context();
  SELECT * INTO v_h FROM sal_handovers WHERE id = p_handover_id FOR UPDATE;
  IF v_h IS NULL THEN RAISE EXCEPTION 'handover not found'; END IF;
  SELECT EXISTS(SELECT 1 FROM bop_handover_transitions WHERE from_status = v_h.status AND to_status = p_to_status) INTO v_ok;
  IF NOT v_ok THEN RAISE EXCEPTION 'transition % → % not allowed', v_h.status, p_to_status; END IF;
  UPDATE sal_handovers SET status = p_to_status, updated_at = now() WHERE id = p_handover_id;
  INSERT INTO bop_status_transitions (tenant_id, object_type, object_id, from_status, to_status, actor, reason)
  VALUES (v_h.tenant_id, 'handover', p_handover_id, v_h.status, p_to_status, p_actor, p_reason);
  RETURN jsonb_build_object('ok', true, 'from', v_h.status, 'to', p_to_status);
END;
$$;

-- ── Patch other RPCs that change status ──

-- bop_convert_lead
CREATE OR REPLACE FUNCTION bop_convert_lead(
  p_lead_id uuid, p_target text DEFAULT 'quotation', p_actor text DEFAULT 'system'
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_lead crm_leads%ROWTYPE;
  v_case_id uuid;
  v_tgt_id  uuid;
BEGIN
  PERFORM bop_set_rpc_context();
  SELECT * INTO v_lead FROM crm_leads WHERE id = p_lead_id FOR UPDATE;
  IF v_lead IS NULL THEN RAISE EXCEPTION 'lead not found'; END IF;
  IF v_lead.stage NOT IN ('qualified','contacted') THEN RAISE EXCEPTION 'lead must be qualified or contacted to convert'; END IF;

  INSERT INTO bop_cases (partner_id, asset_id, business_line, language, owner)
  VALUES (v_lead.partner_id, v_lead.asset_id, COALESCE(v_lead.business_line, 'vehicle_sale'), COALESCE(v_lead.language, 'nl'), v_lead.owner)
  RETURNING id INTO v_case_id;

  UPDATE crm_leads SET stage = 'converted', converted_case_id = v_case_id, updated_at = now() WHERE id = p_lead_id;

  INSERT INTO bop_status_transitions (tenant_id, object_type, object_id, from_status, to_status, actor, reason)
  VALUES (v_lead.tenant_id, 'lead', p_lead_id, v_lead.stage, 'converted', p_actor, 'Converted to ' || p_target);

  IF p_target = 'quotation' THEN
    INSERT INTO sal_quotations (case_id, partner_id, vehicle_id, version, status)
    VALUES (v_case_id, v_lead.partner_id, v_lead.asset_id, 1, 'draft')
    RETURNING id INTO v_tgt_id;
  ELSIF p_target = 'order' THEN
    INSERT INTO sal_orders (case_id, partner_id, vehicle_id, status)
    VALUES (v_case_id, v_lead.partner_id, v_lead.asset_id, 'draft')
    RETURNING id INTO v_tgt_id;
  END IF;

  INSERT INTO bop_doc_flow (case_id, src_object, src_id, tgt_object, tgt_id, relation)
  VALUES (v_case_id, 'lead', p_lead_id, p_target, v_tgt_id, 'converted');

  RETURN jsonb_build_object('case_id', v_case_id, 'target_id', v_tgt_id, 'target_type', p_target);
END;
$$;

-- bop_handover_complete
CREATE OR REPLACE FUNCTION bop_handover_complete(
  p_handover_id uuid, p_signature jsonb DEFAULT NULL, p_signed_by text DEFAULT NULL, p_actor text DEFAULT 'system'
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_h sal_handovers%ROWTYPE;
  v_order_status text;
BEGIN
  PERFORM bop_set_rpc_context();
  SELECT * INTO v_h FROM sal_handovers WHERE id = p_handover_id FOR UPDATE;
  IF v_h IS NULL THEN RAISE EXCEPTION 'handover not found'; END IF;
  IF v_h.status NOT IN ('in_progress','executed') THEN RAISE EXCEPTION 'handover must be in_progress or executed'; END IF;

  -- Capture actual order status before changing it
  SELECT status INTO v_order_status FROM sal_orders WHERE id = v_h.order_id;

  UPDATE sal_handovers SET
    status = 'completed',
    signature = COALESCE(p_signature, signature),
    signed_by = COALESCE(p_signed_by, signed_by),
    completed_at = now(),
    updated_at = now()
  WHERE id = p_handover_id;

  UPDATE sal_orders SET status = 'delivered', updated_at = now() WHERE id = v_h.order_id;

  -- Release OLS lock if exists
  UPDATE bop_object_locks SET released_at = now() WHERE object_type = 'vehicle' AND object_id = v_h.vehicle_id AND released_at IS NULL;

  INSERT INTO bop_status_transitions (tenant_id, object_type, object_id, from_status, to_status, actor, reason)
  VALUES (v_h.tenant_id, 'handover', p_handover_id, v_h.status, 'completed', p_actor, 'Handover completed with signature');
  INSERT INTO bop_status_transitions (tenant_id, object_type, object_id, from_status, to_status, actor, reason)
  VALUES (v_h.tenant_id, 'order', v_h.order_id, v_order_status, 'delivered', p_actor, 'Handover completed');

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- bop_order_confirm
CREATE OR REPLACE FUNCTION bop_order_confirm(
  p_order_id uuid, p_actor text DEFAULT 'system'
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_o sal_orders%ROWTYPE;
  v_lock_id uuid;
  v_approval_id uuid;
BEGIN
  PERFORM bop_set_rpc_context();
  SELECT * INTO v_o FROM sal_orders WHERE id = p_order_id FOR UPDATE;
  IF v_o IS NULL THEN RAISE EXCEPTION 'order not found'; END IF;
  IF v_o.status <> 'draft' THEN RAISE EXCEPTION 'order must be in draft to confirm'; END IF;

  -- OLS lock on vehicle
  IF v_o.vehicle_id IS NOT NULL THEN
    INSERT INTO bop_object_locks (object_type, object_id, locked_by, expires_at)
    VALUES ('vehicle', v_o.vehicle_id, p_actor, now() + interval '30 days')
    RETURNING id INTO v_lock_id;
  END IF;

  UPDATE sal_orders SET status = 'confirmed', updated_at = now() WHERE id = p_order_id;

  -- Customer approval token
  INSERT INTO bop_customer_approvals (case_id, object_type, object_id, token, method, status, expires_at)
  VALUES (v_o.case_id, 'order', p_order_id, gen_random_uuid()::text, 'link', 'pending', now() + interval '7 days')
  RETURNING id INTO v_approval_id;

  INSERT INTO bop_status_transitions (tenant_id, object_type, object_id, from_status, to_status, actor, reason)
  VALUES (v_o.tenant_id, 'order', p_order_id, 'draft', 'confirmed', p_actor, 'Order confirmed');

  RETURN jsonb_build_object('ok', true, 'lock_id', v_lock_id, 'approval_id', v_approval_id);
END;
$$;

-- bop_order_cancel
CREATE OR REPLACE FUNCTION bop_order_cancel(
  p_order_id uuid, p_reason text DEFAULT NULL, p_actor text DEFAULT 'system'
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_o sal_orders%ROWTYPE;
BEGIN
  PERFORM bop_set_rpc_context();
  SELECT * INTO v_o FROM sal_orders WHERE id = p_order_id FOR UPDATE;
  IF v_o IS NULL THEN RAISE EXCEPTION 'order not found'; END IF;
  IF v_o.status IN ('delivered','completed','cancelled') THEN RAISE EXCEPTION 'order cannot be cancelled in % status', v_o.status; END IF;

  UPDATE sal_orders SET status = 'cancelled', cancel_reason = p_reason, updated_at = now() WHERE id = p_order_id;

  -- Release OLS lock
  IF v_o.vehicle_id IS NOT NULL THEN
    UPDATE bop_object_locks SET released_at = now() WHERE object_type = 'vehicle' AND object_id = v_o.vehicle_id AND released_at IS NULL;
  END IF;

  INSERT INTO bop_status_transitions (tenant_id, object_type, object_id, from_status, to_status, actor, reason)
  VALUES (v_o.tenant_id, 'order', p_order_id, v_o.status, 'cancelled', p_actor, COALESCE(p_reason, 'Order cancelled'));

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- bop_expire_warranties (already calls UPDATE on sal_warranties but no guard there yet — add it)
CREATE OR REPLACE FUNCTION bop_expire_warranties()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count integer;
BEGIN
  PERFORM bop_set_rpc_context();
  WITH expired AS (
    UPDATE sal_warranties
    SET status = 'expired', updated_at = now()
    WHERE status = 'active' AND expires_at < CURRENT_DATE
    RETURNING id
  )
  SELECT count(*) INTO v_count FROM expired;
  RETURN jsonb_build_object('expired_count', v_count);
END;
$$;

-- bop_create_warranty_from_handover (status change on sal_handovers)
CREATE OR REPLACE FUNCTION bop_create_warranty_from_handover(
  p_handover_id  uuid,
  p_warranty_type text DEFAULT 'standard',
  p_term_months  integer DEFAULT 6,
  p_actor        text DEFAULT 'system'
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_h        sal_handovers%ROWTYPE;
  v_wr_id    uuid;
BEGIN
  PERFORM bop_set_rpc_context();
  SELECT * INTO v_h FROM sal_handovers WHERE id = p_handover_id FOR UPDATE;
  IF v_h IS NULL THEN RAISE EXCEPTION 'handover not found'; END IF;
  IF v_h.status <> 'completed' THEN RAISE EXCEPTION 'handover must be completed'; END IF;

  INSERT INTO sal_warranties (
    tenant_id, order_id, handover_id, case_id, vehicle_id, partner_id,
    warranty_type, term_months, starts_at
  ) VALUES (
    v_h.tenant_id, v_h.order_id, p_handover_id, v_h.case_id, v_h.vehicle_id, v_h.partner_id,
    p_warranty_type, p_term_months, CURRENT_DATE
  ) RETURNING id INTO v_wr_id;

  UPDATE sal_handovers SET warranty_id = v_wr_id, updated_at = now() WHERE id = p_handover_id;

  INSERT INTO bop_doc_flow (case_id, src_object, src_id, tgt_object, tgt_id, relation)
  VALUES (v_h.case_id, 'handover', p_handover_id, 'warranty', v_wr_id, 'spawned');

  INSERT INTO bop_status_transitions (tenant_id, object_type, object_id, from_status, to_status, actor, reason)
  VALUES (v_h.tenant_id, 'warranty', v_wr_id, NULL, 'active', p_actor, 'Warranty created from handover');

  RETURN jsonb_build_object('warranty_id', v_wr_id);
END;
$$;

-- bop_submit_survey
CREATE OR REPLACE FUNCTION bop_submit_survey(
  p_survey_id      uuid,
  p_nps_score      integer,
  p_rating         integer,
  p_feedback       text DEFAULT NULL,
  p_would_recommend boolean DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_sv       sal_surveys%ROWTYPE;
  v_platform text;
  v_routed   boolean := false;
BEGIN
  PERFORM bop_set_rpc_context();
  SELECT * INTO v_sv FROM sal_surveys WHERE id = p_survey_id FOR UPDATE;
  IF v_sv IS NULL THEN RAISE EXCEPTION 'survey not found'; END IF;
  IF v_sv.status NOT IN ('scheduled','sent') THEN RAISE EXCEPTION 'survey not in submittable state'; END IF;

  UPDATE sal_surveys SET
    nps_score = p_nps_score, rating = p_rating, feedback = p_feedback,
    would_recommend = p_would_recommend, status = 'completed',
    completed_at = now(), updated_at = now()
  WHERE id = p_survey_id;

  IF p_nps_score >= 9 THEN
    v_platform := 'google'; v_routed := true;
    UPDATE sal_surveys SET review_routed = true, review_platform = v_platform WHERE id = p_survey_id;
  ELSIF p_nps_score <= 6 THEN
    UPDATE sal_surveys SET escalated = true,
      escalation_note = 'Low NPS score (' || p_nps_score || ') — requires follow-up'
    WHERE id = p_survey_id;
  END IF;

  INSERT INTO bop_status_transitions (tenant_id, object_type, object_id, from_status, to_status, actor, reason)
  VALUES (v_sv.tenant_id, 'survey', p_survey_id, v_sv.status, 'completed', 'customer',
    'NPS: ' || p_nps_score || ', Rating: ' || p_rating);

  RETURN jsonb_build_object('ok', true, 'nps_score', p_nps_score, 'review_routed', v_routed,
    'review_platform', v_platform, 'escalated', p_nps_score <= 6);
END;
$$;

-- bop_quotation_send
CREATE OR REPLACE FUNCTION bop_quotation_send(
  p_quotation_id uuid, p_actor text DEFAULT 'system'
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_q sal_quotations%ROWTYPE;
  v_approval_id uuid;
BEGIN
  PERFORM bop_set_rpc_context();
  SELECT * INTO v_q FROM sal_quotations WHERE id = p_quotation_id FOR UPDATE;
  IF v_q IS NULL THEN RAISE EXCEPTION 'quotation not found'; END IF;
  IF v_q.status <> 'draft' THEN RAISE EXCEPTION 'quotation must be draft to send'; END IF;

  UPDATE sal_quotations SET status = 'sent', sent_at = now(), updated_at = now() WHERE id = p_quotation_id;

  INSERT INTO bop_customer_approvals (case_id, object_type, object_id, token, method, status, expires_at)
  VALUES (v_q.case_id, 'quotation', p_quotation_id, gen_random_uuid()::text, 'link', 'pending', now() + interval '14 days')
  RETURNING id INTO v_approval_id;

  INSERT INTO bop_status_transitions (tenant_id, object_type, object_id, from_status, to_status, actor, reason)
  VALUES (v_q.tenant_id, 'quotation', p_quotation_id, 'draft', 'sent', p_actor, 'Quotation sent');

  RETURN jsonb_build_object('ok', true, 'approval_id', v_approval_id);
END;
$$;

-- bop_create_invoice_from_order
CREATE OR REPLACE FUNCTION bop_create_invoice_from_order(
  p_order_id uuid, p_invoice_kind text DEFAULT 'final', p_actor text DEFAULT 'system'
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_o sal_orders%ROWTYPE;
  v_inv_id uuid;
BEGIN
  PERFORM bop_set_rpc_context();
  SELECT * INTO v_o FROM sal_orders WHERE id = p_order_id;
  IF v_o IS NULL THEN RAISE EXCEPTION 'order not found'; END IF;

  INSERT INTO fin_invoices (case_id, order_id, partner_id, invoice_kind, btw_regime, status)
  VALUES (v_o.case_id, p_order_id, v_o.partner_id, p_invoice_kind, COALESCE(v_o.btw_regime, 'marge'), 'draft')
  RETURNING id INTO v_inv_id;

  INSERT INTO bop_doc_flow (case_id, src_object, src_id, tgt_object, tgt_id, relation)
  VALUES (v_o.case_id, 'order', p_order_id, 'invoice', v_inv_id, 'converted');

  INSERT INTO bop_status_transitions (tenant_id, object_type, object_id, from_status, to_status, actor, reason)
  VALUES (v_o.tenant_id, 'invoice', v_inv_id, NULL, 'draft', p_actor, 'Invoice created from order');

  RETURN jsonb_build_object('invoice_id', v_inv_id);
END;
$$;

-- bop_create_handover_from_order
CREATE OR REPLACE FUNCTION bop_create_handover_from_order(
  p_order_id uuid, p_scheduled_at timestamptz DEFAULT NULL, p_actor text DEFAULT 'system'
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_o sal_orders%ROWTYPE;
  v_h_id uuid;
BEGIN
  PERFORM bop_set_rpc_context();
  SELECT * INTO v_o FROM sal_orders WHERE id = p_order_id FOR UPDATE;
  IF v_o IS NULL THEN RAISE EXCEPTION 'order not found'; END IF;
  IF v_o.status NOT IN ('confirmed','customer_confirmed','in_preparation','ready') THEN
    RAISE EXCEPTION 'order not in handover-eligible status';
  END IF;

  INSERT INTO sal_handovers (
    tenant_id, order_id, case_id, vehicle_id, partner_id, status, scheduled_at
  ) VALUES (
    v_o.tenant_id, p_order_id, v_o.case_id, v_o.vehicle_id, v_o.partner_id,
    'scheduled', COALESCE(p_scheduled_at, now() + interval '3 days')
  ) RETURNING id INTO v_h_id;

  UPDATE sal_orders SET status = 'handover_scheduled', updated_at = now() WHERE id = p_order_id;

  INSERT INTO bop_doc_flow (case_id, src_object, src_id, tgt_object, tgt_id, relation)
  VALUES (v_o.case_id, 'order', p_order_id, 'handover', v_h_id, 'converted');

  INSERT INTO bop_status_transitions (tenant_id, object_type, object_id, from_status, to_status, actor, reason)
  VALUES (v_o.tenant_id, 'order', p_order_id, v_o.status, 'handover_scheduled', p_actor, 'Handover scheduled');

  RETURN jsonb_build_object('handover_id', v_h_id);
END;
$$;

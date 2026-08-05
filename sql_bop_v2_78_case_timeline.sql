-- ============================================================
-- P7  Case Timeline + Derived Statuses + Guard Rails
-- Migration: sql_bop_v2_78_case_timeline.sql
-- ============================================================

-- ── 1. Derived function: case_stage ──
-- Returns the highest document type reached in this case's doc_flow

CREATE OR REPLACE FUNCTION case_stage(p_case_id uuid)
RETURNS text LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_stage text := 'lead';
  v_has_quote boolean;
  v_has_order boolean;
  v_has_invoice boolean;
  v_has_handover boolean;
  v_has_warranty boolean;
  v_order_status text;
BEGIN
  SELECT EXISTS(SELECT 1 FROM sal_quotations WHERE case_id = p_case_id AND status NOT IN ('cancelled'))
    INTO v_has_quote;
  SELECT EXISTS(SELECT 1 FROM sal_orders WHERE case_id = p_case_id AND status NOT IN ('cancelled'))
    INTO v_has_order;
  SELECT EXISTS(SELECT 1 FROM fin_invoices WHERE case_id = p_case_id AND status NOT IN ('cancelled','credited'))
    INTO v_has_invoice;
  SELECT EXISTS(SELECT 1 FROM sal_handovers WHERE case_id = p_case_id AND status NOT IN ('cancelled'))
    INTO v_has_handover;
  SELECT EXISTS(SELECT 1 FROM sal_warranties WHERE case_id = p_case_id AND status NOT IN ('voided'))
    INTO v_has_warranty;

  IF v_has_warranty THEN v_stage := 'warranty';
  ELSIF v_has_handover THEN
    SELECT status INTO v_order_status FROM sal_orders WHERE case_id = p_case_id AND status NOT IN ('cancelled') ORDER BY updated_at DESC LIMIT 1;
    IF v_order_status IN ('delivered','completed') THEN v_stage := 'delivered';
    ELSE v_stage := 'handover';
    END IF;
  ELSIF v_has_invoice THEN v_stage := 'invoiced';
  ELSIF v_has_order THEN v_stage := 'order';
  ELSIF v_has_quote THEN v_stage := 'quotation';
  END IF;

  RETURN v_stage;
END;
$$;

-- ── 2. Derived function: vehicle_availability ──

CREATE OR REPLACE FUNCTION vehicle_availability(p_vehicle_id uuid)
RETURNS text LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_locked boolean;
  v_delivered boolean;
BEGIN
  IF p_vehicle_id IS NULL THEN RETURN 'unknown'; END IF;

  SELECT EXISTS(
    SELECT 1 FROM bop_object_locks
    WHERE object_type = 'vehicle' AND object_id = p_vehicle_id AND released_at IS NULL
  ) INTO v_locked;

  SELECT EXISTS(
    SELECT 1 FROM sal_orders
    WHERE vehicle_id = p_vehicle_id AND status IN ('delivered','completed')
  ) INTO v_delivered;

  IF v_delivered THEN RETURN 'sold';
  ELSIF v_locked THEN RETURN 'reserved';
  ELSE RETURN 'available';
  END IF;
END;
$$;

-- ── 3. Case timeline view ──
-- Unified timeline: doc_flow + status_transitions + approvals + activities

CREATE OR REPLACE VIEW bop_case_timeline AS
  SELECT
    df.case_id,
    df.created_at AS event_at,
    'doc_flow' AS event_type,
    df.relation AS event_action,
    df.src_object || ' → ' || df.tgt_object AS event_detail,
    df.src_id AS ref_id,
    NULL AS actor
  FROM bop_doc_flow df
  WHERE df.case_id IS NOT NULL

  UNION ALL

  SELECT
    CASE st.object_type
      WHEN 'order'     THEN (SELECT case_id FROM sal_orders WHERE id = st.object_id)
      WHEN 'quotation' THEN (SELECT case_id FROM sal_quotations WHERE id = st.object_id)
      WHEN 'lead'      THEN (SELECT converted_case_id FROM crm_leads WHERE id = st.object_id)
      WHEN 'invoice'   THEN (SELECT case_id FROM fin_invoices WHERE id = st.object_id)
      WHEN 'handover'  THEN (SELECT case_id FROM sal_handovers WHERE id = st.object_id)
      WHEN 'warranty'  THEN (SELECT case_id FROM sal_warranties WHERE id = st.object_id)
      WHEN 'survey'    THEN (SELECT case_id FROM sal_surveys WHERE id = st.object_id)
    END AS case_id,
    st.created_at AS event_at,
    'transition' AS event_type,
    st.from_status || ' → ' || st.to_status AS event_action,
    st.object_type AS event_detail,
    st.object_id AS ref_id,
    st.actor
  FROM bop_status_transitions st
  WHERE st.object_type IN ('lead','quotation','order','invoice','handover','warranty','survey')

  UNION ALL

  SELECT
    ca.case_id,
    COALESCE(ca.responded_at, ca.created_at) AS event_at,
    'approval' AS event_type,
    ca.status AS event_action,
    ca.object_type || ':' || ca.method AS event_detail,
    ca.object_id::uuid AS ref_id,
    NULL AS actor
  FROM bop_customer_approvals ca
  WHERE ca.case_id IS NOT NULL;

-- ── 4. Case documents aggregate function ──

CREATE OR REPLACE FUNCTION case_documents(p_case_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_result jsonb := '[]'::jsonb;
  v_row jsonb;
BEGIN
  -- Leads
  FOR v_row IN
    SELECT jsonb_build_object('type','lead','id',l.id,'ref',l.ref_code,'status',l.stage,'updated_at',l.updated_at)
    FROM crm_leads l WHERE l.converted_case_id = p_case_id
  LOOP v_result := v_result || v_row; END LOOP;

  -- Quotations
  FOR v_row IN
    SELECT jsonb_build_object('type','quotation','id',q.id,'ref',q.quote_number,'status',q.status,'updated_at',q.updated_at,'version',q.version)
    FROM sal_quotations q WHERE q.case_id = p_case_id ORDER BY q.version DESC
  LOOP v_result := v_result || v_row; END LOOP;

  -- Orders
  FOR v_row IN
    SELECT jsonb_build_object('type','order','id',o.id,'ref',o.order_number,'status',o.status,'updated_at',o.updated_at)
    FROM sal_orders o WHERE o.case_id = p_case_id ORDER BY o.created_at DESC
  LOOP v_result := v_result || v_row; END LOOP;

  -- Invoices
  FOR v_row IN
    SELECT jsonb_build_object('type','invoice','id',i.id,'ref',i.invoice_number,'status',i.status,'kind',i.invoice_kind,'updated_at',i.updated_at)
    FROM fin_invoices i WHERE i.case_id = p_case_id ORDER BY i.created_at DESC
  LOOP v_result := v_result || v_row; END LOOP;

  -- Handovers
  FOR v_row IN
    SELECT jsonb_build_object('type','handover','id',h.id,'ref',h.handover_number,'status',h.status,'updated_at',h.updated_at)
    FROM sal_handovers h WHERE h.case_id = p_case_id ORDER BY h.created_at DESC
  LOOP v_result := v_result || v_row; END LOOP;

  -- Warranties
  FOR v_row IN
    SELECT jsonb_build_object('type','warranty','id',w.id,'ref',w.warranty_number,'status',w.status,'expires_at',w.expires_at,'updated_at',w.updated_at)
    FROM sal_warranties w WHERE w.case_id = p_case_id ORDER BY w.created_at DESC
  LOOP v_result := v_result || v_row; END LOOP;

  -- Surveys
  FOR v_row IN
    SELECT jsonb_build_object('type','survey','id',s.id,'ref',s.survey_number,'status',s.status,'nps_score',s.nps_score,'updated_at',s.updated_at)
    FROM sal_surveys s WHERE s.case_id = p_case_id ORDER BY s.created_at DESC
  LOOP v_result := v_result || v_row; END LOOP;

  RETURN v_result;
END;
$$;

-- ── 5. Guard trigger: block direct status UPDATEs outside RPCs ──
-- RPCs set app.rpc_context = 'true' before updating; the trigger checks for it.

CREATE OR REPLACE FUNCTION bop_guard_status_update()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF current_setting('app.rpc_context', true) IS DISTINCT FROM 'true' THEN
      RAISE EXCEPTION 'Direct status UPDATE blocked on %. Use the appropriate RPC.', TG_TABLE_NAME;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Separate guard for crm_leads which uses "stage" instead of "status"
CREATE OR REPLACE FUNCTION bop_guard_stage_update()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.stage IS DISTINCT FROM NEW.stage THEN
    IF current_setting('app.rpc_context', true) IS DISTINCT FROM 'true' THEN
      RAISE EXCEPTION 'Direct stage UPDATE blocked on %. Use the appropriate RPC.', TG_TABLE_NAME;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Apply guard to all TFE tables
DO $guard$ BEGIN
  DROP TRIGGER IF EXISTS trg_guard_status_leads ON crm_leads;
  CREATE TRIGGER trg_guard_status_leads BEFORE UPDATE ON crm_leads
    FOR EACH ROW EXECUTE FUNCTION bop_guard_stage_update();

  DROP TRIGGER IF EXISTS trg_guard_status_quotations ON sal_quotations;
  CREATE TRIGGER trg_guard_status_quotations BEFORE UPDATE ON sal_quotations
    FOR EACH ROW EXECUTE FUNCTION bop_guard_status_update();

  DROP TRIGGER IF EXISTS trg_guard_status_orders ON sal_orders;
  CREATE TRIGGER trg_guard_status_orders BEFORE UPDATE ON sal_orders
    FOR EACH ROW EXECUTE FUNCTION bop_guard_status_update();

  DROP TRIGGER IF EXISTS trg_guard_status_invoices ON fin_invoices;
  CREATE TRIGGER trg_guard_status_invoices BEFORE UPDATE ON fin_invoices
    FOR EACH ROW EXECUTE FUNCTION bop_guard_status_update();

  DROP TRIGGER IF EXISTS trg_guard_status_handovers ON sal_handovers;
  CREATE TRIGGER trg_guard_status_handovers BEFORE UPDATE ON sal_handovers
    FOR EACH ROW EXECUTE FUNCTION bop_guard_status_update();

  DROP TRIGGER IF EXISTS trg_guard_status_warranties ON sal_warranties;
  CREATE TRIGGER trg_guard_status_warranties BEFORE UPDATE ON sal_warranties
    FOR EACH ROW EXECUTE FUNCTION bop_guard_status_update();

  DROP TRIGGER IF EXISTS trg_guard_status_surveys ON sal_surveys;
  CREATE TRIGGER trg_guard_status_surveys BEFORE UPDATE ON sal_surveys
    FOR EACH ROW EXECUTE FUNCTION bop_guard_status_update();
END $guard$;

-- ── 6. Update existing RPCs to set guard context ──
-- Wrap all status-changing RPCs to set the GUC flag

CREATE OR REPLACE FUNCTION bop_set_rpc_context()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('app.rpc_context', 'true', true);
END;
$$;

-- ── 7. Doc-flow integrity check function ──

CREATE OR REPLACE FUNCTION bop_check_doc_flow_integrity()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_orphans jsonb := '[]'::jsonb;
  v_row jsonb;
BEGIN
  -- Orders without doc_flow link to their case
  FOR v_row IN
    SELECT jsonb_build_object('type','order','id',o.id,'ref',o.order_number,'case_id',o.case_id)
    FROM sal_orders o
    WHERE o.case_id IS NOT NULL
      AND NOT EXISTS(
        SELECT 1 FROM bop_doc_flow df
        WHERE df.case_id = o.case_id
          AND ((df.tgt_object = 'order' AND df.tgt_id = o.id)
            OR (df.src_object = 'order' AND df.src_id = o.id))
      )
  LOOP v_orphans := v_orphans || v_row; END LOOP;

  -- Invoices without doc_flow
  FOR v_row IN
    SELECT jsonb_build_object('type','invoice','id',i.id,'ref',i.invoice_number,'case_id',i.case_id)
    FROM fin_invoices i
    WHERE i.case_id IS NOT NULL
      AND NOT EXISTS(
        SELECT 1 FROM bop_doc_flow df
        WHERE df.case_id = i.case_id
          AND ((df.tgt_object = 'invoice' AND df.tgt_id = i.id)
            OR (df.src_object = 'invoice' AND df.src_id = i.id))
      )
  LOOP v_orphans := v_orphans || v_row; END LOOP;

  -- Handovers without doc_flow
  FOR v_row IN
    SELECT jsonb_build_object('type','handover','id',h.id,'ref',h.handover_number,'case_id',h.case_id)
    FROM sal_handovers h
    WHERE h.case_id IS NOT NULL
      AND NOT EXISTS(
        SELECT 1 FROM bop_doc_flow df
        WHERE df.case_id = h.case_id
          AND ((df.tgt_object = 'handover' AND df.tgt_id = h.id)
            OR (df.src_object = 'handover' AND df.src_id = h.id))
      )
  LOOP v_orphans := v_orphans || v_row; END LOOP;

  RETURN jsonb_build_object('orphan_count', jsonb_array_length(v_orphans), 'orphans', v_orphans);
END;
$$;

-- ── 8. Register objects ──

INSERT INTO bop_objects (object_id, type, module, name, route, status, lifecycle_state)
VALUES
  ('api:case_stage',                 'api', 'SAL', 'Derived Case Stage',          NULL, 'active', 'active'),
  ('api:vehicle_availability',       'api', 'SAL', 'Derived Vehicle Availability', NULL, 'active', 'active'),
  ('api:case_documents',             'api', 'SAL', 'Case Documents Aggregate',    NULL, 'active', 'active'),
  ('api:bop_check_doc_flow_integrity','api', 'SAL', 'Doc-Flow Integrity Check',   NULL, 'active', 'active'),
  ('api:bop_guard_status_update',    'api', 'SYS', 'Status Guard Trigger',        NULL, 'active', 'active'),
  ('screen:TR000',                   'screen','SAL','Cases',                       '/console/sal/cases','active','active'),
  ('screen:TR001',                   'screen','SAL','Case Detail',                 '/console/sal/cases/[id]','active','active'),
  ('api:sal/cases:GET',              'api',  'SAL', 'GET Cases',                   '/api/bop/sal/cases','active','active'),
  ('api:sal/cases/[id]:GET',         'api',  'SAL', 'GET Case Detail',             '/api/bop/sal/cases/[id]','active','active'),
  ('api:sal/cases/[id]/timeline:GET','api',  'SAL', 'GET Case Timeline',           '/api/bop/sal/cases/[id]/timeline','active','active'),
  ('api:sal/cases/[id]/documents:GET','api', 'SAL', 'GET Case Documents',          '/api/bop/sal/cases/[id]/documents','active','active'),
  ('api:sys/integrity:GET',          'api',  'SYS', 'Doc-Flow Integrity API',      '/api/bop/sys/integrity','active','active')
ON CONFLICT (object_id) DO NOTHING;

-- ── 9. Register case screens in bop_screens for nav ──

INSERT INTO bop_screens (screen_id, route, title, nav_group, nav_subgroup, nav_order, nav_visible, module_code, status)
VALUES
  ('TR000', '/console/sal/cases',      'Cases',       'Sales', NULL, 25, true, 'SAL', 'active'),
  ('TR001', '/console/sal/cases/[id]', 'Case Detail', 'Sales', NULL, 26, false, 'SAL', 'active')
ON CONFLICT (screen_id) DO NOTHING;

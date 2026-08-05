-- ============================================================
-- P6  Post-Sale: Warranty + Survey + NPS + Review Routing
-- Migration: sql_bop_v2_77_post_sale.sql
-- ============================================================

-- ── 1. CREATE sal_warranties ──

CREATE TABLE IF NOT EXISTS sal_warranties (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       uuid DEFAULT current_setting('app.tenant_id', true)::uuid,
  warranty_number text,
  order_id        uuid REFERENCES sal_orders(id),
  handover_id     uuid REFERENCES sal_handovers(id),
  case_id         uuid REFERENCES bop_cases(id),
  vehicle_id      uuid,
  partner_id      uuid REFERENCES mdm_business_partners(id),
  status          text DEFAULT 'active' NOT NULL,
  warranty_type   text DEFAULT 'standard' NOT NULL,
  starts_at       date NOT NULL DEFAULT CURRENT_DATE,
  term_months     integer DEFAULT 6 NOT NULL,
  expires_at      date,
  coverage_notes  text,
  -- Claims
  claim_count     integer DEFAULT 0,
  last_claim_at   timestamptz,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- ── 1b. Compute expires_at trigger ──

CREATE OR REPLACE FUNCTION sal_warranty_expires_trigger()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.expires_at := NEW.starts_at + (NEW.term_months || ' months')::interval;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sal_warranty_expires ON sal_warranties;
CREATE TRIGGER trg_sal_warranty_expires
  BEFORE INSERT OR UPDATE OF starts_at, term_months ON sal_warranties
  FOR EACH ROW EXECUTE FUNCTION sal_warranty_expires_trigger();

-- ── 2. Status + type constraints ──

ALTER TABLE sal_warranties DROP CONSTRAINT IF EXISTS sal_warranties_status_check;
ALTER TABLE sal_warranties ADD CONSTRAINT sal_warranties_status_check
  CHECK (status IN ('active','claimed','expired','voided'));

ALTER TABLE sal_warranties DROP CONSTRAINT IF EXISTS sal_warranties_type_check;
ALTER TABLE sal_warranties ADD CONSTRAINT sal_warranties_type_check
  CHECK (warranty_type IN ('standard','extended','powertrain','full'));

-- ── 3. Warranty auto-number trigger ──

CREATE OR REPLACE FUNCTION sal_warranty_number_trigger()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_prefix text;
  v_count  bigint;
BEGIN
  IF NEW.warranty_number IS NULL THEN
    v_prefix := 'WR-' || to_char(now(), 'YYYYMM');
    SELECT count(*) INTO v_count FROM sal_warranties WHERE warranty_number LIKE v_prefix || '%';
    NEW.warranty_number := v_prefix || '-' || lpad((v_count + 1)::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sal_warranty_number ON sal_warranties;
CREATE TRIGGER trg_sal_warranty_number
  BEFORE INSERT ON sal_warranties
  FOR EACH ROW EXECUTE FUNCTION sal_warranty_number_trigger();

-- ── 4. Warranty claims table ──

CREATE TABLE IF NOT EXISTS sal_warranty_claims (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       uuid DEFAULT current_setting('app.tenant_id', true)::uuid,
  warranty_id     uuid NOT NULL REFERENCES sal_warranties(id),
  claim_number    text,
  status          text DEFAULT 'submitted' NOT NULL,
  description     text NOT NULL,
  resolution      text,
  cost_estimate   numeric(12,2),
  cost_actual     numeric(12,2),
  submitted_at    timestamptz DEFAULT now(),
  resolved_at     timestamptz,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE sal_warranty_claims DROP CONSTRAINT IF EXISTS sal_warranty_claims_status_check;
ALTER TABLE sal_warranty_claims ADD CONSTRAINT sal_warranty_claims_status_check
  CHECK (status IN ('submitted','under_review','approved','rejected','resolved'));

-- ── 5. Claim auto-number trigger ──

CREATE OR REPLACE FUNCTION sal_claim_number_trigger()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_prefix text;
  v_count  bigint;
BEGIN
  IF NEW.claim_number IS NULL THEN
    v_prefix := 'CL-' || to_char(now(), 'YYYYMM');
    SELECT count(*) INTO v_count FROM sal_warranty_claims WHERE claim_number LIKE v_prefix || '%';
    NEW.claim_number := v_prefix || '-' || lpad((v_count + 1)::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sal_claim_number ON sal_warranty_claims;
CREATE TRIGGER trg_sal_claim_number
  BEFORE INSERT ON sal_warranty_claims
  FOR EACH ROW EXECUTE FUNCTION sal_claim_number_trigger();

-- ── 6. CREATE sal_surveys ──

CREATE TABLE IF NOT EXISTS sal_surveys (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       uuid DEFAULT current_setting('app.tenant_id', true)::uuid,
  survey_number   text,
  order_id        uuid REFERENCES sal_orders(id),
  handover_id     uuid REFERENCES sal_handovers(id),
  case_id         uuid REFERENCES bop_cases(id),
  partner_id      uuid REFERENCES mdm_business_partners(id),
  status          text DEFAULT 'scheduled' NOT NULL,
  -- Schedule
  scheduled_at    timestamptz,
  sent_at         timestamptz,
  completed_at    timestamptz,
  -- NPS
  nps_score       integer,
  -- Satisfaction
  rating          integer,
  feedback        text,
  would_recommend boolean,
  -- Review routing
  review_routed   boolean DEFAULT false,
  review_platform text,
  review_url      text,
  -- Internal escalation
  escalated       boolean DEFAULT false,
  escalation_note text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE sal_surveys DROP CONSTRAINT IF EXISTS sal_surveys_status_check;
ALTER TABLE sal_surveys ADD CONSTRAINT sal_surveys_status_check
  CHECK (status IN ('scheduled','sent','completed','expired','skipped'));

ALTER TABLE sal_surveys DROP CONSTRAINT IF EXISTS sal_surveys_nps_check;
ALTER TABLE sal_surveys ADD CONSTRAINT sal_surveys_nps_check
  CHECK (nps_score IS NULL OR (nps_score >= 0 AND nps_score <= 10));

ALTER TABLE sal_surveys DROP CONSTRAINT IF EXISTS sal_surveys_rating_check;
ALTER TABLE sal_surveys ADD CONSTRAINT sal_surveys_rating_check
  CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5));

-- ── 7. Survey auto-number trigger ──

CREATE OR REPLACE FUNCTION sal_survey_number_trigger()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_prefix text;
  v_count  bigint;
BEGIN
  IF NEW.survey_number IS NULL THEN
    v_prefix := 'SV-' || to_char(now(), 'YYYYMM');
    SELECT count(*) INTO v_count FROM sal_surveys WHERE survey_number LIKE v_prefix || '%';
    NEW.survey_number := v_prefix || '-' || lpad((v_count + 1)::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sal_survey_number ON sal_surveys;
CREATE TRIGGER trg_sal_survey_number
  BEFORE INSERT ON sal_surveys
  FOR EACH ROW EXECUTE FUNCTION sal_survey_number_trigger();

-- ── 8. RPC: bop_create_warranty_from_handover ──

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
  SELECT * INTO v_h FROM sal_handovers WHERE id = p_handover_id;
  IF v_h IS NULL THEN RAISE EXCEPTION 'handover not found'; END IF;
  IF v_h.status <> 'completed' THEN RAISE EXCEPTION 'handover must be completed'; END IF;

  INSERT INTO sal_warranties (
    tenant_id, order_id, handover_id, case_id, vehicle_id, partner_id,
    warranty_type, term_months, starts_at
  ) VALUES (
    v_h.tenant_id, v_h.order_id, p_handover_id, v_h.case_id, v_h.vehicle_id, v_h.partner_id,
    p_warranty_type, p_term_months, CURRENT_DATE
  ) RETURNING id INTO v_wr_id;

  -- Link handover to warranty
  UPDATE sal_handovers SET warranty_id = v_wr_id, updated_at = now() WHERE id = p_handover_id;

  -- Doc flow
  INSERT INTO bop_doc_flow (source_type, source_id, target_type, target_id, relation)
  VALUES ('handover', p_handover_id, 'warranty', v_wr_id, 'spawned');

  INSERT INTO bop_status_transitions (entity_type, entity_id, from_status, to_status, changed_by, reason)
  VALUES ('warranty', v_wr_id, NULL, 'active', p_actor, 'Warranty created from handover');

  RETURN jsonb_build_object('warranty_id', v_wr_id);
END;
$$;

-- ── 9. RPC: bop_schedule_survey ──

CREATE OR REPLACE FUNCTION bop_schedule_survey(
  p_handover_id  uuid,
  p_delay_days   integer DEFAULT 7,
  p_actor        text DEFAULT 'system'
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_h        sal_handovers%ROWTYPE;
  v_sv_id    uuid;
BEGIN
  SELECT * INTO v_h FROM sal_handovers WHERE id = p_handover_id;
  IF v_h IS NULL THEN RAISE EXCEPTION 'handover not found'; END IF;
  IF v_h.status <> 'completed' THEN RAISE EXCEPTION 'handover must be completed'; END IF;

  -- Check for existing survey
  IF EXISTS(SELECT 1 FROM sal_surveys WHERE handover_id = p_handover_id AND status NOT IN ('expired','skipped')) THEN
    RAISE EXCEPTION 'survey already exists for this handover';
  END IF;

  INSERT INTO sal_surveys (
    tenant_id, order_id, handover_id, case_id, partner_id,
    status, scheduled_at
  ) VALUES (
    v_h.tenant_id, v_h.order_id, p_handover_id, v_h.case_id, v_h.partner_id,
    'scheduled', now() + (p_delay_days || ' days')::interval
  ) RETURNING id INTO v_sv_id;

  -- Link handover to survey
  UPDATE sal_handovers SET survey_id = v_sv_id, updated_at = now() WHERE id = p_handover_id;

  INSERT INTO bop_doc_flow (source_type, source_id, target_type, target_id, relation)
  VALUES ('handover', p_handover_id, 'survey', v_sv_id, 'spawned');

  RETURN jsonb_build_object('survey_id', v_sv_id);
END;
$$;

-- ── 10. RPC: bop_submit_survey ──

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
  SELECT * INTO v_sv FROM sal_surveys WHERE id = p_survey_id FOR UPDATE;
  IF v_sv IS NULL THEN RAISE EXCEPTION 'survey not found'; END IF;
  IF v_sv.status NOT IN ('scheduled','sent') THEN RAISE EXCEPTION 'survey not in submittable state'; END IF;

  UPDATE sal_surveys SET
    nps_score = p_nps_score,
    rating = p_rating,
    feedback = p_feedback,
    would_recommend = p_would_recommend,
    status = 'completed',
    completed_at = now(),
    updated_at = now()
  WHERE id = p_survey_id;

  -- Smart review routing
  IF p_nps_score >= 9 THEN
    v_platform := 'google';
    v_routed := true;
    UPDATE sal_surveys SET
      review_routed = true,
      review_platform = v_platform
    WHERE id = p_survey_id;
  ELSIF p_nps_score <= 6 THEN
    UPDATE sal_surveys SET
      escalated = true,
      escalation_note = 'Low NPS score (' || p_nps_score || ') — requires follow-up'
    WHERE id = p_survey_id;
  END IF;

  INSERT INTO bop_status_transitions (entity_type, entity_id, from_status, to_status, changed_by, reason)
  VALUES ('survey', p_survey_id, v_sv.status, 'completed', 'customer',
    'NPS: ' || p_nps_score || ', Rating: ' || p_rating);

  RETURN jsonb_build_object(
    'ok', true,
    'nps_score', p_nps_score,
    'review_routed', v_routed,
    'review_platform', v_platform,
    'escalated', p_nps_score <= 6
  );
END;
$$;

-- ── 11. RPC: bop_expire_warranties ──
-- Called by daily cron

CREATE OR REPLACE FUNCTION bop_expire_warranties()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count integer;
BEGIN
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

-- ── 12. Register objects ──

INSERT INTO bop_objects (object_id, type, module, name, route, status, lifecycle_state)
VALUES
  ('table:sal_warranties',                'table', 'SAL', 'Warranties',                  NULL, 'active', 'active'),
  ('table:sal_warranty_claims',           'table', 'SAL', 'Warranty Claims',             NULL, 'active', 'active'),
  ('table:sal_surveys',                   'table', 'SAL', 'Surveys',                     NULL, 'active', 'active'),
  ('api:bop_create_warranty_from_handover','api',  'SAL', 'Create Warranty from Handover',NULL, 'active', 'active'),
  ('api:bop_schedule_survey',             'api',   'SAL', 'Schedule Survey',              NULL, 'active', 'active'),
  ('api:bop_submit_survey',               'api',   'SAL', 'Submit Survey',                NULL, 'active', 'active'),
  ('api:bop_expire_warranties',           'api',   'SAL', 'Expire Warranties (cron)',     NULL, 'active', 'active')
ON CONFLICT (object_id) DO NOTHING;

-- ── 13. Register counters ──

INSERT INTO bop_counter (object_name, short_code, counter)
VALUES
  ('sal_warranties', 'WR', 0),
  ('sal_warranty_claims', 'CL', 0),
  ('sal_surveys', 'SV', 0)
ON CONFLICT (object_name) DO NOTHING;

-- ── 14. RLS policies ──

DO $$ BEGIN
  EXECUTE 'ALTER TABLE sal_warranties ENABLE ROW LEVEL SECURITY';
  CREATE POLICY sal_warranties_tenant ON sal_warranties
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'ALTER TABLE sal_warranty_claims ENABLE ROW LEVEL SECURITY';
  CREATE POLICY sal_warranty_claims_tenant ON sal_warranty_claims
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'ALTER TABLE sal_surveys ENABLE ROW LEVEL SECURITY';
  CREATE POLICY sal_surveys_tenant ON sal_surveys
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

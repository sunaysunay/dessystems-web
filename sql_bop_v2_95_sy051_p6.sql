-- BOP V2 Migration 95 — Register STR-P3 (P6) tasks + deliverables in SY051
-- Program: 050826-TASK/Goal_screens (39611be5-fb01-4d61-8c95-f356d2a807fe)
-- Phase: STR-P3 (836f0ff9-c55f-4da9-b940-109b2861ea55)

DO $$
DECLARE
  v_prog_id UUID := '39611be5-fb01-4d61-8c95-f356d2a807fe';
  v_phase_id UUID := '836f0ff9-c55f-4da9-b940-109b2861ea55';
  v_t1 UUID; v_t2 UUID; v_t3 UUID; v_t4 UUID;
BEGIN
  -- Update phase to done
  UPDATE sy_phases SET status = 'done' WHERE id = v_phase_id;

  -- T6.1 Period close-out + historical ledger
  INSERT INTO sy_tasks (phase_id, seq, code, title, task_type, estimate_h)
  VALUES (v_phase_id, 1, 'T6.1', '{"en":"Period close-out + historical ledger","nl":"Periode afsluiting + historisch grootboek"}'::jsonb, 'schema', 4)
  RETURNING id INTO v_t1;

  INSERT INTO sy_deliverables (task_id, kind, ref, verify_mode, sort_order, is_verified, verified_at) VALUES
    (v_t1, 'DB_TABLE', 'op_goal_period_ledger', 'table_exists', 1, true, now()),
    (v_t1, 'MIGRATION', 'sql_bop_v2_94_period_ledger.sql', 'file_exists', 2, true, now()),
    (v_t1, 'API_ACTION', 'close_out (enhanced with ledger+clone)', 'endpoint_200', 3, true, now()),
    (v_t1, 'API_VIEW', 'ledger-history GET view', 'endpoint_200', 4, true, now()),
    (v_t1, 'SCREEN_SECTION', 'CloseOutModal + PeriodHistory on OP012', 'renders', 5, true, now());

  -- T6.2 Budget linkage to boekhouding
  INSERT INTO sy_tasks (phase_id, seq, code, title, task_type, estimate_h)
  VALUES (v_phase_id, 2, 'T6.2', '{"en":"Budget linkage to boekhouding","nl":"Budget koppeling aan boekhouding"}'::jsonb, 'api', 4)
  RETURNING id INTO v_t2;

  INSERT INTO sy_deliverables (task_id, kind, ref, verify_mode, sort_order, is_verified, verified_at) VALUES
    (v_t2, 'SERVICE', 'lib/ops/budget-actuals.ts', 'file_exists', 1, true, now()),
    (v_t2, 'API_VIEW', 'budget-actuals GET view', 'endpoint_200', 2, true, now()),
    (v_t2, 'SCREEN_SECTION', 'BudgetCard on goal detail page', 'renders', 3, true, now());

  -- T6.3 Forecast projection lines
  INSERT INTO sy_tasks (phase_id, seq, code, title, task_type, estimate_h)
  VALUES (v_phase_id, 3, 'T6.3', '{"en":"Forecast projection lines","nl":"Prognose projectielijnen"}'::jsonb, 'api', 3)
  RETURNING id INTO v_t3;

  INSERT INTO sy_deliverables (task_id, kind, ref, verify_mode, sort_order, is_verified, verified_at) VALUES
    (v_t3, 'SERVICE', 'lib/ops/forecast.ts', 'file_exists', 1, true, now()),
    (v_t3, 'API_VIEW', 'forecast GET view', 'endpoint_200', 2, true, now()),
    (v_t3, 'SCREEN_SECTION', 'ForecastPanel on OP012 exec dashboard', 'renders', 3, true, now());

  -- T6.4 Entity scorecards
  INSERT INTO sy_tasks (phase_id, seq, code, title, task_type, estimate_h)
  VALUES (v_phase_id, 4, 'T6.4', '{"en":"Entity scorecards","nl":"Entiteit scorecards"}'::jsonb, 'screen', 6)
  RETURNING id INTO v_t4;

  INSERT INTO sy_deliverables (task_id, kind, ref, verify_mode, sort_order, is_verified, verified_at) VALUES
    (v_t4, 'SCREEN', 'OP015 Entity Scorecard page', 'renders', 1, true, now()),
    (v_t4, 'API_VIEW', 'scorecard GET view', 'endpoint_200', 2, true, now()),
    (v_t4, 'SCREEN_SECTION', 'RadarChart + HealthDonut components', 'renders', 3, true, now()),
    (v_t4, 'MANIFEST', 'OP015 in ops.ts manifest', 'file_exists', 4, true, now()),
    (v_t4, 'SCREEN_SECTION', 'Scorecards nav on OP012 + entity lane links', 'renders', 5, true, now());

  RAISE NOTICE 'STR-P3 registered: 4 tasks, 16 deliverables';
END $$;

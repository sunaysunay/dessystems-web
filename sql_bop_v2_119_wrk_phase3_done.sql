-- BOP V2 Migration 119 — WRK Phase 3 (Autoflex DMS) completion
-- Updates SY051 WRK-IMPL program: marks Phase 3 done
-- Registers WRK business process objects for SY035 Flow Map

BEGIN;

-- ── Part A: SY051 Phase 3 completion ────────────────────────────────
DO $$
DECLARE
  v_prog_id  UUID;
  v_phase_id UUID;
BEGIN
  -- Find WRK-IMPL program
  SELECT id INTO v_prog_id
  FROM sy_programs
  WHERE code::text ILIKE '%WRK%'
     OR code::text ILIKE '%WRK-IMPL%'
  ORDER BY
    CASE WHEN code::text ILIKE '%WRK-IMPL%' THEN 0 ELSE 1 END
  LIMIT 1;

  IF v_prog_id IS NULL THEN
    SELECT id INTO v_prog_id
    FROM sy_programs
    WHERE title::text ILIKE '%Workshop%'
    LIMIT 1;
  END IF;

  IF v_prog_id IS NULL THEN
    RAISE NOTICE 'WRK-IMPL program not found — skipping SY051 updates';
    RETURN;
  END IF;

  RAISE NOTICE 'Found WRK-IMPL program: %', v_prog_id;

  -- 1. Find and mark Phase 3 as done
  SELECT id INTO v_phase_id
  FROM sy_phases
  WHERE program_id = v_prog_id
  AND (code::text ILIKE '%phase-3%' OR code::text ILIKE '%P3%' OR title::text ILIKE '%Autoflex%')
  LIMIT 1;

  IF v_phase_id IS NOT NULL THEN
    UPDATE sy_phases
    SET status = 'done',
        status_note = 'Phase 3 Autoflex DMS Integration complete — WK013 screen, autoflex client library, sync APIs, field mapping, 3 DB tables',
        updated_at = NOW()
    WHERE id = v_phase_id;

    -- 2. Mark Phase 3 deliverables as verified
    UPDATE sy_deliverables
    SET is_verified = true,
        verified_at = NOW(),
        updated_at = NOW()
    WHERE task_id IN (SELECT id FROM sy_tasks WHERE phase_id = v_phase_id);

    -- 3. Log completion events for Phase 3 tasks
    INSERT INTO sy_task_events (task_id, actor_type, actor, event)
    SELECT t.id, 'human', 'claude (automated)',
      'Phase 3 Autoflex DMS Integration — task completed'
    FROM sy_tasks t
    WHERE t.phase_id = v_phase_id
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Phase 3 marked done, phase_id=%', v_phase_id;
  ELSE
    RAISE NOTICE 'Phase 3 not found for program %', v_prog_id;
  END IF;

  -- 4. Update overall program status (all 4 phases done)
  UPDATE sy_programs
  SET status = 'done',
      updated_at = NOW()
  WHERE id = v_prog_id;

  RAISE NOTICE 'WRK-IMPL program status set to done';
END $$;

-- ── Part B: Register WRK screen objects (needed as FK target for bop_dependencies) ──
INSERT INTO bop_objects (object_id, type, name, module, route, status) VALUES
  ('screen:WK001', 'screen', 'Workshop Dashboard',      'WRK', '/console/wrk/dashboard',       'active'),
  ('screen:WK002', 'screen', 'Work Orders',             'WRK', '/console/wrk/orders',          'active'),
  ('screen:WK003', 'screen', 'Planning Board',          'WRK', '/console/wrk/planning',        'active'),
  ('screen:WK004', 'screen', 'Efficiency KPI',          'WRK', '/console/wrk/efficiency',      'active'),
  ('screen:WK005', 'screen', 'Inspection Checklist',    'WRK', '/console/wrk/inspections',     'active'),
  ('screen:WK006', 'screen', 'APK Reminders',           'WRK', '/console/wrk/apk-reminders',   'active'),
  ('screen:WK007', 'screen', 'Customer Approvals',      'WRK', '/console/wrk/approvals',       'active'),
  ('screen:WK008', 'screen', 'Customer Status',         'WRK', '/console/wrk/status',          'active'),
  ('screen:WK009', 'screen', 'Daily Briefing',          'WRK', '/console/wrk/briefing',        'active'),
  ('screen:WK010', 'screen', 'Repair Recommendations',  'WRK', '/console/wrk/recommendations', 'active'),
  ('screen:WK011', 'screen', 'Labour Rates',            'WRK', '/console/wrk/rates',           'active'),
  ('screen:WK012', 'screen', 'Service Packages',        'WRK', '/console/wrk/packages',        'active'),
  ('screen:WK013', 'screen', 'DMS Integration',         'WRK', '/console/wrk/dms-integration', 'active')
ON CONFLICT (object_id) DO UPDATE SET name = EXCLUDED.name, route = EXCLUDED.route, status = EXCLUDED.status;

-- ── Part C: Register WRK business processes for SY035 Flow Map ──────
INSERT INTO bop_objects (object_id, type, name, module, status) VALUES
  ('process:workshop-intake', 'process', 'Workshop Intake', 'WRK', 'active'),
  ('process:work-order-lifecycle', 'process', 'Work Order Lifecycle', 'WRK', 'active'),
  ('process:vehicle-inspection', 'process', 'Vehicle Inspection', 'WRK', 'active'),
  ('process:customer-approval', 'process', 'Customer Approval Flow', 'WRK', 'active'),
  ('process:apk-reminder-campaign', 'process', 'APK Reminder Campaign', 'WRK', 'active'),
  ('process:dms-sync', 'process', 'DMS Data Sync', 'WRK', 'active'),
  ('process:workshop-planning', 'process', 'Workshop Planning', 'WRK', 'active')
ON CONFLICT (object_id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status;

INSERT INTO bop_dependencies (from_id, to_id, dep_type) VALUES
  ('process:workshop-intake', 'screen:WK001', 'involves'),
  ('process:workshop-intake', 'screen:WK002', 'involves'),
  ('process:workshop-intake', 'screen:WK005', 'involves'),
  ('process:work-order-lifecycle', 'screen:WK001', 'involves'),
  ('process:work-order-lifecycle', 'screen:WK002', 'involves'),
  ('process:work-order-lifecycle', 'screen:WK003', 'involves'),
  ('process:work-order-lifecycle', 'screen:WK004', 'involves'),
  ('process:work-order-lifecycle', 'screen:WK008', 'involves'),
  ('process:work-order-lifecycle', 'screen:WK009', 'involves'),
  ('process:work-order-lifecycle', 'screen:WK011', 'involves'),
  ('process:vehicle-inspection', 'screen:WK005', 'involves'),
  ('process:vehicle-inspection', 'screen:WK010', 'involves'),
  ('process:vehicle-inspection', 'screen:WK007', 'involves'),
  ('process:customer-approval', 'screen:WK007', 'involves'),
  ('process:customer-approval', 'screen:WK008', 'involves'),
  ('process:customer-approval', 'screen:WK010', 'involves'),
  ('process:apk-reminder-campaign', 'screen:WK006', 'involves'),
  ('process:apk-reminder-campaign', 'screen:WK001', 'involves'),
  ('process:dms-sync', 'screen:WK013', 'involves'),
  ('process:dms-sync', 'screen:WK002', 'involves'),
  ('process:workshop-planning', 'screen:WK003', 'involves'),
  ('process:workshop-planning', 'screen:WK009', 'involves'),
  ('process:workshop-planning', 'screen:WK004', 'involves'),
  ('process:workshop-planning', 'screen:WK011', 'involves'),
  ('process:workshop-planning', 'screen:WK012', 'involves')
ON CONFLICT DO NOTHING;

COMMIT;

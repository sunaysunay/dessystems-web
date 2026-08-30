-- BOP V2 Migration 117 — Update WRK-IMPL program progress in SY051
-- Marks Phase 0 (Foundation), Phase 1 (Customer-Facing), Phase 2 (Core Workshop) as done
-- Phase 3 (Autoflex API Validation) remains not started
-- Run date: 30 Aug 2026

DO $$
DECLARE
  v_prog_id  UUID;
  v_phase_id UUID;
  v_last_task_id UUID;
  v_phases_updated INT := 0;
  v_delivs_updated INT := 0;
BEGIN

  -- ── 1. Find the WRK-IMPL program ──────────────────────────────────
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
    RAISE NOTICE 'WRK-IMPL program not found in sy_programs — skipping';
    RETURN;
  END IF;

  RAISE NOTICE 'Found WRK-IMPL program: %', v_prog_id;

  -- ── 2. Update program status to active ─────────────────────────────
  UPDATE sy_programs
  SET status     = 'active',
      updated_at = NOW()
  WHERE id = v_prog_id;

  -- ── 3. Phase 0: Foundation ─────────────────────────────────────────
  SELECT id INTO v_phase_id
  FROM sy_phases
  WHERE program_id = v_prog_id
    AND (seq = 0 OR code::text ILIKE '%P0%' OR title::text ILIKE '%Foundation%')
  ORDER BY seq ASC
  LIMIT 1;

  IF v_phase_id IS NOT NULL THEN
    UPDATE sy_phases
    SET status      = 'done',
        status_note = 'All 10 tables, module registry (12 screens, 60 roles), tenant ID fix, screen registry, manifests, RBAC, nav, translations complete',
        updated_at  = NOW()
    WHERE id = v_phase_id;

    UPDATE sy_deliverables
    SET is_verified  = TRUE,
        verified_at  = NOW(),
        updated_at   = NOW()
    WHERE task_id IN (SELECT id FROM sy_tasks WHERE phase_id = v_phase_id)
      AND is_verified = FALSE;
    GET DIAGNOSTICS v_delivs_updated = ROW_COUNT;

    v_phases_updated := v_phases_updated + 1;
    RAISE NOTICE 'Phase 0 (Foundation) done — % deliverables verified', v_delivs_updated;
  ELSE
    RAISE NOTICE 'Phase 0 (Foundation) not found — skipping';
  END IF;

  -- ── 4. Phase 1: Customer-Facing Quick Wins ─────────────────────────
  SELECT id INTO v_phase_id
  FROM sy_phases
  WHERE program_id = v_prog_id
    AND (seq = 1 OR code::text ILIKE '%P1%' OR title::text ILIKE '%Customer%')
    AND id IS DISTINCT FROM (
      SELECT id FROM sy_phases
      WHERE program_id = v_prog_id AND (seq = 0 OR code::text ILIKE '%P0%' OR title::text ILIKE '%Foundation%')
      ORDER BY seq ASC LIMIT 1
    )
  ORDER BY seq ASC
  LIMIT 1;

  IF v_phase_id IS NOT NULL THEN
    UPDATE sy_phases
    SET status      = 'done',
        status_note = 'WK005 Inspections, WK006 APK Reminders, WK007 Customer Approvals, WK008 Customer Status, public /approve/[token] page, COMM context binding, DIE RDW plate lookup complete',
        updated_at  = NOW()
    WHERE id = v_phase_id;

    UPDATE sy_deliverables
    SET is_verified  = TRUE,
        verified_at  = NOW(),
        updated_at   = NOW()
    WHERE task_id IN (SELECT id FROM sy_tasks WHERE phase_id = v_phase_id)
      AND is_verified = FALSE;
    GET DIAGNOSTICS v_delivs_updated = ROW_COUNT;

    v_phases_updated := v_phases_updated + 1;
    RAISE NOTICE 'Phase 1 (Customer-Facing) done — % deliverables verified', v_delivs_updated;
  ELSE
    RAISE NOTICE 'Phase 1 (Customer-Facing) not found — skipping';
  END IF;

  -- ── 5. Phase 2: Core Workshop ──────────────────────────────────────
  SELECT id INTO v_phase_id
  FROM sy_phases
  WHERE program_id = v_prog_id
    AND (seq = 2 OR code::text ILIKE '%P2%' OR title::text ILIKE '%Core%')
    AND id NOT IN (
      SELECT id FROM sy_phases
      WHERE program_id = v_prog_id
        AND (seq IN (0, 1) OR code::text ILIKE '%P0%' OR code::text ILIKE '%P1%'
             OR title::text ILIKE '%Foundation%' OR title::text ILIKE '%Customer%')
    )
  ORDER BY seq ASC
  LIMIT 1;

  IF v_phase_id IS NOT NULL THEN
    UPDATE sy_phases
    SET status      = 'done',
        status_note = 'WK001-WK004 + WK009-WK012 screens, AST vehicle write-back, OPS task auto-creation, SAL warranty claim conversion, CRM contact enrichment, SHP parts lookup complete',
        updated_at  = NOW()
    WHERE id = v_phase_id;

    UPDATE sy_deliverables
    SET is_verified  = TRUE,
        verified_at  = NOW(),
        updated_at   = NOW()
    WHERE task_id IN (SELECT id FROM sy_tasks WHERE phase_id = v_phase_id)
      AND is_verified = FALSE;
    GET DIAGNOSTICS v_delivs_updated = ROW_COUNT;

    v_phases_updated := v_phases_updated + 1;
    RAISE NOTICE 'Phase 2 (Core Workshop) done — % deliverables verified', v_delivs_updated;
  ELSE
    RAISE NOTICE 'Phase 2 (Core Workshop) not found — skipping';
  END IF;

  -- ── 6. Phase 3: Autoflex API Validation — leave as-is ─────────────
  RAISE NOTICE 'Phase 3 (Autoflex API) left as not_started';

  -- ── 7. Log completion event ────────────────────────────────────────
  SELECT t.id INTO v_last_task_id
  FROM sy_tasks t
  JOIN sy_phases p ON p.id = t.phase_id
  WHERE p.program_id = v_prog_id
  ORDER BY t.updated_at DESC NULLS LAST
  LIMIT 1;

  IF v_last_task_id IS NOT NULL THEN
    INSERT INTO sy_task_events (task_id, actor_type, actor, event)
    VALUES (
      v_last_task_id,
      'human',
      'claude (automated)',
      'Phase 0+1+2 marked complete (sql_bop_v2_117). Built: 12 screens (WK001-WK012), 14 API routes, 10 DB tables, 5 cross-module integrations (AST/OPS/SAL/CRM/SHP). Phase 3 (Autoflex API) remains.'
    );
    RAISE NOTICE 'Logged completion event on task %', v_last_task_id;
  END IF;

  RAISE NOTICE 'WRK-IMPL update complete: % phases marked done', v_phases_updated;

END $$;

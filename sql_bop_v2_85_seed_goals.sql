-- ============================================================
-- STR-P1  Strategy Cockpit — Seed Q3-2026 Goals
-- Migration: sql_bop_v2_85_seed_goals.sql
-- ============================================================

DO $$
DECLARE
  v_tid integer;
  v_gid uuid;
BEGIN
  -- Use the tenant_id from an existing op_tasks row (same tenant the app uses)
  SELECT tenant_id INTO v_tid FROM op_tasks WHERE deleted_at IS NULL LIMIT 1;
  IF v_tid IS NULL THEN
    RAISE NOTICE 'No op_tasks found — using first bop_users tenant_id';
    SELECT tenant_id INTO v_tid FROM bop_users WHERE tenant_id IS NOT NULL LIMIT 1;
  END IF;
  IF v_tid IS NULL THEN
    RAISE EXCEPTION 'Cannot determine tenant_id — insert at least one op_task first';
  END IF;

  -- ── Goal 1: DES Mobil Trading Rhythm ──────────────────────
  INSERT INTO op_goals (tenant_id, title, description, entity, level, period_type, period_start, period_end, status, health)
  VALUES (v_tid, 'Grow DES Mobil trading rhythm',
    'Increase vehicle throughput and reduce average days-to-sale to build a sustainable trading cadence.',
    'des_mobil', 0, 'quarterly', '2026-07-01', '2026-09-30', 'active', 'on_track')
  RETURNING id INTO v_gid;

  INSERT INTO op_goal_key_results (tenant_id, goal_id, title, metric_type, direction, baseline, target, current_value, unit_label, weight)
  VALUES
    (v_tid, v_gid, 'Vehicles sold per month',    'count', 'increase', 4,   8,    0, 'vehicles', 1),
    (v_tid, v_gid, 'Average days to sale',       'avg',   'decrease', 45,  28,   0, 'days',     1),
    (v_tid, v_gid, 'Gross margin per vehicle',   'avg',   'increase', 800, 1200, 0, 'EUR',      1);

  -- ── Goal 2: DES Campers Sales Pipeline ────────────────────
  INSERT INTO op_goals (tenant_id, title, description, entity, level, period_type, period_start, period_end, status, health)
  VALUES (v_tid, 'Strengthen DES Campers sales pipeline',
    'Improve inquiry-to-sale conversion and reduce response time to drive consistent camper sales.',
    'des_campers', 0, 'quarterly', '2026-07-01', '2026-09-30', 'active', 'on_track')
  RETURNING id INTO v_gid;

  INSERT INTO op_goal_key_results (tenant_id, goal_id, title, metric_type, direction, baseline, target, current_value, unit_label, weight)
  VALUES
    (v_tid, v_gid, 'Monthly inquiries',               'count', 'increase', 20, 35, 0, 'inquiries', 1),
    (v_tid, v_gid, 'Inquiry-to-sale conversion rate',  'ratio', 'increase', 8,  15, 0, '%',         2),
    (v_tid, v_gid, 'Average first response time',      'avg',   'decrease', 24, 4,  0, 'hours',     1);

  -- ── Goal 3: Operational Excellence ────────────────────────
  INSERT INTO op_goals (tenant_id, title, description, entity, level, period_type, period_start, period_end, status, health)
  VALUES (v_tid, 'Achieve operational excellence across DES Group',
    'Reduce SLA breaches, improve task completion rates, and establish consistent operational cadence.',
    'des_group', 0, 'quarterly', '2026-07-01', '2026-09-30', 'active', 'on_track')
  RETURNING id INTO v_gid;

  INSERT INTO op_goal_key_results (tenant_id, goal_id, title, metric_type, direction, baseline, target, current_value, unit_label, weight)
  VALUES
    (v_tid, v_gid, 'SLA compliance rate',       'ratio', 'increase', 60, 90, 0, '%',     2),
    (v_tid, v_gid, 'Tasks completed per week',  'count', 'increase', 15, 30, 0, 'tasks', 1),
    (v_tid, v_gid, 'Average task age (open)',   'avg',   'decrease', 14, 5,  0, 'days',  1);

  -- ── Goal 4: Customer Satisfaction ─────────────────────────
  INSERT INTO op_goals (tenant_id, title, description, entity, level, period_type, period_start, period_end, status, health)
  VALUES (v_tid, 'Elevate customer satisfaction scores',
    'Drive review scores and NPS across all customer-facing entities.',
    'des_group', 0, 'quarterly', '2026-07-01', '2026-09-30', 'active', 'on_track')
  RETURNING id INTO v_gid;

  INSERT INTO op_goal_key_results (tenant_id, goal_id, title, metric_type, direction, baseline, target, current_value, unit_label, weight)
  VALUES
    (v_tid, v_gid, 'Average review score',  'avg',   'increase', 4.2, 4.7, 0, 'stars', 2),
    (v_tid, v_gid, 'Review response rate',  'ratio', 'increase', 30,  80,  0, '%',     1);

  RAISE NOTICE 'Seeded 4 goals + 11 KRs for tenant %', v_tid;
END $$;

-- ============================================================
-- STR-P1  Strategy Cockpit — Weighted Roll-up + Health RPC
-- Migration: sql_bop_v2_83_goal_rollup.sql
-- RPCs: op_goal_recompute_progress, op_goal_recompute_health
-- ============================================================

-- ── 1. Recompute KR progress (direction-aware) ────────────

CREATE OR REPLACE FUNCTION op_kr_progress(
  p_baseline numeric, p_target numeric, p_current numeric, p_direction text
) RETURNS numeric AS $$
DECLARE
  v_range numeric;
  v_pct numeric;
BEGIN
  IF p_direction = 'decrease' THEN
    v_range := p_baseline - p_target;
    IF v_range = 0 THEN RETURN 0; END IF;
    v_pct := ((p_baseline - p_current) / v_range) * 100;
  ELSE
    v_range := p_target - p_baseline;
    IF v_range = 0 THEN RETURN 0; END IF;
    v_pct := ((p_current - p_baseline) / v_range) * 100;
  END IF;
  RETURN GREATEST(0, LEAST(100, ROUND(v_pct, 2)));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ── 2. Recompute goal progress (weighted avg of KRs + children) ──

CREATE OR REPLACE FUNCTION op_goal_recompute_progress(p_goal_id uuid)
RETURNS void
SECURITY DEFINER
AS $$
DECLARE
  v_kr_sum numeric := 0;
  v_kr_weight numeric := 0;
  v_child_sum numeric := 0;
  v_child_count integer := 0;
  v_total_pct numeric := 0;
  r record;
BEGIN
  -- Recompute each KR's progress_pct first
  FOR r IN
    SELECT id, baseline, target, current_value, direction, weight
    FROM op_goal_key_results
    WHERE goal_id = p_goal_id AND deleted_at IS NULL
  LOOP
    UPDATE op_goal_key_results
    SET progress_pct = op_kr_progress(r.baseline, r.target, r.current_value, r.direction)
    WHERE id = r.id;

    v_kr_sum := v_kr_sum + (op_kr_progress(r.baseline, r.target, r.current_value, r.direction) * r.weight);
    v_kr_weight := v_kr_weight + r.weight;
  END LOOP;

  -- Include children goals' progress
  FOR r IN
    SELECT progress_pct FROM op_goals
    WHERE parent_goal_id = p_goal_id AND deleted_at IS NULL
  LOOP
    v_child_sum := v_child_sum + COALESCE(r.progress_pct, 0);
    v_child_count := v_child_count + 1;
  END LOOP;

  -- Weighted combination: KRs + children average
  IF v_kr_weight > 0 AND v_child_count > 0 THEN
    v_total_pct := ((v_kr_sum / v_kr_weight) + (v_child_sum / v_child_count)) / 2;
  ELSIF v_kr_weight > 0 THEN
    v_total_pct := v_kr_sum / v_kr_weight;
  ELSIF v_child_count > 0 THEN
    v_total_pct := v_child_sum / v_child_count;
  END IF;

  UPDATE op_goals SET progress_pct = ROUND(v_total_pct, 2) WHERE id = p_goal_id;

  -- Recurse to parent
  PERFORM op_goal_recompute_progress(parent_goal_id)
  FROM op_goals WHERE id = p_goal_id AND parent_goal_id IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- ── 3. Recompute health from pace ─────────────────────────

CREATE OR REPLACE FUNCTION op_goal_recompute_health(p_goal_id uuid)
RETURNS void
SECURITY DEFINER
AS $$
DECLARE
  v_goal record;
  v_elapsed numeric;
  v_period_days numeric;
  v_expected_pct numeric;
  v_delta numeric;
  v_health text;
BEGIN
  SELECT * INTO v_goal FROM op_goals WHERE id = p_goal_id;
  IF NOT FOUND OR v_goal.health_override IS NOT NULL THEN RETURN; END IF;
  IF v_goal.period_start IS NULL OR v_goal.period_end IS NULL THEN RETURN; END IF;

  v_period_days := EXTRACT(EPOCH FROM (v_goal.period_end::timestamp - v_goal.period_start::timestamp)) / 86400;
  IF v_period_days <= 0 THEN RETURN; END IF;

  v_elapsed := EXTRACT(EPOCH FROM (CURRENT_DATE::timestamp - v_goal.period_start::timestamp)) / 86400;
  v_elapsed := GREATEST(0, LEAST(v_elapsed, v_period_days));
  v_expected_pct := (v_elapsed / v_period_days) * 100;

  v_delta := COALESCE(v_goal.progress_pct, 0) - v_expected_pct;

  IF v_delta >= -10 THEN
    v_health := 'on_track';
  ELSIF v_delta >= -25 THEN
    v_health := 'at_risk';
  ELSE
    v_health := 'off_track';
  END IF;

  UPDATE op_goals SET health = v_health WHERE id = p_goal_id;
END;
$$ LANGUAGE plpgsql;

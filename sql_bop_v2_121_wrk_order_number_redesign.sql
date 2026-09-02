-- BOP V2 Migration 121 — Work order number redesign
-- Old format: WO-YYYYMM-NNNNN (monthly reset, text prefix)
-- New format: 3YYWWNNN (weekly reset, no separator)
--   3   = fixed prefix (work order document type)
--   YY  = 2-digit year
--   WW  = ISO week number (01-53, always 2 digits)
--   NNN = weekly sequence (001-999, resets each week)
-- Example: 326360001 = work order, 2026, week 36, first of that week

BEGIN;

-- ── 1. Replace the trigger function ────────────────────────────────
CREATE OR REPLACE FUNCTION wrk_order_number_trigger()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_prefix text;
  v_count  bigint;
BEGIN
  IF NEW.wo_number IS NULL THEN
    v_prefix := '3' || to_char(now(), 'YY') || to_char(now(), 'IW');
    SELECT count(*) INTO v_count
    FROM wrk_orders
    WHERE wo_number LIKE v_prefix || '%';
    NEW.wo_number := v_prefix || lpad((v_count + 1)::text, 3, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- ── 2. Migrate existing work orders to new format ──────────────────
-- Assigns new numbers in creation order within each ISO week
DO $$
DECLARE
  r RECORD;
  v_prefix text;
  v_seq    integer;
  v_last_prefix text := '';
BEGIN
  FOR r IN
    SELECT id, wo_number, created_at
    FROM wrk_orders
    ORDER BY created_at ASC
  LOOP
    v_prefix := '3' || to_char(r.created_at, 'YY') || to_char(r.created_at, 'IW');

    IF v_prefix = v_last_prefix THEN
      v_seq := v_seq + 1;
    ELSE
      v_seq := 1;
      v_last_prefix := v_prefix;
    END IF;

    UPDATE wrk_orders
    SET wo_number = v_prefix || lpad(v_seq::text, 3, '0')
    WHERE id = r.id;

    RAISE NOTICE 'Migrated % → %', r.wo_number, v_prefix || lpad(v_seq::text, 3, '0');
  END LOOP;
END $$;

COMMIT;

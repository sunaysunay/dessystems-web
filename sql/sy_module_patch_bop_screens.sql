-- Step 1: Stage removal (set criticality = -1)
UPDATE bop_protected_tables SET criticality = -1 WHERE table_name = 'bop_screens';

-- Step 2: Now delete is allowed
DELETE FROM bop_protected_tables WHERE table_name = 'bop_screens';

-- Step 3: Add impl_* columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='bop_screens' AND column_name='impl_program') THEN
    ALTER TABLE bop_screens ADD COLUMN impl_program  text;
    ALTER TABLE bop_screens ADD COLUMN impl_phase    smallint;
    ALTER TABLE bop_screens ADD COLUMN impl_status   text
      CHECK (impl_status IN ('planned','in_progress','done','verified'));
    ALTER TABLE bop_screens ADD COLUMN impl_spec_ref text;
  END IF;
END $$;

-- Step 4: Re-add protection
INSERT INTO bop_protected_tables (table_name, criticality, reason)
VALUES ('bop_screens', 0, 'TC registry — platform core')
ON CONFLICT DO NOTHING;

-- Step 5: Add index
CREATE INDEX IF NOT EXISTS idx_bop_screens_impl ON bop_screens(impl_program)
  WHERE impl_program IS NOT NULL;

-- Migration: Add sort_order column to bop_shortlink_prefixes
-- Run this in Supabase SQL Editor (Dashboard)

ALTER TABLE bop_shortlink_prefixes
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 50;

-- Set initial sort orders (matching DesCampers pattern)
UPDATE bop_shortlink_prefixes SET sort_order = 21 WHERE prefix = 'w';
UPDATE bop_shortlink_prefixes SET sort_order = 22 WHERE prefix = 'e';
UPDATE bop_shortlink_prefixes SET sort_order = 23 WHERE prefix = 'q';
UPDATE bop_shortlink_prefixes SET sort_order = 25 WHERE prefix = 'p';
UPDATE bop_shortlink_prefixes SET sort_order = 31 WHERE prefix = 'm';
UPDATE bop_shortlink_prefixes SET sort_order = 32 WHERE prefix = 'a';
UPDATE bop_shortlink_prefixes SET sort_order = 41 WHERE prefix = 'g';
UPDATE bop_shortlink_prefixes SET sort_order = 42 WHERE prefix = 'i';
UPDATE bop_shortlink_prefixes SET sort_order = 43 WHERE prefix = 'f';
UPDATE bop_shortlink_prefixes SET sort_order = 99 WHERE prefix = 'x';
UPDATE bop_shortlink_prefixes SET sort_order = 99 WHERE prefix = 't';

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

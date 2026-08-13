-- Add status_note column to sy_programs and sy_phases
-- Run in Supabase Dashboard SQL Editor

-- Step 1: Remove protection on sy_programs
UPDATE bop_protected_tables SET criticality = -1 WHERE table_name = 'sy_programs';
DELETE FROM bop_protected_tables WHERE table_name = 'sy_programs';

-- Step 2: Add column
ALTER TABLE sy_programs ADD COLUMN IF NOT EXISTS status_note text;

-- Step 3: Re-protect
INSERT INTO bop_protected_tables (table_name, criticality, reason)
VALUES ('sy_programs', 0, 'Implementation programs — SY module core')
ON CONFLICT DO NOTHING;

-- Step 4: Remove protection on sy_phases
UPDATE bop_protected_tables SET criticality = -1 WHERE table_name = 'sy_phases';
DELETE FROM bop_protected_tables WHERE table_name = 'sy_phases';

-- Step 5: Add column
ALTER TABLE sy_phases ADD COLUMN IF NOT EXISTS status_note text;

-- Step 6: Re-protect
INSERT INTO bop_protected_tables (table_name, criticality, reason)
VALUES ('sy_phases', 0, 'Implementation phases — SY module core')
ON CONFLICT DO NOTHING;

-- Step 7: Update the progress views to include status_note

CREATE OR REPLACE VIEW sy_program_progress AS
SELECT
  p.id AS program_id, p.code, p.title, p.owner, p.status, p.status_note, p.target_date,
  count(DISTINCT ph.id)                                          AS total_phases,
  count(DISTINCT ph.id) FILTER (WHERE ph.status = 'done')       AS completed_phases,
  count(DISTINCT t.id)                                           AS total_tasks,
  count(DISTINCT t.id)  FILTER (WHERE NOT EXISTS (
      SELECT 1 FROM sy_deliverables d2
      WHERE d2.task_id = t.id AND d2.verify_mode = 'auto' AND d2.is_verified = false
  ) AND EXISTS (SELECT 1 FROM sy_deliverables d3 WHERE d3.task_id = t.id))  AS verified_tasks,
  count(d.id)                                                    AS total_deliverables,
  count(d.id) FILTER (WHERE d.is_verified)                       AS verified_deliverables,
  CASE WHEN count(d.id) = 0 THEN 0
       ELSE round(100.0 * count(d.id) FILTER (WHERE d.is_verified) / count(d.id))
  END                                                            AS pct
FROM sy_programs   p
LEFT JOIN sy_phases      ph ON ph.program_id = p.id
LEFT JOIN sy_tasks       t  ON t.phase_id    = ph.id
LEFT JOIN sy_deliverables d ON d.task_id     = t.id
GROUP BY p.id, p.code, p.title, p.owner, p.status, p.status_note, p.target_date;

CREATE OR REPLACE VIEW sy_phase_progress AS
SELECT
  ph.id AS phase_id, ph.program_id, ph.seq, ph.title, ph.status, ph.status_note,
  ph.fte_days, ph.go_signal,
  count(DISTINCT t.id)                                           AS total_tasks,
  count(DISTINCT t.id) FILTER (WHERE NOT EXISTS (
      SELECT 1 FROM sy_deliverables d2
      WHERE d2.task_id = t.id AND d2.verify_mode = 'auto' AND d2.is_verified = false
  ) AND EXISTS (SELECT 1 FROM sy_deliverables d3 WHERE d3.task_id = t.id))  AS verified_tasks,
  count(d.id)                                                    AS total_deliverables,
  count(d.id) FILTER (WHERE d.is_verified)                       AS verified_deliverables,
  CASE WHEN count(d.id) = 0 THEN 0
       ELSE round(100.0 * count(d.id) FILTER (WHERE d.is_verified) / count(d.id))
  END                                                            AS pct
FROM sy_phases ph
LEFT JOIN sy_tasks        t ON t.phase_id = ph.id
LEFT JOIN sy_deliverables d ON d.task_id  = t.id
GROUP BY ph.id, ph.program_id, ph.seq, ph.title, ph.status, ph.status_note,
         ph.fte_days, ph.go_signal;

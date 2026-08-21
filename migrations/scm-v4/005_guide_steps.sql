-- Guide steps: tour step definitions for inline guided tours
CREATE TABLE IF NOT EXISTS guide_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_code text NOT NULL,
  submodule text NOT NULL,
  step_order int NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  target_selector text,
  doc_link text,
  screen_path text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(module_code, submodule, step_order)
);

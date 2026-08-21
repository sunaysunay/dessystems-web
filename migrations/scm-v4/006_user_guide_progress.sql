-- User guide progress: tracks which tours a user has completed
CREATE TABLE IF NOT EXISTS user_guide_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  module_code text NOT NULL,
  submodule text NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, module_code, submodule)
);

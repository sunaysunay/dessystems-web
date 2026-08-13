-- Drop old op_task_create with UUID signature
DROP FUNCTION IF EXISTS op_task_create(
  uuid, text, text, integer, uuid, uuid, timestamptz, timestamptz,
  text, uuid, text, uuid, jsonb, uuid
);

-- Drop old op_task_create with UUID + extra params (from patch)
DROP FUNCTION IF EXISTS op_task_create(
  uuid, text, text, integer, text, uuid, text, timestamptz, timestamptz,
  text, text, text, jsonb, uuid, uuid, uuid
);

-- Verify: should show only the integer version
SELECT proname, proargtypes::text
FROM pg_proc
WHERE proname = 'op_task_create';

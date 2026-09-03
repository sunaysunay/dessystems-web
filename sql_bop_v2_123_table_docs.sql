-- BOP v2.123: Table documentation catalog
-- Run in Supabase SQL Editor

-- 1. Create the catalog table
CREATE TABLE IF NOT EXISTS bop_table_docs (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  schema_name   text NOT NULL DEFAULT 'public',
  table_name    text NOT NULL,
  column_name   text,  -- NULL = table-level doc
  description   text NOT NULL,
  tags          text[] DEFAULT '{}',
  module        text,
  updated_by    text,
  updated_at    timestamptz DEFAULT now(),
  UNIQUE (schema_name, table_name, column_name)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_bop_table_docs_table ON bop_table_docs (schema_name, table_name);
CREATE INDEX IF NOT EXISTS idx_bop_table_docs_module ON bop_table_docs (module);
CREATE INDEX IF NOT EXISTS idx_bop_table_docs_tags ON bop_table_docs USING gin (tags);

-- Full-text search index on description
ALTER TABLE bop_table_docs ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(table_name, '') || ' ' || coalesce(column_name, '') || ' ' || coalesce(description, ''))
  ) STORED;
CREATE INDEX IF NOT EXISTS idx_bop_table_docs_search ON bop_table_docs USING gin (search_vector);

-- 2. Grant access to console roles
GRANT SELECT ON bop_table_docs TO bop_console_read;
GRANT SELECT, INSERT, UPDATE, DELETE ON bop_table_docs TO bop_console_write;
GRANT USAGE ON SEQUENCE bop_table_docs_id_seq TO bop_console_write;

-- 3. Add COMMENT on the table itself
COMMENT ON TABLE bop_table_docs IS 'Documentation catalog for all database tables and columns. Editable from DB002/DB003 console screens.';

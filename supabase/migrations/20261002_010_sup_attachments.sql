-- SP-3.1: Support ticket attachments
-- Bucket + table for file attachments on support messages

-- Create storage bucket (idempotent — error if exists is harmless)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('sup-attachments', 'sup-attachments', false, 7340032)
ON CONFLICT (id) DO NOTHING;

-- Attachments metadata table
CREATE TABLE IF NOT EXISTS sup_attachments (
  id          SERIAL PRIMARY KEY,
  message_id  INT NOT NULL REFERENCES sup_messages(id) ON DELETE CASCADE,
  tenant_id   INT NOT NULL REFERENCES sup_tenants(id),
  file_name   TEXT NOT NULL,
  file_size   INT NOT NULL CHECK (file_size > 0 AND file_size <= 7340032),
  mime_type   TEXT NOT NULL CHECK (mime_type IN (
    'image/png', 'image/jpeg', 'image/webp', 'image/gif',
    'application/pdf'
  )),
  storage_path TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sup_attachments_message ON sup_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_sup_attachments_tenant  ON sup_attachments(tenant_id);

-- RLS
ALTER TABLE sup_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY sup_attachments_service_all ON sup_attachments
  FOR ALL USING (true) WITH CHECK (true);

-- Storage policies: service role can do everything
CREATE POLICY sup_att_insert ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'sup-attachments');
CREATE POLICY sup_att_select ON storage.objects
  FOR SELECT USING (bucket_id = 'sup-attachments');
CREATE POLICY sup_att_delete ON storage.objects
  FOR DELETE USING (bucket_id = 'sup-attachments');

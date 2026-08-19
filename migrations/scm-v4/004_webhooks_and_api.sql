-- SCM-V4 T7.1: External REST API
-- T7.2: Event system + outbound webhooks

CREATE TABLE IF NOT EXISTS shop_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  label text,
  active boolean DEFAULT true,
  scopes text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  last_used_at timestamptz
);

CREATE TABLE IF NOT EXISTS shop_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id uuid REFERENCES shop_api_keys(id) ON DELETE CASCADE,
  url text NOT NULL,
  events text[] NOT NULL,
  active boolean DEFAULT true,
  secret text,
  last_triggered_at timestamptz,
  failure_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shop_webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id uuid REFERENCES shop_webhooks(id) ON DELETE CASCADE,
  event text NOT NULL,
  payload jsonb,
  response_status integer,
  response_body text,
  success boolean,
  attempted_at timestamptz DEFAULT now()
);

-- T8.2: Wishlist
CREATE TABLE IF NOT EXISTS shop_wishlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid REFERENCES shop_products(id) ON DELETE CASCADE,
  variant_id uuid,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, product_id, variant_id)
);

CREATE INDEX IF NOT EXISTS idx_webhooks_api_key ON shop_webhooks(api_key_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook ON shop_webhook_logs(webhook_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_user ON shop_wishlist(user_id);

-- Delivery options per listing
CREATE TABLE IF NOT EXISTS bop_listing_delivery (
  listing_id   UUID PRIMARY KEY REFERENCES bop_listings(id) ON DELETE CASCADE,
  delivery_available  BOOLEAN NOT NULL DEFAULT false,
  delivery_included   BOOLEAN NOT NULL DEFAULT false,
  delivery_price      NUMERIC(10,2),
  delivery_currency   TEXT NOT NULL DEFAULT 'EUR',
  delivery_radius_km  INTEGER,
  delivery_time_days  INTEGER,
  pickup_available    BOOLEAN NOT NULL DEFAULT true,
  pickup_location     TEXT,
  export_ready        BOOLEAN NOT NULL DEFAULT false,
  transport_options   TEXT[],
  delivery_notes      TEXT,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE bop_listing_delivery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon read delivery" ON bop_listing_delivery
  FOR SELECT USING (true);

CREATE POLICY "service role all delivery" ON bop_listing_delivery
  FOR ALL USING (true) WITH CHECK (true);

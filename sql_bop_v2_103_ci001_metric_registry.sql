-- ============================================================
-- CI001 — Commerce Intelligence: Metric Registry
-- Task: CI-T03
-- Spec: §3
-- ============================================================

CREATE TABLE IF NOT EXISTS ci_metric_def (
  metric_id    text PRIMARY KEY,
  domain       text NOT NULL CHECK (domain IN (
    'sales','traffic','funnel','product','marketing',
    'customer','inventory','search','fitment'
  )),
  plane        char(1) NOT NULL CHECK (plane IN ('A','B','X')),
  name_en      text NOT NULL,
  name_nl      text NOT NULL,
  name_de      text NOT NULL DEFAULT '',
  name_fr      text NOT NULL DEFAULT '',
  name_tr      text NOT NULL DEFAULT '',
  formula      text NOT NULL,
  source_table text NOT NULL,
  unit         text NOT NULL CHECK (unit IN (
    'cents','units','orders','sessions','users','pct','ratio',
    'days','hours','score','count','currency'
  )),
  aggregation  text NOT NULL CHECK (aggregation IN ('sum','avg','rate','snapshot','composite')),
  grain        text NOT NULL CHECK (grain IN ('order_line','order','session','day','variant','category','customer','query','global')),
  higher_is    text NOT NULL DEFAULT 'better' CHECK (higher_is IN ('better','worse','neutral')),
  shrinkage_k  integer,
  version      integer NOT NULL DEFAULT 1,
  deprecated   boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- ── RLS (L3 — read-only for analytics role) ──
ALTER TABLE ci_metric_def ENABLE ROW LEVEL SECURITY;

CREATE POLICY ci_metric_def_read_all ON ci_metric_def
  FOR SELECT USING (true);

-- ── bop_objects ──
INSERT INTO bop_objects (object_id, type, module, name, status, description)
VALUES ('table:ci_metric_def', 'table', 'SHP', 'ci_metric_def', 'active',
  'Metric registry — the law. No dashboard may compute a metric not in this table. L3.')
ON CONFLICT (object_id) DO NOTHING;

-- ════════════════════════════════════════════════════════════
-- SEED — 84 metrics, idempotent via ON CONFLICT
-- ════════════════════════════════════════════════════════════

INSERT INTO ci_metric_def (metric_id, domain, plane, name_en, name_nl, formula, source_table, unit, aggregation, grain, higher_is, shrinkage_k) VALUES

-- ── §3.1 Sales (Plane A) — 14 metrics ──
('gross_sales',          'sales', 'A', 'Gross Sales',           'Bruto omzet',           'SUM(line_net_cents)',                             'ci_daily_sales',    'cents',    'sum',      'order_line', 'better',  NULL),
('discount_total',       'sales', 'A', 'Discount Total',        'Kortingstotaal',        'SUM(discount_net_cents)',                         'ci_daily_sales',    'cents',    'sum',      'order_line', 'neutral', NULL),
('net_sales',            'sales', 'A', 'Net Sales',             'Netto omzet',           'gross_sales - discount_total - refund_value',     'ci_daily_sales',    'cents',    'sum',      'order_line', 'better',  NULL),
('orders',               'sales', 'A', 'Orders',                'Bestellingen',          'COUNT(DISTINCT order_id)',                        'ci_daily_sales',    'orders',   'sum',      'order',      'better',  NULL),
('units',                'sales', 'A', 'Units Sold',            'Verkochte eenheden',    'SUM(qty_settled)',                                'ci_daily_sales',    'units',    'sum',      'order_line', 'better',  NULL),
('aov',                  'sales', 'A', 'Avg Order Value',       'Gem. bestelwaarde',     'net_sales / orders',                              'ci_daily_sales',    'cents',    'avg',      'order',      'better',  NULL),
('cogs',                 'sales', 'A', 'COGS',                  'Kostprijs',             'SUM(cogs_cents)',                                 'ci_daily_sales',    'cents',    'sum',      'order_line', 'worse',   NULL),
('gross_margin',         'sales', 'A', 'Gross Margin',          'Bruto marge',           'net_sales - cogs',                                'ci_daily_sales',    'cents',    'sum',      'order_line', 'better',  NULL),
('gross_margin_pct',     'sales', 'A', 'Gross Margin %',        'Bruto marge %',         'gross_margin / net_sales',                        'ci_daily_sales',    'pct',      'rate',     'global',     'better',  NULL),
('contribution_margin',  'sales', 'A', 'Contribution Margin',   'Contributiemarge',      'SUM(contribution_cents)',                         'ci_daily_sales',    'cents',    'sum',      'order_line', 'better',  NULL),
('contribution_pct',     'sales', 'A', 'Contribution %',        'Contributie %',         'contribution_margin / net_sales',                 'ci_daily_sales',    'pct',      'rate',     'global',     'better',  NULL),
('refund_value',         'sales', 'A', 'Refund Value',          'Restitutiewaarde',      'SUM(return_net_cents)',                            'ci_daily_sales',    'cents',    'sum',      'order_line', 'worse',   NULL),
('shipping_net_result',  'sales', 'A', 'Shipping Net Result',   'Verzending netto',      'SUM(shipping_charged - shipping_actual)',          'ci_daily_sales',    'cents',    'sum',      'order',      'better',  NULL),
('vat_collected',        'sales', 'A', 'VAT Collected',         'BTW geïnd',             'SUM(tax_cents)',                                  'ci_daily_sales',    'cents',    'sum',      'order',      'neutral', NULL),

-- ── §3.2 Traffic & Sessions (Plane B) — 7 metrics ──
('sessions',             'traffic', 'B', 'Sessions',            'Sessies',               'COUNT(DISTINCT session_id)',                      'ci_daily_traffic',  'sessions', 'sum',      'session',    'better',  NULL),
('users',                'traffic', 'B', 'Users',               'Gebruikers',            'COUNT(DISTINCT pseudonym_id)',                    'ci_daily_traffic',  'users',    'sum',      'session',    'better',  NULL),
('new_users',            'traffic', 'B', 'New Users',           'Nieuwe gebruikers',     'COUNT(DISTINCT pseudonym_id) WHERE first_seen',   'ci_daily_traffic',  'users',    'sum',      'session',    'better',  NULL),
('engaged_sessions',     'traffic', 'B', 'Engaged Sessions',    'Betrokken sessies',     'sessions WHERE duration>10s OR pages>1',          'ci_daily_traffic',  'sessions', 'sum',      'session',    'better',  NULL),
('engagement_rate',      'traffic', 'B', 'Engagement Rate',     'Betrokkenheid %',       'engaged_sessions / sessions',                     'ci_daily_traffic',  'pct',      'rate',     'global',     'better',  NULL),
('consent_rate',         'traffic', 'B', 'Consent Rate',        'Toestemmingspercentage','consented_sessions / total_sessions',              'ci_daily_traffic',  'pct',      'rate',     'global',     'neutral', NULL),
('bounce_rate',          'traffic', 'B', 'Bounce Rate',         'Bouncepercentage',      'single_page_sessions / sessions',                 'ci_daily_traffic',  'pct',      'rate',     'global',     'worse',   NULL),

-- ── §3.3 Funnel & Conversion — 9 metrics ──
('r_session_to_product', 'funnel', 'B', 'Session → Product',    'Sessie → Product',      'sessions_with_product_view / sessions',            'ci_daily_funnel',   'ratio',    'rate',     'global',     'better',  NULL),
('r_product_to_cart',    'funnel', 'B', 'Product → Cart',       'Product → Winkelwagen', 'sessions_with_cart_add / sessions_with_pv',        'ci_daily_funnel',   'ratio',    'rate',     'global',     'better',  NULL),
('r_cart_to_checkout',   'funnel', 'B', 'Cart → Checkout',      'Winkelwagen → Kassa',   'sessions_with_checkout / sessions_with_cart',       'ci_daily_funnel',   'ratio',    'rate',     'global',     'better',  NULL),
('r_checkout_to_payment','funnel', 'B', 'Checkout → Payment',   'Kassa → Betaling',      'sessions_with_payment / sessions_with_checkout',    'ci_daily_funnel',   'ratio',    'rate',     'global',     'better',  NULL),
('r_payment_to_order',   'funnel', 'X', 'Payment → Order',      'Betaling → Bestelling', 'orders / sessions_with_payment',                   'ci_daily_funnel',   'ratio',    'rate',     'global',     'better',  NULL),
('cvr_observed',         'funnel', 'X', 'CVR (Observed)',        'Conversie (waargenomen)','orders / sessions',                               'ci_daily_funnel',   'pct',      'rate',     'global',     'better',  40),
('cvr_projected',        'funnel', 'X', 'CVR (Projected)',       'Conversie (geschat)',   'orders / (sessions / consent_rate)',                'ci_daily_funnel',   'pct',      'rate',     'global',     'better',  40),
('cart_abandonment',     'funnel', 'B', 'Cart Abandonment',     'Winkelwagen verlating', '1 - (checkouts / carts)',                          'ci_daily_funnel',   'pct',      'rate',     'global',     'worse',   NULL),
('checkout_abandonment', 'funnel', 'B', 'Checkout Abandonment', 'Kassa verlating',       '1 - (orders / checkouts)',                         'ci_daily_funnel',   'pct',      'rate',     'global',     'worse',   NULL),

-- ── §3.4 Product — 17 metrics ──
('product_views',        'product', 'B', 'Product Views',       'Productweergaven',      'COUNT(product_view)',                              'ci_daily_product',  'count',    'sum',      'variant',    'better',  NULL),
('unique_viewers',       'product', 'B', 'Unique Viewers',      'Unieke bezoekers',      'COUNT(DISTINCT pseudonym_id) per variant',         'ci_daily_product',  'users',    'sum',      'variant',    'better',  NULL),
('cart_adds',            'product', 'B', 'Cart Adds',           'Winkelwagen toevoegingen','COUNT(cart_add)',                                 'ci_daily_product',  'count',    'sum',      'variant',    'better',  NULL),
('cart_rate',            'product', 'X', 'Cart Rate',           'Winkelwagen %',         'cart_adds / unique_viewers',                       'ci_daily_product',  'pct',      'rate',     'variant',    'better',  25),
('cvr_view_to_order',   'product', 'X', 'View → Order CVR',    'Weergave → Bestelling', 'buyers / unique_viewers',                         'ci_daily_product',  'pct',      'rate',     'variant',    'better',  40),
('p_units',             'product', 'A', 'Units (Product)',      'Eenheden (product)',     'SUM(qty_settled) per variant',                    'ci_daily_product',  'units',    'sum',      'variant',    'better',  NULL),
('p_net_revenue',       'product', 'A', 'Net Revenue (Product)','Netto omzet (product)', 'SUM(net_revenue_cents) per variant',               'ci_daily_product',  'cents',    'sum',      'variant',    'better',  NULL),
('p_contribution',      'product', 'A', 'Contribution (Product)','Contributie (product)','SUM(contribution_cents) per variant',              'ci_daily_product',  'cents',    'sum',      'variant',    'better',  NULL),
('contribution_per_unit','product', 'A', 'Contribution/Unit',   'Contributie/eenheid',   'contribution / units per variant',                 'ci_daily_product',  'cents',    'avg',      'variant',    'better',  NULL),
('return_rate_units',   'product', 'A', 'Return Rate (Units)',  'Retourpercentage (eenheden)','returned_units / ordered_units',               'ci_daily_product',  'pct',      'rate',     'variant',    'worse',   15),
('return_rate_value',   'product', 'A', 'Return Rate (Value)',  'Retourpercentage (waarde)','returned_value / gross_value',                   'ci_daily_product',  'pct',      'rate',     'variant',    'worse',   15),
('sell_through',        'product', 'A', 'Sell-Through Rate',    'Doorverkooppercentage', 'units_sold / (units_sold + stock_on_hand)',        'ci_daily_product',  'pct',      'rate',     'variant',    'better',  NULL),
('days_of_stock',       'product', 'A', 'Days of Stock',        'Voorraaddagen',         'stock / avg_daily_sales',                         'ci_daily_product',  'days',     'snapshot', 'variant',    'neutral', NULL),
('stockout_days',       'product', 'A', 'Stockout Days',        'Uitvoorraad dagen',     'COUNT(days WHERE stock=0)',                        'ci_daily_product',  'days',     'sum',      'variant',    'worse',   NULL),
('wishlist_adds',       'product', 'B', 'Wishlist Adds',        'Verlanglijst toevoegingen','COUNT(wishlist_add)',                            'ci_daily_product',  'count',    'sum',      'variant',    'better',  NULL),
('review_count',        'product', 'A', 'Review Count',         'Aantal reviews',        'COUNT(reviews)',                                   'ci_daily_product',  'count',    'sum',      'variant',    'better',  NULL),
('review_avg',          'product', 'A', 'Review Average',       'Gemiddelde review',     'AVG(review_score)',                                'ci_daily_product',  'score',    'avg',      'variant',    'better',  NULL),

-- ── §3.5 Marketing — 7 metrics ──
('ad_spend',            'marketing', 'A', 'Ad Spend',           'Advertentie-uitgaven',  'SUM(spend_cents)',                                'ci_daily_campaign', 'cents',    'sum',      'day',        'neutral', NULL),
('attributed_revenue',  'marketing', 'X', 'Attributed Revenue', 'Toegeschreven omzet',   'SUM(attributed_net_cents)',                       'ci_daily_campaign', 'cents',    'sum',      'day',        'better',  NULL),
('roas',                'marketing', 'X', 'ROAS',               'ROAS',                  'attributed_revenue / ad_spend',                   'ci_daily_campaign', 'ratio',    'rate',     'day',        'better',  NULL),
('mer',                 'marketing', 'X', 'MER',                'MER',                   'net_sales / ad_spend',                            'ci_daily_campaign', 'ratio',    'rate',     'global',     'better',  NULL),
('cac_new',             'marketing', 'X', 'CAC (New)',           'Acquisitiekosten',      'ad_spend / new_customers',                        'ci_daily_campaign', 'cents',    'avg',      'day',        'worse',   NULL),
('poas',                'marketing', 'X', 'POAS',               'POAS',                  'attributed_contribution / ad_spend',              'ci_daily_campaign', 'ratio',    'rate',     'day',        'better',  NULL),
('ctr',                 'marketing', 'B', 'CTR',                'Doorklikpercentage',    'clicks / impressions',                            'ci_daily_campaign', 'pct',      'rate',     'day',        'better',  NULL),

-- ── §3.6 Customer — 8 metrics ──
('new_customers',       'customer', 'A', 'New Customers',       'Nieuwe klanten',        'COUNT WHERE order_sequence=1',                    'ci_daily_customer', 'count',    'sum',      'customer',   'better',  NULL),
('returning_customers', 'customer', 'A', 'Returning Customers', 'Terugkerende klanten',  'COUNT WHERE order_sequence>1',                    'ci_daily_customer', 'count',    'sum',      'customer',   'better',  NULL),
('repeat_rate',         'customer', 'A', 'Repeat Rate',         'Herhalingspercentage',  'returning_customers / total_customers',            'ci_daily_customer', 'pct',      'rate',     'global',     'better',  NULL),
('purchase_frequency',  'customer', 'A', 'Purchase Frequency',  'Aankoopfrequentie',     'orders / unique_customers',                       'ci_daily_customer', 'ratio',    'avg',      'customer',   'better',  NULL),
('recency_days',        'customer', 'A', 'Recency (Days)',      'Recentheid (dagen)',     'AVG(days_since_last_order)',                      'ci_daily_customer', 'days',     'avg',      'customer',   'worse',   NULL),
('ltv_revenue',         'customer', 'A', 'LTV (Revenue)',       'CLV (omzet)',           'SUM(net_revenue) per customer',                   'ci_daily_customer', 'cents',    'sum',      'customer',   'better',  NULL),
('ltv_contribution',    'customer', 'A', 'LTV (Contribution)',  'CLV (contributie)',     'SUM(contribution) per customer',                  'ci_daily_customer', 'cents',    'sum',      'customer',   'better',  NULL),
('churn_risk_days',     'customer', 'A', 'Churn Risk (Days)',   'Churnrisico (dagen)',   'days_since_last_order / avg_purchase_interval',   'ci_daily_customer', 'days',     'avg',      'customer',   'worse',   NULL),

-- ── §3.7 Inventory & Operations — 11 metrics ──
('stock_value',         'inventory', 'A', 'Stock Value',        'Voorraadwaarde',        'SUM(stock × landed_cost)',                        'ci_daily_inventory','cents',    'snapshot', 'variant',    'neutral', NULL),
('inventory_turnover',  'inventory', 'A', 'Inventory Turnover', 'Voorraadomloopsnelheid','cogs_period / avg_stock_value',                   'ci_daily_inventory','ratio',    'rate',     'global',     'better',  NULL),
('dead_stock_value',    'inventory', 'A', 'Dead Stock Value',   'Dode voorraadwaarde',   'SUM(stock × cost) WHERE 0 units 180d',            'ci_daily_inventory','cents',    'snapshot', 'variant',    'worse',   NULL),
('overstock_value',     'inventory', 'A', 'Overstock Value',    'Overvoorraadwaarde',    'SUM(stock × cost) WHERE days_of_stock > 180',     'ci_daily_inventory','cents',    'snapshot', 'variant',    'worse',   NULL),
('stockout_rate',       'inventory', 'A', 'Stockout Rate',      'Uitvoorraadpercentage', 'variants_at_zero / total_variants',               'ci_daily_inventory','pct',      'rate',     'global',     'worse',   NULL),
('otif',                'inventory', 'A', 'OTIF',               'OTIF',                  'on_time_in_full / total_shipments',               'ci_daily_fulfilment','pct',     'rate',     'global',     'better',  NULL),
('promise_accuracy',    'inventory', 'A', 'Promise Accuracy',   'Belofte nauwkeurigheid','delivered_on_promise / total_orders',              'ci_daily_fulfilment','pct',     'rate',     'global',     'better',  NULL),
('avg_pick_to_ship_h',  'inventory', 'A', 'Avg Pick-to-Ship',   'Gem. pick-to-ship',    'AVG(shipped_at - picked_at)',                     'ci_daily_fulfilment','hours',    'avg',      'order',      'worse',   NULL),
('op_return_rate',      'inventory', 'A', 'Return Rate (Ops)',   'Retourpercentage (ops)','returned_orders / total_orders',                  'ci_daily_fulfilment','pct',     'rate',     'global',     'worse',   15),
('refund_lead_time_d',  'inventory', 'A', 'Refund Lead Time',   'Restitutie doorlooptijd','AVG(refund_date - return_date)',                  'ci_daily_fulfilment','days',    'avg',      'order',      'worse',   NULL),
('damage_rate',         'inventory', 'A', 'Damage Rate',        'Schadepercentage',      'damaged_returns / total_returns',                  'ci_daily_fulfilment','pct',     'rate',     'global',     'worse',   NULL),

-- ── §3.8 Search & Discovery — 7 metrics ──
('searches',            'search', 'B', 'Searches',             'Zoekopdrachten',        'COUNT(search_event)',                              'ci_daily_search',   'count',    'sum',      'query',      'neutral', NULL),
('unique_queries',      'search', 'B', 'Unique Queries',       'Unieke zoekopdrachten', 'COUNT(DISTINCT query_normalised)',                 'ci_daily_search',   'count',    'sum',      'query',      'neutral', NULL),
('no_result_rate',      'search', 'B', 'No-Result Rate',       '0-resultaten %',        'zero_result_searches / searches',                  'ci_daily_search',   'pct',      'rate',     'global',     'worse',   NULL),
('search_ctr',          'search', 'B', 'Search CTR',           'Zoek-CTR',              'clicked_results / searches',                       'ci_daily_search',   'pct',      'rate',     'global',     'better',  NULL),
('search_to_cart',      'search', 'B', 'Search → Cart',        'Zoek → Winkelwagen',    'search_cart_adds / searches',                      'ci_daily_search',   'pct',      'rate',     'global',     'better',  NULL),
('search_to_order',     'search', 'X', 'Search → Order',       'Zoek → Bestelling',     'search_orders / searches',                         'ci_daily_search',   'pct',      'rate',     'global',     'better',  NULL),
('refinement_rate',     'search', 'B', 'Refinement Rate',      'Verfijningspercentage', 'refined_searches / searches',                      'ci_daily_search',   'pct',      'rate',     'global',     'neutral', NULL),

-- ── §3.9 Fitment (DESShop-specific) — 5 metrics ──
('fitment_coverage',    'fitment', 'A', 'Fitment Coverage',    'Fitment dekking',       'variants_with_fitment / total_variants',           'ci_daily_product',  'pct',      'rate',     'global',     'better',  NULL),
('fitment_confirmed_rate','fitment','X','Fitment Confirmed %', 'Fitment bevestigd %',   'confirmed_fits / fit_checks',                     'ci_daily_product',  'pct',      'rate',     'variant',    'better',  NULL),
('fitment_cvr_lift',    'fitment', 'X', 'Fitment CVR Lift',    'Fitment conversielift', 'cvr_with_fitment / cvr_without_fitment - 1',      'ci_daily_product',  'pct',      'rate',     'global',     'better',  NULL),
('wrong_part_return_rate','fitment','A','Wrong Part Return %', 'Verkeerd onderdeel retour %','wrong_part_returns / total_returns',           'ci_daily_product',  'pct',      'rate',     'global',     'worse',   NULL),
('oem_xref_coverage',   'fitment', 'A', 'OEM Xref Coverage',  'OEM kruisverwijzing %', 'variants_with_oem_xref / total_variants',          'ci_daily_product',  'pct',      'rate',     'global',     'better',  NULL)

ON CONFLICT (metric_id) DO UPDATE SET
  domain       = EXCLUDED.domain,
  plane        = EXCLUDED.plane,
  name_en      = EXCLUDED.name_en,
  name_nl      = EXCLUDED.name_nl,
  formula      = EXCLUDED.formula,
  source_table = EXCLUDED.source_table,
  unit         = EXCLUDED.unit,
  aggregation  = EXCLUDED.aggregation,
  grain        = EXCLUDED.grain,
  higher_is    = EXCLUDED.higher_is,
  shrinkage_k  = EXCLUDED.shrinkage_k,
  version      = ci_metric_def.version + CASE
                   WHEN ci_metric_def.formula <> EXCLUDED.formula THEN 1
                   ELSE 0
                 END,
  updated_at   = now();


-- ── ROLLBACK ──
-- DELETE FROM bop_objects WHERE object_id = 'table:ci_metric_def';
-- DROP POLICY IF EXISTS ci_metric_def_read_all ON ci_metric_def;
-- DROP TABLE IF EXISTS ci_metric_def;

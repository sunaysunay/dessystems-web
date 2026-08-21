import ws from 'ws';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { realtime: { transport: ws as any } } as any,
);

type Step = {
  module_code: string;
  submodule: string;
  step_order: number;
  title: string;
  body: string;
  target_selector: string | null;
  doc_link: string;
  screen_path: string;
};

const steps: Step[] = [
  // 1_masterdata
  { module_code: 'SHP', submodule: '1_masterdata', step_order: 1, title: 'Product Catalog', body: 'Browse and manage your product catalog. Use filters to find items by brand, category, or status. Click any product to edit its details, pricing, and images.', target_selector: '[data-tour="products-grid"]', doc_link: '/console/sys/docs?module=SHP&q=product+catalog', screen_path: '/console/shp/products' },
  { module_code: 'SHP', submodule: '1_masterdata', step_order: 2, title: 'Brand Management', body: 'Manage brand registrations. Each brand has an authorization status that determines whether its products can be listed.', target_selector: '[data-tour="brands-grid"]', doc_link: '/console/sys/docs?module=SHP&q=brand+authorization', screen_path: '/console/shp/brands' },
  { module_code: 'SHP', submodule: '1_masterdata', step_order: 3, title: 'Customer Records', body: 'View and manage customer accounts. Search by name or email. Customer records include order history, addresses, and GDPR consent status.', target_selector: '[data-tour="customers-grid"]', doc_link: '/console/sys/docs?module=SHP&q=customer+management', screen_path: '/console/shp/customers' },

  // 2_procurement
  { module_code: 'SHP', submodule: '2_procurement', step_order: 1, title: 'Purchase Orders', body: 'Create purchase orders to replenish stock. Select a supplier, add lines with quantities and prices, then submit for approval.', target_selector: '[data-tour="po-grid"]', doc_link: '/console/sys/docs?module=SHP&q=purchase+order', screen_path: '/console/shp/procure' },
  { module_code: 'SHP', submodule: '2_procurement', step_order: 2, title: 'Goods-In Processing', body: 'Record incoming deliveries. Match received quantities against the purchase order and flag any discrepancies.', target_selector: '[data-tour="goods-in-grid"]', doc_link: '/console/sys/docs?module=SHP&q=goods+receipt', screen_path: '/console/shp/procure' },
  { module_code: 'SHP', submodule: '2_procurement', step_order: 3, title: 'Supplier Catalog', body: 'Browse supplier catalogs and compare pricing. Use this to find new products or check availability before creating a purchase order.', target_selector: '[data-tour="catalog-grid"]', doc_link: '/console/sys/docs?module=SHP&q=supplier+catalog', screen_path: '/console/shp/procure' },
  { module_code: 'SHP', submodule: '2_procurement', step_order: 4, title: 'Demand Planning', body: 'Review demand forecasts based on sales velocity. The system suggests reorder quantities — adjust and convert to purchase orders.', target_selector: '[data-tour="demand-grid"]', doc_link: '/console/sys/docs?module=SHP&q=demand+planning', screen_path: '/console/shp/procure' },

  // 3_warehouse
  { module_code: 'SHP', submodule: '3_warehouse', step_order: 1, title: 'Inventory Overview', body: "View stock levels across all locations. The 'available' column shows on_hand minus reserved — this is what customers can buy.", target_selector: '[data-tour="inventory-grid"]', doc_link: '/console/sys/docs?module=SHP&q=inventory+levels', screen_path: '/console/shp/inventory' },
  { module_code: 'SHP', submodule: '3_warehouse', step_order: 2, title: 'Stock Reservations', body: 'Stock reservations are created automatically at checkout (60-min TTL). Expired reservations are released by the maintenance cron.', target_selector: null, doc_link: '/console/sys/docs?module=SHP&q=stock+reservation', screen_path: '/console/shp/inventory' },
  { module_code: 'SHP', submodule: '3_warehouse', step_order: 3, title: 'Stock Adjustments', body: 'Use adjustments to correct inventory counts after physical checks. Every adjustment requires a reason code for audit trail.', target_selector: null, doc_link: '/console/sys/docs?module=SHP&q=stock+adjustment', screen_path: '/console/shp/inventory' },

  // 4_sales
  { module_code: 'SHP', submodule: '4_sales', step_order: 1, title: 'Order Management', body: 'All customer orders. Filter by status to find orders needing attention. Click an order number to see full details, timeline, and available actions.', target_selector: '[data-tour="orders-grid"]', doc_link: '/console/sys/docs?module=SHP&q=order+management', screen_path: '/console/shp/orders' },
  { module_code: 'SHP', submodule: '4_sales', step_order: 2, title: 'Order Lifecycle', body: 'The order follows a 9-state lifecycle: draft → pending_payment → paid → shipped → delivered → completed. Use on_hold as an escape hatch for investigation.', target_selector: null, doc_link: '/console/sys/docs?module=SHP&q=order+lifecycle', screen_path: '/console/shp/orders' },
  { module_code: 'SHP', submodule: '4_sales', step_order: 3, title: 'Order Actions', body: 'From the order detail page you can add notes, trigger shipping, issue refunds, or place the order on hold. Each action is logged in the timeline.', target_selector: null, doc_link: '/console/sys/docs?module=SHP&q=order+actions', screen_path: '/console/shp/orders' },

  // 5_shipping
  { module_code: 'SHP', submodule: '5_shipping', step_order: 1, title: 'Fulfilment Queue', body: 'Select paid orders ready for fulfilment. The system creates Sendcloud shipping labels automatically.', target_selector: '[data-tour="fulfil-grid"]', doc_link: '/console/sys/docs?module=SHP&q=fulfilment', screen_path: '/console/shp/fulfil' },
  { module_code: 'SHP', submodule: '5_shipping', step_order: 2, title: 'Picking & Packing', body: 'Print pick lists and packing slips. Mark items as picked to advance the fulfilment flow.', target_selector: null, doc_link: '/console/sys/docs?module=SHP&q=picking+packing', screen_path: '/console/shp/fulfil' },
  { module_code: 'SHP', submodule: '5_shipping', step_order: 3, title: 'Shipping Labels', body: 'Labels are generated via Sendcloud. Track shipment status in real time — the carrier updates are synced automatically.', target_selector: null, doc_link: '/console/sys/docs?module=SHP&q=shipping+labels', screen_path: '/console/shp/fulfil' },

  // 6_finance
  { module_code: 'SHP', submodule: '6_finance', step_order: 1, title: 'Invoices', body: 'Invoices are generated automatically when payment is confirmed. Each has a gapless sequential number — corrections are made via credit notes, never by editing.', target_selector: '[data-tour="invoices-grid"]', doc_link: '/console/sys/docs?module=SHP&q=invoices', screen_path: '/console/shp/finance' },
  { module_code: 'SHP', submodule: '6_finance', step_order: 2, title: 'Credit Notes', body: 'Credit notes are issued automatically with each refund. They reference the original invoice and are emailed to the customer.', target_selector: null, doc_link: '/console/sys/docs?module=SHP&q=credit+notes', screen_path: '/console/shp/finance' },
  { module_code: 'SHP', submodule: '6_finance', step_order: 3, title: 'VAT & OSS', body: 'Monitor your OSS threshold (€10,000 cross-border B2C). Below the threshold, NL VAT applies to all EU orders.', target_selector: null, doc_link: '/console/sys/docs?module=SHP&q=vat+oss+threshold', screen_path: '/console/shp/finance' },
  { module_code: 'SHP', submodule: '6_finance', step_order: 4, title: 'Margin Analysis', body: 'Review product margins across time periods. The margin view factors in purchase cost, shipping, platform fees, and returns.', target_selector: null, doc_link: '/console/sys/docs?module=SHP&q=margin+analysis', screen_path: '/console/shp/finance' },

  // 7_aftersales
  { module_code: 'SHP', submodule: '7_aftersales', step_order: 1, title: 'Return Requests', body: "Track return requests through the 9-state RMA flow. The 14-day refund clock starts when you approve a return — check the 'due' filter for approaching deadlines.", target_selector: '[data-tour="returns-grid"]', doc_link: '/console/sys/docs?module=SHP&q=return+rma', screen_path: '/console/shp/aftersales' },
  { module_code: 'SHP', submodule: '7_aftersales', step_order: 2, title: 'Refund Processing', body: 'Execute refunds here. The system checks for open returns (withhold gate) and caps the amount at the original payment minus prior refunds.', target_selector: null, doc_link: '/console/sys/docs?module=SHP&q=refund+processing', screen_path: '/console/shp/aftersales' },
  { module_code: 'SHP', submodule: '7_aftersales', step_order: 3, title: 'Inspections', body: 'Record inspection results when a returned package arrives. The outcome determines whether to approve the refund or reject.', target_selector: null, doc_link: '/console/sys/docs?module=SHP&q=return+inspection', screen_path: '/console/shp/aftersales' },
  { module_code: 'SHP', submodule: '7_aftersales', step_order: 4, title: 'Supplier Claims', body: 'File claims against suppliers for defective products. Link the claim to the return and the original purchase order for traceability.', target_selector: null, doc_link: '/console/sys/docs?module=SHP&q=supplier+claims', screen_path: '/console/shp/aftersales' },

  // 8_compliance
  { module_code: 'SHP', submodule: '8_compliance', step_order: 1, title: 'GDPR Requests', body: 'Handle customer data requests: export (30-day deadline) and erasure. All actions are logged with timestamps.', target_selector: '[data-tour="gdpr-grid"]', doc_link: '/console/sys/docs?module=SHP&q=gdpr+data+requests', screen_path: '/console/shp/compliance' },
  { module_code: 'SHP', submodule: '8_compliance', step_order: 2, title: 'Product Registrations', body: 'GPSR compliance records. Products without valid safety data are automatically blocked from publication.', target_selector: null, doc_link: '/console/sys/docs?module=SHP&q=gpsr+registration', screen_path: '/console/shp/compliance' },
  { module_code: 'SHP', submodule: '8_compliance', step_order: 3, title: 'Eco Fees & EPR', body: 'Track extended producer responsibility registrations and eco-contribution fees per market. Missing registrations trigger compliance alerts.', target_selector: null, doc_link: '/console/sys/docs?module=SHP&q=epr+eco+fees', screen_path: '/console/shp/compliance' },
];

async function seed() {
  console.log(`Seeding ${steps.length} guide steps...`);

  const { error } = await supabase
    .from('guide_steps')
    .upsert(steps, { onConflict: 'module_code,submodule,step_order' });

  if (error) {
    console.error('Seed failed:', error.message);
    process.exit(1);
  }

  console.log('Done — guide steps seeded successfully.');
}

seed();

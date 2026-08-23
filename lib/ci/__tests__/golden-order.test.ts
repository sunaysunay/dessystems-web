/**
 * CI-T02 — Golden Order Fixture: DES-TEST-0001
 *
 * Run:  npx tsx lib/ci/__tests__/golden-order.test.ts
 *
 * Verifies the contribution waterfall produces exactly €67.91 (6791 cents)
 * using integer-only arithmetic — no floats, no DB.
 *
 * Order DES-TEST-0001, 2026-06-15, NL, iDEAL:
 *   Line 1: variant A ×2 @ €74.50 net, landed €41.20, discount €5.00
 *   Line 2: variant B ×1 @ €129.00 net, landed €88.00
 *   Shipping: charged €6.95 net, actual carrier €8.40
 *   VAT 21%, Mollie iDEAL fee €0.29
 *   Pick-pack: €0.85/line + €0.15/unit
 *   Return: line 1 ×1 returned (wrong_fit, restock ok)
 */

// ── Fixture data ──

const LINE_1 = {
  qty_ordered: 2,
  qty_returned: 1,
  unit_net_cents: 7450,
  line_net_cents: 14900,
  discount_net_cents: 500,
  landed_unit_cost_cents: 4120,
};

const LINE_2 = {
  qty_ordered: 1,
  qty_returned: 0,
  unit_net_cents: 12900,
  line_net_cents: 12900,
  discount_net_cents: 0,
  landed_unit_cost_cents: 8800,
};

const SHIPPING_CHARGED_CENTS = 695;
const SHIPPING_ACTUAL_CENTS = 840;
const MOLLIE_IDEAL_FIXED_CENTS = 29;
const PICKPACK_PER_LINE_CENTS = 85;
const PICKPACK_PER_UNIT_CENTS = 15;

// ── Order-level waterfall (matching §13.1 exactly) ──

const grossSales = LINE_1.line_net_cents + LINE_2.line_net_cents;

const discountTotal = LINE_1.discount_net_cents + LINE_2.discount_net_cents;

// Return deduction is discount-adjusted: customer paid (line - discount)/qty per unit
const returnLine1 = Math.round(
  ((LINE_1.line_net_cents - LINE_1.discount_net_cents) / LINE_1.qty_ordered)
  * LINE_1.qty_returned,
);

const returnTotal = returnLine1; // only line 1 has a return

const netSales = grossSales - discountTotal - returnTotal;

// COGS uses settled qty
const cogsLine1 = LINE_1.landed_unit_cost_cents * (LINE_1.qty_ordered - LINE_1.qty_returned);
const cogsLine2 = LINE_2.landed_unit_cost_cents * (LINE_2.qty_ordered - LINE_2.qty_returned);
const cogs = cogsLine1 + cogsLine2;

const grossMargin = netSales - cogs;

// Shipping delta at order level (no per-line rounding)
const shippingDelta = SHIPPING_CHARGED_CENTS - SHIPPING_ACTUAL_CENTS;

const paymentFee = MOLLIE_IDEAL_FIXED_CENTS;

// Pick-pack per line + per unit
const pickpackLine1 = PICKPACK_PER_LINE_CENTS + (PICKPACK_PER_UNIT_CENTS * LINE_1.qty_ordered);
const pickpackLine2 = PICKPACK_PER_LINE_CENTS + (PICKPACK_PER_UNIT_CENTS * LINE_2.qty_ordered);
const pickpack = pickpackLine1 + pickpackLine2;

const contribution = grossMargin + shippingDelta - paymentFee - pickpack;

// ── Assertions ──

let passed = 0;
let failed = 0;

function assert(name: string, actual: number, expected: number) {
  if (actual === expected) {
    passed++;
  } else {
    failed++;
    console.error(`FAIL: ${name} — expected ${expected} (€${(expected/100).toFixed(2)}), got ${actual} (€${(actual/100).toFixed(2)})`);
  }
}

// §13.1 expected results (all in cents)
assert('gross_sales',         grossSales,     27800);
assert('discount_total',      discountTotal,    500);
assert('return_deduction',    returnTotal,     7200);  // (14900-500)/2 × 1
assert('net_sales (settled)', netSales,       20100);
assert('cogs (settled)',      cogs,           12920);
assert('gross_margin',        grossMargin,     7180);
assert('shipping_delta',     shippingDelta,    -145);
assert('payment_fee',        paymentFee,         29);
assert('pick_pack',          pickpack,          215);
assert('contribution',       contribution,     6791);

// Line-level settled quantities
assert('line1 qty_settled',  LINE_1.qty_ordered - LINE_1.qty_returned, 1);
assert('line2 qty_settled',  LINE_2.qty_ordered - LINE_2.qty_returned, 1);

// Line-level net revenue
const line1NetRevenue = LINE_1.line_net_cents - LINE_1.discount_net_cents - returnLine1;
const line2NetRevenue = LINE_2.line_net_cents - LINE_2.discount_net_cents;
assert('line1 net_revenue',  line1NetRevenue,  7200);  // 14900 - 500 - 7200
assert('line2 net_revenue',  line2NetRevenue, 12900);

// COGS
assert('line1 cogs',         cogsLine1,       4120);  // 4120 × 1
assert('line2 cogs',         cogsLine2,       8800);  // 8800 × 1

// Pickpack breakdown
assert('line1 pickpack',     pickpackLine1,    115);  // 85 + 15×2
assert('line2 pickpack',     pickpackLine2,    100);  // 85 + 15×1

// Verify the waterfall identity
assert('waterfall identity',
  netSales - cogs + shippingDelta - paymentFee - pickpack,
  6791,
);

console.log(`\n${passed} passed, ${failed} failed`);
if (contribution !== 6791) {
  console.error(`\nCRITICAL: contribution must be exactly €67.91 (6791 cents), got ${contribution}`);
}
if (failed > 0) process.exit(1);

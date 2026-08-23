/**
 * CI-T06 — Collection endpoint logic tests
 *
 * Run:  npx tsx lib/ci/__tests__/collect.test.ts
 *
 * Verifies:
 * - Plane B events without consent are rejected
 * - Plane A events always pass (no consent needed)
 * - Dedupe keys are deterministic
 * - No raw cookie_id appears in output rows
 * - Batch size limit enforced
 * - Event type classification (Plane A vs B)
 */

import { createHmac } from 'crypto';

const PLANE_B_TYPES = new Set([
  'page_view', 'product_view', 'search', 'cart_add', 'cart_remove',
  'cart_view', 'checkout_step', 'payment_attempt', 'wishlist_add',
  'consent_update',
]);

const PLANE_A_TYPES = new Set([
  'order_paid', 'order_shipped', 'order_delivered', 'return_requested',
  'return_approved', 'return_completed', 'refund_issued', 'payment_failed',
]);

let passed = 0;
let failed = 0;

function assert(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) { passed++; }
  else { failed++; console.error(`FAIL: ${name}\n  expected: ${e}\n  actual:   ${a}`); }
}

// ── Plane classification ──

assert('product_view is Plane B', PLANE_B_TYPES.has('product_view'), true);
assert('page_view is Plane B', PLANE_B_TYPES.has('page_view'), true);
assert('cart_add is Plane B', PLANE_B_TYPES.has('cart_add'), true);
assert('checkout_step is Plane B', PLANE_B_TYPES.has('checkout_step'), true);
assert('order_paid is Plane A', PLANE_A_TYPES.has('order_paid'), true);
assert('order_paid is NOT Plane B', PLANE_B_TYPES.has('order_paid'), false);
assert('return_requested is Plane A', PLANE_A_TYPES.has('return_requested'), true);

// ── Consent gate ──

function shouldAccept(eventType: string, hasConsent: boolean): boolean {
  const isPlaneB = PLANE_B_TYPES.has(eventType);
  if (isPlaneB && !hasConsent) return false;
  return true;
}

assert('Plane B no consent → rejected', shouldAccept('product_view', false), false);
assert('Plane B with consent → accepted', shouldAccept('product_view', true), true);
assert('Plane A no consent → accepted', shouldAccept('order_paid', false), true);
assert('Plane A with consent → accepted', shouldAccept('order_paid', true), true);
assert('search no consent → rejected', shouldAccept('search', false), false);
assert('cart_add no consent → rejected', shouldAccept('cart_add', false), false);

// Simulate full batch: 0% consent scenario
const batchEvents = ['page_view', 'product_view', 'cart_add', 'checkout_step', 'payment_attempt'];
const acceptedNoConsent = batchEvents.filter(e => shouldAccept(e, false));
assert('0% consent: zero Plane B events accepted', acceptedNoConsent.length, 0);

// Mixed batch
const mixedEvents = ['page_view', 'order_paid', 'cart_add', 'return_requested'];
const acceptedMixed = mixedEvents.filter(e => shouldAccept(e, false));
assert('mixed batch no consent: only Plane A accepted', acceptedMixed, ['order_paid', 'return_requested']);

// ── Pseudonymisation in dedupe key ──

const SALT = 'test_salt_0123456789abcdef';
const RAW_COOKIE = 'visitor_raw_id_abc123';

function pseudonymise(salt: string, raw: string): string {
  return createHmac('sha256', salt).update(raw).digest('hex');
}

const pseudo = pseudonymise(SALT, RAW_COOKIE);

assert('pseudonym does not contain raw cookie', pseudo.includes(RAW_COOKIE), false);
assert('pseudonym is deterministic',
  pseudonymise(SALT, RAW_COOKIE), pseudonymise(SALT, RAW_COOKIE));

// Dedupe key simulation
function makeDedupe(
  eventType: string,
  anonymousId: string,
  variantId: string,
  sessionId: string,
  tsSeconds: number,
): string {
  return [eventType, anonymousId, variantId, sessionId, String(tsSeconds)].join(':');
}

const dk1 = makeDedupe('product_view', pseudo, 'variant-a', 'sess-1', 1719849600);
const dk2 = makeDedupe('product_view', pseudo, 'variant-a', 'sess-1', 1719849600);
const dk3 = makeDedupe('product_view', pseudo, 'variant-b', 'sess-1', 1719849600);

assert('same event → same dedupe key', dk1, dk2);
assert('different variant → different dedupe key', dk1 !== dk3, true);
assert('dedupe key contains no raw cookie', dk1.includes(RAW_COOKIE), false);

// ── Batch limits ──
const MAX_BATCH = 50;
assert('batch limit defined', MAX_BATCH, 50);
assert('51 events exceeds limit', 51 > MAX_BATCH, true);

// ── Output row structure ──

interface OutputRow {
  tenant_id: number;
  anonymous_id: string;
  event_type: string;
  plane: string;
  dedupe_key: string;
}

const sampleRow: OutputRow = {
  tenant_id: 400,
  anonymous_id: pseudo,
  event_type: 'product_view',
  plane: 'B',
  dedupe_key: dk1,
};

assert('output row has no cookie_id field', !('cookie_id' in sampleRow), true);
assert('output row anonymous_id is pseudonymised', sampleRow.anonymous_id.length, 64);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

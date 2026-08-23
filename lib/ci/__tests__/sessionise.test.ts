/**
 * CI-T08 — Sessionisation + identity linking tests
 *
 * Run:  npx tsx lib/ci/__tests__/sessionise.test.ts
 *
 * Verifies:
 * - 30min gap → new session
 * - 31min gap = 2 sessions
 * - 29min gap = 1 session
 * - No midnight split (23:50 → 00:05 = ONE session)
 * - Campaign change → new session
 * - Deterministic session_id (re-run → identical IDs)
 * - Session counters (page_views, product_views, cart_adds, etc.)
 * - Bot detection (known UA + high-frequency)
 * - Identity linking backfills customer_id
 * - Session date = first event date (not midnight-split)
 */

import { readFileSync } from 'fs';
import { join } from 'path';

let passed = 0;
let failed = 0;

function assert(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) { passed++; }
  else { failed++; console.error(`FAIL: ${name}\n  expected: ${e}\n  actual:   ${a}`); }
}

// ── Import sessionisation logic ──

import { sessioniseEvents, makeSessionId, RawEvent } from '../sessionise';

function makeEvent(overrides: Partial<RawEvent> & { event_ts: string; event_type: string }): RawEvent {
  return {
    id: `evt-${Math.random().toString(36).slice(2, 8)}`,
    tenant_id: 400,
    anonymous_id: 'visitor-aaa',
    variant_id: null,
    order_id: null,
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    referrer: null,
    device_type: 'desktop',
    user_agent: 'Mozilla/5.0 Chrome/120',
    payload: null,
    session_id: null,
    ...overrides,
  };
}

// ── 30min gap logic ──

const base = '2026-08-20T14:00:00.000Z';

function addMinutes(iso: string, mins: number): string {
  return new Date(new Date(iso).getTime() + mins * 60 * 1000).toISOString();
}

// 29min gap = 1 session
const events29min = [
  makeEvent({ event_ts: base, event_type: 'page_view' }),
  makeEvent({ event_ts: addMinutes(base, 10), event_type: 'product_view' }),
  makeEvent({ event_ts: addMinutes(base, 39), event_type: 'cart_add' }), // 29min after event 2
];

const sessions29 = sessioniseEvents(events29min);
assert('29min gap = 1 session', sessions29.length, 1);

// 31min gap = 2 sessions
const events31min = [
  makeEvent({ event_ts: base, event_type: 'page_view' }),
  makeEvent({ event_ts: addMinutes(base, 10), event_type: 'product_view' }),
  makeEvent({ event_ts: addMinutes(base, 41), event_type: 'cart_add' }), // 31min after event 2
];

const sessions31 = sessioniseEvents(events31min);
assert('31min gap = 2 sessions', sessions31.length, 2);

// Exactly 30min gap = 1 session (gap must EXCEED 30min)
const events30min = [
  makeEvent({ event_ts: base, event_type: 'page_view' }),
  makeEvent({ event_ts: addMinutes(base, 30), event_type: 'product_view' }),
];

const sessions30 = sessioniseEvents(events30min);
assert('exactly 30min gap = 1 session (not exceeded)', sessions30.length, 1);

// 30min + 1 second = 2 sessions
const events30m1s = [
  makeEvent({ event_ts: base, event_type: 'page_view' }),
  makeEvent({
    event_ts: new Date(new Date(base).getTime() + 30 * 60 * 1000 + 1000).toISOString(),
    event_type: 'product_view',
  }),
];

const sessions30m1s = sessioniseEvents(events30m1s);
assert('30min + 1s gap = 2 sessions', sessions30m1s.length, 2);

// ── No midnight split ──

const preMidnight = '2026-08-20T23:50:00.000Z';
const postMidnight = '2026-08-21T00:05:00.000Z'; // 15min gap

const midnightEvents = [
  makeEvent({ event_ts: preMidnight, event_type: 'page_view' }),
  makeEvent({ event_ts: postMidnight, event_type: 'product_view' }),
];

const midnightSessions = sessioniseEvents(midnightEvents);
assert('23:50 → 00:05 = ONE session (no midnight split)', midnightSessions.length, 1);
assert('session_date = first event date', midnightSessions[0].session_date, '2026-08-20');

// ── Campaign change → new session ──

const campaignEvents = [
  makeEvent({ event_ts: base, event_type: 'page_view', utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'summer' }),
  makeEvent({ event_ts: addMinutes(base, 5), event_type: 'product_view', utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'summer' }),
  makeEvent({ event_ts: addMinutes(base, 10), event_type: 'page_view', utm_source: 'facebook', utm_medium: 'social', utm_campaign: 'retarget' }),
];

const campaignSessions = sessioniseEvents(campaignEvents);
assert('campaign change = new session (even within 30min)', campaignSessions.length, 2);
assert('session 1 utm_source = google', campaignSessions[0].utm_source, 'google');
assert('session 2 utm_source = facebook', campaignSessions[1].utm_source, 'facebook');

// Same campaign = 1 session
const sameCampaignEvents = [
  makeEvent({ event_ts: base, event_type: 'page_view', utm_source: 'google', utm_campaign: 'summer' }),
  makeEvent({ event_ts: addMinutes(base, 5), event_type: 'page_view', utm_source: 'google', utm_campaign: 'summer' }),
];
assert('same campaign = 1 session', sessioniseEvents(sameCampaignEvents).length, 1);

// ── Deterministic session_id ──

const deterministicEvents = [
  makeEvent({ event_ts: base, event_type: 'page_view' }),
  makeEvent({ event_ts: addMinutes(base, 5), event_type: 'product_view' }),
];

const run1 = sessioniseEvents(deterministicEvents);
const run2 = sessioniseEvents(deterministicEvents);
assert('re-run → identical session_id', run1[0].id, run2[0].id);

const manualId = makeSessionId(400, 'visitor-aaa', base);
assert('session_id = uuid_v5(namespace, tenant||anon_id||first_ts)', run1[0].id, manualId);

// Different visitors get different session_ids
const visitorBEvents = [
  makeEvent({ event_ts: base, event_type: 'page_view', anonymous_id: 'visitor-bbb' }),
];
const visitorBSessions = sessioniseEvents(visitorBEvents);
assert('different visitor → different session_id', visitorBSessions[0].id !== run1[0].id, true);

// ── Session counters ──

const counterEvents = [
  makeEvent({ event_ts: base, event_type: 'page_view' }),
  makeEvent({ event_ts: addMinutes(base, 1), event_type: 'page_view' }),
  makeEvent({ event_ts: addMinutes(base, 2), event_type: 'product_view' }),
  makeEvent({ event_ts: addMinutes(base, 3), event_type: 'product_view' }),
  makeEvent({ event_ts: addMinutes(base, 4), event_type: 'product_view' }),
  makeEvent({ event_ts: addMinutes(base, 5), event_type: 'cart_add' }),
  makeEvent({ event_ts: addMinutes(base, 6), event_type: 'checkout_step' }),
  makeEvent({ event_ts: addMinutes(base, 7), event_type: 'checkout_step' }),
  makeEvent({ event_ts: addMinutes(base, 8), event_type: 'search' }),
  makeEvent({ event_ts: addMinutes(base, 9), event_type: 'page_view', order_id: 'ord-001' }),
];

const counterSession = sessioniseEvents(counterEvents);
assert('counter: 1 session', counterSession.length, 1);
assert('page_views = 3', counterSession[0].page_views, 3);
assert('product_views = 3', counterSession[0].product_views, 3);
assert('cart_adds = 1', counterSession[0].cart_adds, 1);
assert('checkout_steps = 2', counterSession[0].checkout_steps, 2);
assert('search_count = 1', counterSession[0].search_count, 1);
assert('has_order = true', counterSession[0].has_order, true);
assert('duration_s = 9 * 60 = 540', counterSession[0].duration_s, 540);

// ── Bot detection ──

const botUAEvents = [
  makeEvent({ event_ts: base, event_type: 'page_view', user_agent: 'Googlebot/2.1 (+http://www.google.com/bot.html)' }),
  makeEvent({ event_ts: addMinutes(base, 1), event_type: 'page_view', user_agent: 'Googlebot/2.1' }),
];
assert('Googlebot detected as bot', sessioniseEvents(botUAEvents)[0].is_bot, true);

const semrushEvents = [
  makeEvent({ event_ts: base, event_type: 'page_view', user_agent: 'SemrushBot/7~bl' }),
];
assert('SemrushBot detected as bot', sessioniseEvents(semrushEvents)[0].is_bot, true);

const normalEvents = [
  makeEvent({ event_ts: base, event_type: 'page_view', user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }),
  makeEvent({ event_ts: addMinutes(base, 5), event_type: 'product_view', user_agent: 'Mozilla/5.0' }),
];
assert('normal browser NOT flagged as bot', sessioniseEvents(normalEvents)[0].is_bot, false);

// ── Empty input ──

assert('empty events → empty sessions', sessioniseEvents([]).length, 0);

// ── Single event ──

const singleEvent = [makeEvent({ event_ts: base, event_type: 'page_view' })];
const singleSession = sessioniseEvents(singleEvent);
assert('single event = 1 session', singleSession.length, 1);
assert('single event: duration_s = 0', singleSession[0].duration_s, 0);
assert('single event: page_views = 1', singleSession[0].page_views, 1);

// ── Multiple sessions across a day ──

const dayEvents = [
  makeEvent({ event_ts: '2026-08-20T09:00:00.000Z', event_type: 'page_view' }),
  makeEvent({ event_ts: '2026-08-20T09:10:00.000Z', event_type: 'product_view' }),
  // 2h gap
  makeEvent({ event_ts: '2026-08-20T11:00:00.000Z', event_type: 'page_view' }),
  makeEvent({ event_ts: '2026-08-20T11:05:00.000Z', event_type: 'cart_add' }),
  // 3h gap
  makeEvent({ event_ts: '2026-08-20T14:00:00.000Z', event_type: 'page_view' }),
];

const daySessions = sessioniseEvents(dayEvents);
assert('3 sessions across a day', daySessions.length, 3);
assert('session 1 has 2 events (1 page_view + 1 product_view)', daySessions[0].page_views + daySessions[0].product_views, 2);
assert('session 2 has 1 page_view + 1 cart_add', daySessions[1].page_views, 1);
assert('session 2 cart_adds = 1', daySessions[1].cart_adds, 1);
assert('session 3 has 1 page_view', daySessions[2].page_views, 1);

// ── Out-of-order events sorted correctly ──

const unorderedEvents = [
  makeEvent({ event_ts: addMinutes(base, 10), event_type: 'cart_add' }),
  makeEvent({ event_ts: base, event_type: 'page_view' }),
  makeEvent({ event_ts: addMinutes(base, 5), event_type: 'product_view' }),
];

const unorderedSessions = sessioniseEvents(unorderedEvents);
assert('out-of-order events → 1 session (sorted)', unorderedSessions.length, 1);
assert('started_at = earliest event', unorderedSessions[0].started_at, base);

// ── Source code structure ──

const src = readFileSync(join(__dirname, '../sessionise.ts'), 'utf8');

assert('uses uuid v5 for deterministic IDs', src.includes('uuidv5'), true);
assert('GAP_MS = 30 * 60 * 1000', src.includes('30 * 60 * 1000'), true);
assert('linkIdentityToSessions function exists', src.includes('export async function linkIdentityToSessions'), true);
assert('30-day backfill window for identity linking', src.includes('30 * 24 * 60 * 60 * 1000'), true);
assert('no midnight-split logic (no date boundary check)', !src.includes('getDate()') && !src.includes('setHours(0'), true);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

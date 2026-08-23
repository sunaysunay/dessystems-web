/**
 * CI-T17..T24 — Analytics screens tests (SH100–SH109)
 *
 * Run:  npx tsx lib/ci/__tests__/screens.test.ts
 *
 * Verifies:
 * - All 10 pages exist with correct SHxxx component names
 * - Every page: ScreenHeader, DegradedBanner, ForbiddenNote (403 handling)
 * - Screen registry + Shell nav + i18n keys in all 5 console locales
 * - Domain rules: waterfall labels, POAS caption, projection toggle,
 *   DataGrid sortable on every metric
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

let passed = 0;
let failed = 0;

function assert(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) { passed++; }
  else { failed++; console.error(`FAIL: ${name}\n  expected: ${e}\n  actual:   ${a}`); }
}

const root = join(__dirname, '../../..');

const SCREENS: Array<[string, string]> = [
  ['SH100', 'overview'], ['SH101', 'funnel'], ['SH102', 'sales'],
  ['SH103', 'products'], ['SH104', 'customers'], ['SH105', 'traffic'],
  ['SH106', 'checkout'], ['SH107', 'inventory'], ['SH108', 'discovery'],
  ['SH109', 'attention'],
];

// ── Pages ──

for (const [sid, slug] of SCREENS) {
  const p = join(root, `app/console/shp/analytics/${slug}/page.tsx`);
  assert(`${sid} page exists`, existsSync(p), true);
  const src = readFileSync(p, 'utf8');
  assert(`${sid} component named ${sid}Page`, src.includes(`export default function ${sid}Page`), true);
  assert(`${sid} uses ScreenHeader`, src.includes('ScreenHeader'), true);
  assert(`${sid} renders DegradedBanner`, src.includes('DegradedBanner'), true);
  assert(`${sid} handles 403 (ForbiddenNote)`, src.includes('ForbiddenNote'), true);
  assert(`${sid} is a client component`, src.startsWith("'use client'"), true);
}

// ── Screen registry ──

const registry = readFileSync(join(root, 'lib/screen-registry.ts'), 'utf8');
for (const [sid, slug] of SCREENS) {
  assert(`registry has ${sid}`, registry.includes(`'/console/shp/analytics/${slug}': { id: '${sid}'`), true);
}

// ── Shell nav ──

const shell = readFileSync(join(root, 'components/Shell.tsx'), 'utf8');
assert('nav subgroup shopAnalyticsGrp', shell.includes("tg('shopAnalyticsGrp')"), true);
for (const [, slug] of SCREENS) {
  assert(`nav links /console/shp/analytics/${slug}`, shell.includes(`/console/shp/analytics/${slug}`), true);
}

// ── i18n: 5 console locales carry nav + group + screen titles ──

const NAV_KEYS = [
  'shopAnalyticsOverview', 'shopAnalyticsFunnel', 'shopAnalyticsSales',
  'shopAnalyticsProducts', 'shopAnalyticsCustomers', 'shopAnalyticsTraffic',
  'shopAnalyticsCheckout', 'shopAnalyticsInventory', 'shopAnalyticsDiscovery',
  'shopAnalyticsAttention',
];

for (const loc of ['nl', 'en', 'de', 'fr', 'tr']) {
  const m = JSON.parse(readFileSync(join(root, `messages/${loc}.json`), 'utf8'));
  for (const k of NAV_KEYS) {
    assert(`${loc}: nav.${k}`, typeof m.nav?.[k] === 'string' && m.nav[k].length > 0, true);
  }
  assert(`${loc}: groups.shopAnalyticsGrp`, typeof m.groups?.shopAnalyticsGrp === 'string', true);
  for (const [sid] of SCREENS) {
    assert(`${loc}: screens.${sid}`, typeof m.screens?.[sid] === 'string' && m.screens[sid].length > 0, true);
  }
}

// ── Domain rules per screen ──

const sales = readFileSync(join(root, 'app/console/shp/analytics/sales/page.tsx'), 'utf8');
assert('SH102 waterfall renders contribution step green', sales.includes("s.step === 'contribution'"), true);

const funnel = readFileSync(join(root, 'app/console/shp/analytics/funnel/page.tsx'), 'utf8');
assert('SH101 projection is an explicit toggle', funnel.includes('Show consent-projected CVR'), true);
assert('SH101 shows projection basis when on', funnel.includes('projection_basis'), true);
assert('SH101 plane badges on stages', funnel.includes('PlaneBadge'), true);

const traffic = readFileSync(join(root, 'app/console/shp/analytics/traffic/page.tsx'), 'utf8');
assert('SH105 POAS footnote = contribution / spend', traffic.includes('POAS = contribution / spend'), true);

const products = readFileSync(join(root, 'app/console/shp/analytics/products/page.tsx'), 'utf8');
assert('SH103 uses DataGrid', products.includes('DataGrid'), true);
const sortableCount = (products.match(/sortable: true/g) || []).length;
assert('SH103 sortable on every metric (9 columns)', sortableCount >= 9, true);

const overview = readFileSync(join(root, 'app/console/shp/analytics/overview/page.tsx'), 'utf8');
assert('SH100 has 8 KpiCards', (overview.match(/<KpiCard /g) || []).length, 8);
assert('SH100 consent badge', overview.includes('ConsentCoverageBadge'), true);
assert('SH100 health score', overview.includes('health_score'), true);

// ── Shared client helpers ──

const shared = readFileSync(join(root, 'components/ci/analytics.tsx'), 'utf8');
assert('degraded banner text per §10', shared.includes('Figures under reconciliation — do not use for decisions'), true);
assert('useAnalytics handles 403', shared.includes('res.status === 403'), true);
assert('EUR formatting nl-NL', shared.includes("'nl-NL', { style: 'currency', currency: 'EUR' }"), true);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

/**
 * CI-T15 — Analytics API layer tests
 *
 * Run:  npx tsx lib/ci/__tests__/analytics-api.test.ts
 *
 * Verifies:
 * - PBAC: role without analytics view → denied; viewer can view; matrix sane
 * - All 10 routes exist, use analyticsRoute factory with correct module scope
 * - Cache key includes last aggregate run (invalidates on new run)
 * - degraded flag propagated from isDataHealthy
 * - Non-negotiable #3: no route reads ci_events
 * - Shared date-range contract
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { canAccess, MODULES } from '../../pbac';

let passed = 0;
let failed = 0;

function assert(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) { passed++; }
  else { failed++; console.error(`FAIL: ${name}\n  expected: ${e}\n  actual:   ${a}`); }
}

// ── PBAC matrix ──

const SCOPES = [
  'analytics.overview', 'analytics.funnel', 'analytics.sales', 'analytics.product',
  'analytics.customer', 'analytics.traffic', 'analytics.checkout',
  'analytics.inventory', 'analytics.discovery', 'analytics.attention',
];

for (const scope of SCOPES) {
  assert(`${scope} registered in MODULES`, (MODULES as readonly string[]).includes(scope), true);
  assert(`viewer can view ${scope}`, canAccess('viewer' as any, scope, 'view'), true);
}

assert('viewer cannot edit attention', canAccess('viewer' as any, 'analytics.attention', 'edit'), false);
assert('tenant_manager can edit attention', canAccess('tenant_manager' as any, 'analytics.attention', 'edit'), true);
assert('viewer cannot view dsr', canAccess('viewer' as any, 'analytics.dsr', 'view'), false);
assert('tenant_manager cannot view dsr', canAccess('tenant_manager' as any, 'analytics.dsr', 'view'), false);
assert('platform_admin can view dsr', canAccess('platform_admin' as any, 'analytics.dsr', 'view'), true);
assert('super_admin can approve dsr', canAccess('super_admin' as any, 'analytics.dsr', 'approve'), true);

// ── Guard behaviour (source-level) ──

const api = readFileSync(join(__dirname, '../analytics-api.ts'), 'utf8');

assert('guard reads bop_role cookie (console auth convention)', api.includes("get('bop_role')"), true);
assert('missing role → 401', api.includes('status: 401'), true);
assert('denied role → 403', api.includes('status: 403'), true);
assert('403 body names module+action+role', api.includes("{ error: 'Forbidden', module, action: 'view', role }"), true);

// ── Cache invalidation on new aggregate run ──

assert('cache key includes last aggregate run', api.includes('${aggRun}'), true);
assert('agg run read from ci_job_run success rows', api.includes("eq('job_id', 'daily_aggregate')") && api.includes("eq('status', 'success')"), true);
assert('cache key includes range', api.includes('${range.from}|${range.to}'), true);
assert('cache key includes extra filters', api.includes('${extraParams}'), true);
assert('hard TTL backstop exists', api.includes('CACHE_TTL_MS'), true);
assert('cache size bounded', api.includes('CACHE_MAX'), true);
assert('cache status header', api.includes("'x-ci-cache'"), true);

// ── Degraded propagation ──

assert('handler runs isDataHealthy in parallel', api.includes('isDataHealthy(TENANT_ID)'), true);
assert('degraded flag on every response', api.includes('degraded: health.degraded'), true);
assert('degraded_reason when degraded', api.includes('degraded_reason'), true);

// ── Date-range contract ──

assert('from/to validated as ISO dates', api.includes('YYYY-MM-DD'), true);
assert('default 30-day window', api.includes('-29'), true);
assert('previous period computed for comparisons', api.includes('prevFrom'), true);
assert('range cap 400 days', api.includes('400'), true);

// ── The 10 routes ──

const ROUTES: Array<[string, string]> = [
  ['overview', 'analytics.overview'],
  ['sales', 'analytics.sales'],
  ['funnel', 'analytics.funnel'],
  ['products', 'analytics.product'],
  ['traffic', 'analytics.traffic'],
  ['customers', 'analytics.customer'],
  ['checkout', 'analytics.checkout'],
  ['inventory', 'analytics.inventory'],
  ['discovery', 'analytics.discovery'],
  ['attention', 'analytics.attention'],
];

const routeDir = join(__dirname, '../../..', 'app/api/bop/shop/analytics');

for (const [route, scope] of ROUTES) {
  const path = join(routeDir, route, 'route.ts');
  assert(`route ${route} exists`, existsSync(path), true);
  const src = readFileSync(path, 'utf8');
  assert(`route ${route} uses analyticsRoute factory`, src.includes('analyticsRoute('), true);
  assert(`route ${route} guards scope ${scope}`, src.includes(`'${scope}'`), true);
  assert(`route ${route} is force-dynamic`, src.includes("export const dynamic = 'force-dynamic'"), true);
  assert(`route ${route} never reads ci_events`, src.includes("'ci_events'"), false);
}

// ── Domain rules encoded in routes ──

const salesSrc = readFileSync(join(routeDir, 'sales/route.ts'), 'utf8');
assert('sales waterfall ends at contribution', salesSrc.includes("{ step: 'contribution', cents: contribution }"), true);
assert('waterfall sums exactly (residual bucket)', salesSrc.includes('netSales - cogs - paymentFees - contribution'), true);

const trafficSrc = readFileSync(join(routeDir, 'traffic/route.ts'), 'utf8');
assert('POAS uses contribution not revenue', trafficSrc.includes('(contribution / totalSpend)'), true);
assert('ROAS captioned directional', trafficSrc.includes('directional'), true);

const funnelSrc = readFileSync(join(routeDir, 'funnel/route.ts'), 'utf8');
assert('cvr_projected is opt-in and labelled', funnelSrc.includes('cvr_projected_pct') && funnelSrc.includes('projection_basis'), true);

const jobsSrc = readFileSync(join(routeDir, 'jobs/route.ts'), 'utf8');
assert('jobs route secret-guarded', jobsSrc.includes('x-ci-job-secret'), true);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

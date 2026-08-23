/**
 * CI-T01 cost model — valid_from boundary logic tests.
 *
 * Run:  npx tsx lib/ci/__tests__/cost.test.ts
 *
 * These test the "pick latest row where valid_from <= atDate" logic
 * that getLandedCost and getParam rely on. The boundary logic is
 * replicated here to verify the SQL ordering strategy without needing
 * a live DB.
 */

interface Row { valid_from: string; value: number }

function pickLatest(rows: Row[], atDate: string): Row | null {
  const eligible = rows
    .filter(r => r.valid_from <= atDate)
    .sort((a, b) => b.valid_from.localeCompare(a.valid_from));
  return eligible[0] ?? null;
}

function pickLatestPerKey(
  rows: { key: string; valid_from: string; value: number }[],
  atDate: string,
): Record<string, number> {
  const sorted = rows
    .filter(r => r.valid_from <= atDate)
    .sort((a, b) => b.valid_from.localeCompare(a.valid_from));
  const result: Record<string, number> = {};
  for (const r of sorted) {
    if (!(r.key in result)) result[r.key] = r.value;
  }
  return result;
}

let passed = 0;
let failed = 0;

function assert(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    passed++;
  } else {
    failed++;
    console.error(`FAIL: ${name}\n  expected: ${e}\n  actual:   ${a}`);
  }
}

const costs: Row[] = [
  { valid_from: '2024-01-01', value: 10.00 },
  { valid_from: '2024-06-15', value: 12.50 },
  { valid_from: '2025-01-01', value: 11.00 },
];

assert('exact match picks that row',
  pickLatest(costs, '2024-06-15')?.value, 12.50);

assert('between dates picks earlier',
  pickLatest(costs, '2024-09-01')?.value, 12.50);

assert('before all rows returns null',
  pickLatest(costs, '2023-12-31'), null);

assert('far future picks latest row',
  pickLatest(costs, '2030-01-01')?.value, 11.00);

assert('day before second row picks first',
  pickLatest(costs, '2024-06-14')?.value, 10.00);

const params = [
  { key: 'mollie.ideal.fixed', valid_from: '2024-01-01', value: 0.29 },
  { key: 'mollie.ideal.fixed', valid_from: '2025-01-01', value: 0.35 },
  { key: 'pickpack.per_line',  valid_from: '2024-01-01', value: 0.85 },
];

assert('getAllParams mid-2024 picks correct versions',
  pickLatestPerKey(params, '2024-07-01'),
  { 'mollie.ideal.fixed': 0.29, 'pickpack.per_line': 0.85 });

assert('getAllParams 2025 picks updated ideal fee',
  pickLatestPerKey(params, '2025-03-01'),
  { 'mollie.ideal.fixed': 0.35, 'pickpack.per_line': 0.85 });

assert('getAllParams before all returns empty',
  pickLatestPerKey(params, '2023-01-01'), {});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

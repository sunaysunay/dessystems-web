/**
 * CI-T16 — KpiCard + CockpitKit extension tests
 *
 * Run:  npx tsx lib/ci/__tests__/kpi-card.test.ts
 *
 * Verifies:
 * - PlaneBadge, ConsentCoverageBadge, KpiCard exported from CockpitKit
 * - Comparison base is MANDATORY: a KpiCard usage without `base` FAILS
 *   typecheck (real negative-compile test via tsc), a usage with `base` passes
 * - Existing Kpi/Spark/Bars/Dot/RangePicker/Section untouched (extension, not fork)
 */

import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

let passed = 0;
let failed = 0;

function assert(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) { passed++; }
  else { failed++; console.error(`FAIL: ${name}\n  expected: ${e}\n  actual:   ${a}`); }
}

const kitPath = join(__dirname, '../../../components/CockpitKit.tsx');
const kit = readFileSync(kitPath, 'utf8');

// ── Exports ──

assert('PlaneBadge exported', kit.includes('export function PlaneBadge'), true);
assert('ConsentCoverageBadge exported', kit.includes('export function ConsentCoverageBadge'), true);
assert('KpiCard exported', kit.includes('export function KpiCard'), true);
assert('KpiComparisonBase interface exported', kit.includes('export interface KpiComparisonBase'), true);

// ── Extension, not fork: existing primitives intact ──

for (const fn of ['Kpi', 'Spark', 'Bars', 'Dot', 'RangePicker', 'Section']) {
  assert(`existing ${fn} still exported`, kit.includes(`export function ${fn}`), true);
}

// ── Card contract (§7.1) ──

assert('plane prop required (A|B)', kit.includes("plane: 'A' | 'B';"), true);
assert('base prop is non-optional', kit.includes('base: KpiComparisonBase;') && !kit.includes('base?: KpiComparisonBase'), true);
assert('sample size prop n', kit.includes('n?: number;'), true);
assert('suppression support (no default, no extrapolate)', kit.includes('suppressed?: string;'), true);
assert('base label rendered with prev value', kit.includes('{base.label} ({fmt(base.prev)})'), true);
assert('PlaneBadge rendered on card', kit.includes('<PlaneBadge plane={plane} />'), true);

// ── Negative-compile test: card without base MUST fail typecheck ──

function typechecks(snippet: string): boolean {
  // Fixture must live inside the repo so react/jsx-runtime resolves from
  // node_modules during the standalone tsc run.
  const dir = mkdtempSync(join(__dirname, '../../..', '.kpi-lint-'));
  try {
    writeFileSync(join(dir, 'fixture.tsx'), snippet);
    execSync(
      `npx tsc --noEmit --jsx react-jsx --esModuleInterop --moduleResolution bundler ` +
      `--module esnext --target es2022 --skipLibCheck ${join(dir, 'fixture.tsx')}`,
      { cwd: join(__dirname, '../../..'), stdio: 'pipe' },
    );
    return true;
  } catch {
    return false;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const importLine = `import { KpiCard } from '${join(__dirname, '../../../components/CockpitKit')}';`;

const withBase = `${importLine}
export const ok = <KpiCard label="Net Sales" value={48920} plane="A"
  base={{ prev: 42840, label: 'vs prev 30 d', changePct: 14.2 }} n={412} />;`;

const withoutBase = `${importLine}
export const bad = <KpiCard label="Net Sales" value={48920} plane="A" />;`;

assert('card WITH base → typechecks', typechecks(withBase), true);
assert('card WITHOUT base → lint/typecheck FAILURE', typechecks(withoutBase), false);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

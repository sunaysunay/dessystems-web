/**
 * SY051-UX2 — Implementation Cockpit improvements tests
 *
 * Run:  npx tsx lib/ci/__tests__/sy051-ux2.test.ts
 *
 * Verifies against docs/SY051_UX2_UPDATE_PLAN.md acceptance criteria:
 * 1. Back stays inside SY051 (selectProgram(''), no history.back), hidden on main
 * 2. Table default sort updated_at desc
 * 3. Created/Updated/Completed columns present
 * 4. Show done: default unchecked, filters table AND dropdown
 * 5. status→done stamps completed_at, leaving clears it (API)
 * 6. Filters: status multi-select, owner, search, updated-date range
 * 7. Deep link ?program= supported
 * 8. Migration adds completed_at with backfill
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

const root = join(__dirname, '../../..');
const page = readFileSync(join(root, 'app/console/sys/impl/page.tsx'), 'utf8');
const api = readFileSync(join(root, 'app/api/bop/sys/impl/route.ts'), 'utf8');
const mig = readFileSync(join(root, 'sql/sy_module_patch_completed_at.sql'), 'utf8');

// ── 1. Back button ──

assert('Back no longer uses history.back', !page.includes('window.history.back()'), true);
assert('Back returns to main screen', page.includes("onClick={() => selectProgram('')}"), true);
assert('Back hidden on main screen (guarded by selProgramId)', /\{selProgramId && \(\s*<button onClick=\{\(\) => selectProgram\(''\)\}/.test(page), true);

// ── 2. Default sort ──

assert("default sortKey = 'updated_at'", page.includes("useState<string>('updated_at')"), true);
assert("default sortDir = 'desc'", page.includes("useState<'asc' | 'desc'>('desc')"), true);

// ── 3. Date columns ──

assert('Created column', page.includes("th('created_at', 'Created')"), true);
assert('Updated column', page.includes("th('updated_at', 'Updated')"), true);
assert('Completed column', page.includes("th('completed_at', 'Completed')"), true);
assert('Program interface carries the three dates', page.includes('created_at: string | null; updated_at: string | null; completed_at: string | null;'), true);
assert('API enriches programs with dates', api.includes("select('id, scope, created_at, updated_at, completed_at')"), true);

// ── 4. Show done ──

assert('showDone default false', page.includes('useState(false)') && page.includes('const [showDone, setShowDone]'), true);
assert('table hides done unless checked', page.includes("showDone || p.status !== 'done'"), true);
assert('dropdown hides done unless checked (selected kept)', page.includes("showDone || p.status !== 'done' || p.program_id === selProgramId"), true);
const showDoneLabels = (page.match(/Show done/g) || []).length;
assert('Show done checkbox on main screen and by dropdown', showDoneLabels >= 2, true);

// ── 5. completed_at stamping ──

assert('done stamps completed_at', api.includes("statusUpdate.completed_at = status === 'done' ? new Date().toISOString() : null"), true);

// ── 6. Filters ──

assert('status multi-select filter', page.includes('fltStatus.size === 0 || fltStatus.has(p.status)'), true);
assert('owner filter', page.includes('!fltOwner || p.owner === fltOwner'), true);
assert('search on code + title', page.includes('p.code.toLowerCase().includes(q) || t(p.title).toLowerCase().includes(q)'), true);
assert('updated-from filter', page.includes("!fltFrom || (p.updated_at ?? '') >= fltFrom"), true);
assert('updated-to filter', page.includes("!fltTo || (p.updated_at ?? '').slice(0, 10) <= fltTo"), true);
assert('empty state row', page.includes('No implementations match the current filters.'), true);

// ── 7. Deep link ──

assert('reads ?program= on mount', page.includes("get('program')"), true);
assert('selection writes URL', page.includes("url.searchParams.set('program', id)"), true);
assert('clearing selection removes param', page.includes("url.searchParams.delete('program')"), true);

// ── 8. Migration ──

assert('migration adds completed_at', mig.includes('ADD COLUMN IF NOT EXISTS completed_at timestamptz'), true);
assert('migration backfills done programs', mig.includes("SET completed_at = updated_at WHERE status = 'done'"), true);
assert('migration has rollback', mig.includes('-- ROLLBACK:'), true);

// ── Sorting behaviour simulation ──

type Row = { code: string; updated_at: string | null };
const sample: Row[] = [
  { code: 'A', updated_at: '2026-08-01T00:00:00Z' },
  { code: 'B', updated_at: '2026-08-20T00:00:00Z' },
  { code: 'C', updated_at: null },
  { code: 'D', updated_at: '2026-08-15T00:00:00Z' },
];
const sorted = [...sample].sort((a, b) => {
  const av = a.updated_at ?? '';
  const bv = b.updated_at ?? '';
  return -String(av).localeCompare(String(bv)); // desc, mirrors page logic
});
assert('desc sort: newest first', sorted[0].code, 'B');
assert('desc sort: null updated last', sorted[3].code, 'C');

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

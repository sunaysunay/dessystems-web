#!/usr/bin/env node
// bop-inspect score — Phase 4 score aggregation
// Reads latest gate.sh + db + review outputs, computes composite score, persists to qa_scores.
// Usage: bop-inspect score [--triggered-by <label>]

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const OUT_BASE = path.join(__dirname, 'out');
const ENV_FILE = path.join(ROOT, '.env.local');

const env = {};
fs.readFileSync(ENV_FILE, 'utf8').split('\n').forEach(line => {
  const m = line.match(/^([^#=]+)=(.+)$/);
  if (m) env[m[1].trim()] = m[2].trim();
});
const SUPA_URL = env['NEXT_PUBLIC_SUPABASE_URL'];
const SRK = env['SUPABASE_SERVICE_ROLE_KEY'];

const args = process.argv.slice(2);
const getArg = f => { const i = args.indexOf(f); return i !== -1 ? args[i+1] : null; };
const triggeredBy = getArg('--triggered-by') ?? 'manual';

const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const OUT_DIR = path.join(OUT_BASE, `${TIMESTAMP}_score`);
fs.mkdirSync(OUT_DIR, { recursive: true });

// ── Read latest outputs ───────────────────────────────────────────────────
function latestDir(suffix) {
  if (!fs.existsSync(OUT_BASE)) return null;
  const dirs = fs.readdirSync(OUT_BASE)
    .filter(d => d.endsWith(suffix))
    .sort()
    .reverse();
  return dirs.length ? path.join(OUT_BASE, dirs[0]) : null;
}

function readJSON(dir, file) {
  if (!dir) return null;
  const p = path.join(dir, file);
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}

const gateDir = latestDir('_gate') ?? latestDir('_gates');
const dbDir = latestDir('_db');
const reviewDir = latestDir('_review');

const gateSummary = readJSON(gateDir, 'summary.json');
const dbSummary = readJSON(dbDir, 'summary.json');
const reviewResult = readJSON(reviewDir, 'review.json');

// ── Read baselines for Layer 1 ────────────────────────────────────────────
const baseDir = path.join(__dirname, 'baselines');
const readBaseline = f => {
  try { return parseFloat(fs.readFileSync(path.join(baseDir, f), 'utf8').trim()); } catch { return null; }
};

// Re-run gate in read-only mode to get current counts
let tscErrors = null, eslintErrors = null, knipFindings = null, dupPct = null, auditHigh = null;
try {
  const gateOutput = execSync(
    `bash "${path.join(__dirname, 'gate.sh')}" --report-only 2>&1 || true`,
    { encoding: 'utf8', cwd: ROOT }
  );
  const tscM = gateOutput.match(/tsc.*?(\d+)\s*errors?/i);
  const eslintM = gateOutput.match(/eslint.*?(\d+)/i);
  const knipM = gateOutput.match(/knip.*?(\d+)/i);
  const dupM = gateOutput.match(/jscpd.*?([\d.]+)%/i);
  const auditM = gateOutput.match(/audit.*?(\d+)/i);
  if (tscM) tscErrors = parseInt(tscM[1]);
  if (eslintM) eslintErrors = parseInt(eslintM[1]);
  if (knipM) knipFindings = parseInt(knipM[1]);
  if (dupM) dupPct = parseFloat(dupM[1]);
  if (auditM) auditHigh = parseInt(auditM[1]);
} catch {}

// Fall back to baselines if gate run failed
tscErrors ??= readBaseline('tsc_errors.txt');
eslintErrors ??= readBaseline('eslint_errors.txt');
knipFindings ??= readBaseline('knip_findings.txt');
dupPct ??= readBaseline('jscpd_pct.txt');
auditHigh ??= readBaseline('audit_high.txt');

// ── Layer 2 ────────────────────────────────────────────────────────────────
const dbPass = dbSummary?.pass ?? null;
const dbFail = dbSummary?.fail ?? null;
const dbWarn = dbSummary?.warn ?? 0;

// ── Layer 3 ────────────────────────────────────────────────────────────────
const aiRisk = reviewResult?.risk_score_0_100 ?? null;
const aiCritical = reviewResult?.findings_critical ?? null;
const aiHigh = reviewResult?.findings_high ?? null;

// ── Composite score ────────────────────────────────────────────────────────
// DB computes this via generated column; mirror here for local display
const overallScore = Math.max(0, Math.round(
  100
  - (aiRisk ?? 0) / 2
  - (dbFail ?? 0) * 5
  - (dbWarn ?? 0) * 2
  - Math.min(tscErrors ?? 0, 50)
  - Math.min((eslintErrors ?? 0) / 10, 20)
));

// ── Get current commit ─────────────────────────────────────────────────────
let commitHash = null;
try { commitHash = execSync('git -C "' + ROOT + '" rev-parse --short HEAD', { encoding: 'utf8' }).trim(); } catch {}

const scoreRow = {
  commit_hash: commitHash,
  tsc_errors: tscErrors,
  eslint_errors: eslintErrors,
  knip_findings: knipFindings,
  duplication_pct: dupPct,
  audit_high: auditHigh,
  db_checks_pass: dbPass,
  db_checks_fail: dbFail,
  db_checks_warn: dbWarn,
  ai_risk_score: aiRisk,
  ai_findings_critical: aiCritical,
  ai_findings_high: aiHigh,
  triggered_by: triggeredBy,
};

// ── Persist to Supabase ────────────────────────────────────────────────────
let persisted = false;
if (SUPA_URL && SRK) {
  try {
    const res = await fetch(`${SUPA_URL}/rest/v1/qa_scores`, {
      method: 'POST',
      headers: {
        'apikey': SRK,
        'Authorization': `Bearer ${SRK}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(scoreRow),
    });
    if (res.ok) {
      persisted = true;
    } else {
      const err = await res.text();
      console.error('WARN: failed to persist score:', err.slice(0, 200));
    }
  } catch (e) {
    console.error('WARN: score persist error:', e.message);
  }
}

// ── Write local summary ────────────────────────────────────────────────────
const summary = { ...scoreRow, overall_score: overallScore, persisted, timestamp: TIMESTAMP };
fs.writeFileSync(path.join(OUT_DIR, 'score.json'), JSON.stringify(summary, null, 2));

// ── Print ──────────────────────────────────────────────────────────────────
console.log('');
console.log('══════════════════════════════════════════════');
console.log(` bop-inspect score — ${TIMESTAMP}`);
console.log(` Commit: ${commitHash ?? 'unknown'}`);
console.log('──────────────────────────────────────────────');
console.log(` OVERALL SCORE: ${overallScore}/100`);
console.log('');
console.log(` Layer 1 — Gate`);
console.log(`   tsc errors:     ${tscErrors ?? '—'}`);
console.log(`   eslint errors:  ${eslintErrors ?? '—'}`);
console.log(`   knip findings:  ${knipFindings ?? '—'}`);
console.log(`   duplication:    ${dupPct ?? '—'}%`);
console.log(`   audit high:     ${auditHigh ?? '—'}`);
console.log('');
console.log(` Layer 2 — DB`);
console.log(`   pass: ${dbPass ?? '—'}  fail: ${dbFail ?? '—'}  warn: ${dbWarn ?? '—'}`);
console.log('');
console.log(` Layer 3 — AI Review`);
console.log(`   risk score:     ${aiRisk ?? '— (no recent review)'}`);
console.log(`   critical:       ${aiCritical ?? '—'}`);
console.log(`   high:           ${aiHigh ?? '—'}`);
console.log('──────────────────────────────────────────────');
console.log(` Persisted to qa_scores: ${persisted ? 'YES' : 'NO'}`);
console.log(` Output: ${OUT_DIR}/score.json`);
console.log('══════════════════════════════════════════════');

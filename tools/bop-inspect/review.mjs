#!/usr/bin/env node
// bop-inspect review — Phase 3 AI Senior Reviewer
// Usage:
//   bop-inspect review --diff HEAD~1        # review last commit
//   bop-inspect review --diff main..HEAD    # review branch vs main
//   bop-inspect review --module app/console/mkp  # review a directory
//   bop-inspect review --weekly             # full module walk (weekly debt report)

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const ENV_FILE = path.join(ROOT, '.env.local');
const PROMPT_FILE = path.join(__dirname, 'prompts/reviewer.md');
const OUT_BASE = path.join(__dirname, 'out');

// ── Load env ───────────────────────────────────────────────────────────────
const env = {};
if (fs.existsSync(ENV_FILE)) {
  fs.readFileSync(ENV_FILE, 'utf8').split('\n').forEach(line => {
    const m = line.match(/^([^#=]+)=(.+)$/);
    if (m) env[m[1].trim()] = m[2].trim();
  });
}
const ANTHROPIC_KEY = env['ANTHROPIC_API_KEY'] ?? process.env.ANTHROPIC_API_KEY ?? '';
if (!ANTHROPIC_KEY) {
  console.error('ERROR: ANTHROPIC_API_KEY not set in .env.local or environment.');
  console.error('Add it: echo "ANTHROPIC_API_KEY=sk-ant-..." >> /opt/dessystems-console-dev/.env.local');
  process.exit(1);
}

// ── Args ───────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (flag) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : null; };
const hasFlag = (flag) => args.includes(flag);

const diffRef    = getArg('--diff');
const modulePath = getArg('--module');
const weekly     = hasFlag('--weekly');
const assertFlag = hasFlag('--assert'); // exit 1 if critical found

if (!diffRef && !modulePath && !weekly) {
  console.log('Usage:');
  console.log('  bop-inspect review --diff HEAD~1');
  console.log('  bop-inspect review --diff main..HEAD');
  console.log('  bop-inspect review --module app/console/mkp');
  console.log('  bop-inspect review --weekly');
  process.exit(0);
}

// ── System prompt ──────────────────────────────────────────────────────────
if (!fs.existsSync(PROMPT_FILE)) {
  console.error(`ERROR: reviewer prompt not found at ${PROMPT_FILE}`);
  process.exit(1);
}
const SYSTEM_PROMPT = fs.readFileSync(PROMPT_FILE, 'utf8');

// ── Timestamp + output dir ─────────────────────────────────────────────────
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const OUT_DIR = path.join(OUT_BASE, `${TIMESTAMP}_review`);
fs.mkdirSync(OUT_DIR, { recursive: true });

// ── Helpers ────────────────────────────────────────────────────────────────
const MAX_CHUNK = 6000; // chars per Claude call (~1500 tokens)

function chunkByFile(diff) {
  // Split diff into per-file sections, then group into chunks
  const sections = diff.split(/(?=^diff --git )/m).filter(Boolean);
  const chunks = [];
  let current = '';
  for (const section of sections) {
    if (current.length + section.length > MAX_CHUNK && current) {
      chunks.push(current);
      current = section;
    } else {
      current += section;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

async function callClaude(userContent) {
  const body = {
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userContent }],
  };
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Anthropic API ${res.status}: ${txt.slice(0, 300)}`);
  }
  const json = await res.json();
  const text = json.content?.[0]?.text ?? '';
  // Strip any markdown fences if model wraps JSON
  const clean = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
  try {
    return JSON.parse(clean);
  } catch {
    console.error('WARN: Claude returned non-JSON:', text.slice(0, 200));
    return { findings: [], summary: 'Parse error — raw output saved.', risk_score_0_100: 0, _raw: text };
  }
}

function mergeResults(results) {
  const findings = results.flatMap(r => r.findings ?? []);
  const avgRisk = results.length
    ? Math.round(results.reduce((s, r) => s + (r.risk_score_0_100 ?? 0), 0) / results.length)
    : 0;
  const maxRisk = Math.max(...results.map(r => r.risk_score_0_100 ?? 0), 0);
  return {
    findings,
    summary: results.map(r => r.summary).filter(Boolean).join(' | '),
    risk_score_0_100: maxRisk,
    chunks_reviewed: results.length,
    findings_total: findings.length,
    findings_critical: findings.filter(f => f.severity === 'critical').length,
    findings_high: findings.filter(f => f.severity === 'high').length,
  };
}

function printSummary(merged) {
  console.log('');
  console.log('══════════════════════════════════════════════');
  console.log(` bop-inspect review — ${TIMESTAMP}`);
  console.log(` Risk score: ${merged.risk_score_0_100}/100`);
  console.log(` Findings: ${merged.findings_total} total — ${merged.findings_critical} critical, ${merged.findings_high} high`);
  console.log('──────────────────────────────────────────────');
  for (const f of merged.findings.filter(f => ['critical','high'].includes(f.severity))) {
    console.log(` [${f.severity.toUpperCase()}] ${f.file}:${f.line ?? '?'}`);
    console.log(`   ${f.issue}`);
    console.log(`   → ${f.recommendation}`);
    console.log(`   confidence: ${f.confidence} | category: ${f.category}`);
  }
  if (merged.findings.filter(f => f.severity === 'medium').length) {
    console.log(`\n ${merged.findings.filter(f => f.severity === 'medium').length} medium findings (see JSON for details)`);
  }
  console.log('──────────────────────────────────────────────');
  console.log(` ${merged.summary}`);
  console.log('══════════════════════════════════════════════');
}

// ── Mode: diff review ──────────────────────────────────────────────────────
if (diffRef) {
  console.log(`==> bop-inspect review --diff ${diffRef}`);
  let diff;
  try {
    diff = execSync(`git -C "${ROOT}" diff ${diffRef} -- '*.ts' '*.tsx'`, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  } catch (e) {
    console.error('ERROR: git diff failed:', e.message);
    process.exit(1);
  }
  if (!diff.trim()) {
    console.log('No TypeScript changes in diff — nothing to review.');
    process.exit(0);
  }
  console.log(`Diff: ${diff.length} chars — splitting into chunks...`);
  const chunks = chunkByFile(diff);
  console.log(`Chunks: ${chunks.length} — calling Claude...`);
  const results = [];
  for (let i = 0; i < chunks.length; i++) {
    console.log(`  chunk ${i + 1}/${chunks.length}...`);
    const r = await callClaude(`Review this git diff from the DES BOP V2 codebase:\n\n\`\`\`diff\n${chunks[i]}\n\`\`\``);
    results.push(r);
  }
  const merged = mergeResults(results);
  fs.writeFileSync(path.join(OUT_DIR, 'review.json'), JSON.stringify(merged, null, 2));
  printSummary(merged);
  console.log(`\nFull report: ${OUT_DIR}/review.json`);
  if (assertFlag && merged.findings_critical > 0) process.exit(1);
}

// ── Mode: module review ────────────────────────────────────────────────────
if (modulePath) {
  const absPath = path.isAbsolute(modulePath) ? modulePath : path.join(ROOT, modulePath);
  console.log(`==> bop-inspect review --module ${modulePath}`);
  if (!fs.existsSync(absPath)) {
    console.error(`ERROR: path not found: ${absPath}`);
    process.exit(1);
  }
  const files = execSync(`find "${absPath}" -name "*.ts" -o -name "*.tsx" | head -50`, { encoding: 'utf8' })
    .split('\n').filter(Boolean);
  console.log(`Files: ${files.length}`);
  let combined = '';
  for (const f of files) {
    try {
      const rel = path.relative(ROOT, f);
      combined += `\n\n// FILE: ${rel}\n${fs.readFileSync(f, 'utf8').slice(0, 3000)}`;
    } catch {}
  }
  const chunks = [];
  for (let i = 0; i < combined.length; i += MAX_CHUNK) chunks.push(combined.slice(i, i + MAX_CHUNK));
  console.log(`Chunks: ${chunks.length} — calling Claude...`);
  const results = [];
  for (let i = 0; i < chunks.length; i++) {
    console.log(`  chunk ${i + 1}/${chunks.length}...`);
    const r = await callClaude(`Review these source files from the DES BOP V2 codebase:\n\n${chunks[i]}`);
    results.push(r);
  }
  const merged = mergeResults(results);
  fs.writeFileSync(path.join(OUT_DIR, 'review.json'), JSON.stringify(merged, null, 2));
  printSummary(merged);
  console.log(`\nFull report: ${OUT_DIR}/review.json`);
  if (assertFlag && merged.findings_critical > 0) process.exit(1);
}

// ── Mode: weekly deep scan ─────────────────────────────────────────────────
if (weekly) {
  console.log('==> bop-inspect review --weekly (full module scan)');
  // Walk modules defined in manifest — fall back to top-level app dirs
  const appDir = path.join(ROOT, 'app/console');
  let modules = [];
  if (fs.existsSync(appDir)) {
    modules = fs.readdirSync(appDir)
      .filter(d => fs.statSync(path.join(appDir, d)).isDirectory())
      .map(d => path.join(appDir, d));
  }
  console.log(`Modules: ${modules.length}`);
  const moduleResults = [];
  for (const mod of modules) {
    const modName = path.basename(mod);
    console.log(`  reviewing ${modName}...`);
    const files = execSync(`find "${mod}" -name "*.ts" -o -name "*.tsx" 2>/dev/null | head -20`, { encoding: 'utf8' })
      .split('\n').filter(Boolean);
    if (!files.length) continue;
    let content = '';
    for (const f of files.slice(0, 10)) {
      try { content += `\n// FILE: ${path.relative(ROOT, f)}\n${fs.readFileSync(f, 'utf8').slice(0, 2000)}`; } catch {}
    }
    try {
      const r = await callClaude(`Review these files from the "${modName}" module of DES BOP V2:\n\n${content.slice(0, MAX_CHUNK)}`);
      moduleResults.push({ module: modName, ...r });
    } catch (e) {
      console.error(`  ERROR in ${modName}: ${e.message}`);
    }
  }
  // Build debt report: rank by severity × finding count
  const allFindings = moduleResults.flatMap(m => (m.findings ?? []).map(f => ({ ...f, module: m.module })));
  const debtByModule = moduleResults.map(m => ({
    module: m.module,
    risk_score: m.risk_score_0_100 ?? 0,
    critical: (m.findings ?? []).filter(f => f.severity === 'critical').length,
    high: (m.findings ?? []).filter(f => f.severity === 'high').length,
    total: (m.findings ?? []).length,
  })).sort((a, b) => b.risk_score - a.risk_score);

  const report = {
    generated_at: TIMESTAMP,
    modules_scanned: moduleResults.length,
    total_findings: allFindings.length,
    critical_findings: allFindings.filter(f => f.severity === 'critical').length,
    top_debt: debtByModule.slice(0, 10),
    top_findings: allFindings
      .filter(f => ['critical','high'].includes(f.severity))
      .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))
      .slice(0, 20),
    all_module_results: moduleResults,
  };

  fs.writeFileSync(path.join(OUT_DIR, 'weekly_debt_report.json'), JSON.stringify(report, null, 2));

  // Markdown summary
  let md = `# BOP V2 Weekly Debt Report — ${TIMESTAMP}\n\n`;
  md += `**Modules scanned:** ${report.modules_scanned}  \n`;
  md += `**Total findings:** ${report.total_findings} (${report.critical_findings} critical)\n\n`;
  md += `## Top 10 Modules by Risk\n\n| Module | Risk | Critical | High | Total |\n|---|---|---|---|---|\n`;
  for (const m of debtByModule.slice(0, 10)) {
    md += `| ${m.module} | ${m.risk_score} | ${m.critical} | ${m.high} | ${m.total} |\n`;
  }
  md += `\n## Top Findings\n\n`;
  for (const f of report.top_findings.slice(0, 10)) {
    md += `### [${f.severity.toUpperCase()}] ${f.file ?? f.module}:${f.line ?? '?'}\n`;
    md += `**Category:** ${f.category} | **Confidence:** ${f.confidence}\n\n`;
    md += `${f.issue}\n\n**Fix:** ${f.recommendation}\n\n`;
  }
  fs.writeFileSync(path.join(OUT_DIR, 'weekly_debt_report.md'), md);

  console.log('');
  console.log('══════════════════════════════════════════════');
  console.log(` Weekly Debt Report — ${TIMESTAMP}`);
  console.log(` Modules: ${report.modules_scanned} | Findings: ${report.total_findings} (${report.critical_findings} critical)`);
  console.log(' Top 3 modules by risk:');
  for (const m of debtByModule.slice(0, 3)) {
    console.log(`   ${m.module}: risk=${m.risk_score} critical=${m.critical} high=${m.high}`);
  }
  console.log('══════════════════════════════════════════════');
  console.log(`\nJSON: ${OUT_DIR}/weekly_debt_report.json`);
  console.log(`MD:   ${OUT_DIR}/weekly_debt_report.md`);
}

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

function latestGateDir(): string | null {
  const outDir = path.resolve(process.cwd(), 'tools/bop-inspect/out');
  if (!fs.existsSync(outDir)) return null;
  const dirs = fs.readdirSync(outDir)
    .filter(d => /^\d{8}_\d{6}$/.test(d))
    .sort()
    .reverse();
  return dirs[0] ? path.join(outDir, dirs[0]) : null;
}

type TscError = { file: string; line: number; col: number; code: string; message: string };
type EslintError = { file: string; line: number; col: number; rule: string; message: string };

function parseTsc(txt: string): TscError[] {
  const errors: TscError[] = [];
  for (const line of txt.split('\n')) {
    const m = line.match(/^(.+)\((\d+),(\d+)\): error (TS\d+): (.+)$/);
    if (m) errors.push({ file: m[1]!, line: parseInt(m[2]!), col: parseInt(m[3]!), code: m[4]!, message: m[5]! });
  }
  return errors;
}

function parseEslint(txt: string): EslintError[] {
  const errors: EslintError[] = [];
  let currentFile = '';
  for (const line of txt.split('\n')) {
    // File header line: absolute path or relative (no indentation)
    if (line.startsWith('/') || (line.match(/^[A-Za-z]:\\/) ) || line.match(/^\w.*\.ts[x]?$/)) {
      currentFile = line.trim();
      continue;
    }
    // Error/warning line: "  16:8   error  message  rule"
    const m = line.match(/^\s+(\d+):(\d+)\s+(error|warning)\s+(.+?)\s{2,}(\S+)\s*$/);
    if (m && m[3] === 'error') {
      errors.push({ file: currentFile, line: parseInt(m[1]!), col: parseInt(m[2]!), rule: m[5]!, message: m[4]! });
    }
  }
  return errors;
}

export async function GET(_req: NextRequest) {
  const dir = latestGateDir();
  if (!dir) return NextResponse.json({ error: 'No gate run found — run bop-inspect gate first' }, { status: 404 });

  const summaryPath = path.join(dir, 'summary.json');
  const tscPath     = path.join(dir, 'tsc.txt');
  const eslintPath  = path.join(dir, 'eslint.txt');

  const summary  = fs.existsSync(summaryPath) ? JSON.parse(fs.readFileSync(summaryPath, 'utf8')) : null;
  const tscRaw   = fs.existsSync(tscPath)     ? fs.readFileSync(tscPath, 'utf8')     : '';
  const eslintRaw = fs.existsSync(eslintPath) ? fs.readFileSync(eslintPath, 'utf8')  : '';

  const tscErrors    = parseTsc(tscRaw);
  const eslintErrors = parseEslint(eslintRaw);

  // Group by file for easier rendering
  const tscByFile: Record<string, TscError[]> = {};
  for (const e of tscErrors) {
    (tscByFile[e.file] = tscByFile[e.file] ?? []).push(e);
  }
  const eslintByFile: Record<string, EslintError[]> = {};
  for (const e of eslintErrors) {
    (eslintByFile[e.file] = eslintByFile[e.file] ?? []).push(e);
  }

  // Top offending files
  const tscTopFiles  = Object.entries(tscByFile).sort((a,b) => b[1].length - a[1].length).slice(0, 20);
  const eslintTopFiles = Object.entries(eslintByFile).sort((a,b) => b[1].length - a[1].length).slice(0, 20);

  // Group ESLint by rule
  const eslintByRule: Record<string, number> = {};
  for (const e of eslintErrors) {
    eslintByRule[e.rule] = (eslintByRule[e.rule] ?? 0) + 1;
  }
  const eslintTopRules = Object.entries(eslintByRule).sort((a,b) => b[1] - a[1]).slice(0, 15);

  return NextResponse.json({
    gate_dir: path.basename(dir),
    summary,
    tsc: {
      total: tscErrors.length,
      top_files: tscTopFiles.map(([file, errs]) => ({
        file: file.replace(process.cwd() + '/', '').replace(process.cwd() + '\\', ''),
        count: errs.length,
        errors: errs.slice(0, 10).map(e => ({ line: e.line, col: e.col, code: e.code, message: e.message })),
      })),
    },
    eslint: {
      total: eslintErrors.length,
      top_rules: eslintTopRules.map(([rule, count]) => ({ rule, count })),
      top_files: eslintTopFiles.map(([file, errs]) => ({
        file: file.replace(process.cwd() + '/', '').replace(process.cwd() + '\\', ''),
        count: errs.length,
        errors: errs.slice(0, 5).map(e => ({ line: e.line, col: e.col, rule: e.rule, message: e.message })),
      })),
    },
  });
}

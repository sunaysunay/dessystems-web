import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(_req: NextRequest) {
  const bopInspect = path.resolve(process.cwd(), 'tools/bop-inspect/bop-inspect');
  const startedAt = Date.now();

  return new Promise<NextResponse>((resolve) => {
    exec(`bash "${bopInspect}" db`, { timeout: 90000, cwd: process.cwd() }, (err, stdout, stderr) => {
      const durationMs = Date.now() - startedAt;
      const output = (stdout + stderr).slice(-4000);
      const lines = output.split('\n').filter(Boolean);
      const pass  = lines.filter(l => l.startsWith('[PASS]')).length;
      const fail  = lines.filter(l => l.startsWith('[FAIL]')).length;
      const warn  = lines.filter(l => l.startsWith('[WARN]')).length;
      const skip  = lines.filter(l => l.startsWith('[SKIP]') || l.includes('[SKIP]')).length;
      resolve(NextResponse.json({ ok: !err || err.code === 1, pass, fail, warn, skip, duration_ms: durationMs, output }));
    });
  });
}

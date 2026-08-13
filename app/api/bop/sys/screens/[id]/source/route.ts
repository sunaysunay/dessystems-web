import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import fs from 'fs';
import path from 'path';

const APP_ROOT = path.join(process.cwd(), 'app');

function routeToFile(route: string): string | null {
  // /console/bop/analytics → app/console/bop/analytics/page.tsx
  const rel = route.replace(/^\//, '');
  const candidates = [
    path.join(APP_ROOT, rel, 'page.tsx'),
    path.join(APP_ROOT, rel, 'page.ts'),
    path.join(APP_ROOT, rel + '.tsx'),
  ];
  return candidates.find(p => fs.existsSync(p)) ?? null;
}

function parseSource(src: string) {
  const lines = src.split('\n');
  const lineCount = lines.length;

  // Imports
  const imports: { from: string; names: string[] }[] = [];
  const importRe = /^import\s+\{([^}]+)\}\s+from\s+'([^']+)'/;
  const importDefaultRe = /^import\s+(\w+)\s+from\s+'([^']+)'/;
  for (const line of lines) {
    const m = line.match(importRe);
    if (m) { imports.push({ from: m[2], names: m[1].split(',').map(n => n.trim()).filter(Boolean) }); continue; }
    const m2 = line.match(importDefaultRe);
    if (m2) imports.push({ from: m2[2], names: [m2[1]] });
  }

  // State variables
  const stateVars: { name: string; type: string; init: string }[] = [];
  const stateRe = /const\s+\[(\w+)[^\]]*\]\s*=\s*useState[<\s]*([^>]*?)>?\s*\(([^)]*)\)/g;
  let m: RegExpExecArray | null;
  while ((m = stateRe.exec(src)) !== null) {
    stateVars.push({ name: m[1], type: m[2].trim() || 'any', init: m[3].trim() });
  }

  // API calls (fetch)
  const apiCalls: { method: string; url: string }[] = [];
  const fetchRe = /fetch\(`([^`]+)`|fetch\('([^']+)'|fetch\("([^"]+)"/g;
  while ((m = fetchRe.exec(src)) !== null) {
    const url = m[1] || m[2] || m[3];
    // Find method nearby
    const snippet = src.slice(Math.max(0, m.index - 10), m.index + 200);
    const methodM = snippet.match(/method:\s*['"](\w+)['"]/);
    apiCalls.push({ method: methodM?.[1] ?? 'GET', url });
  }

  // Named functions
  const functions: string[] = [];
  const fnRe = /(?:^|\n)\s*(?:async\s+)?function\s+(\w+)\s*\(|(?:^|\n)\s*(?:const|let)\s+(\w+)\s*=\s*(?:async\s*)?\(/gm;
  while ((m = fnRe.exec(src)) !== null) {
    const name = m[1] || m[2];
    if (name && !['default', 'useState', 'useEffect', 'useMemo', 'useRef', 'useCallback'].includes(name)) {
      functions.push(name);
    }
  }

  // Components used (uppercase imports from local paths)
  const components = imports
    .filter(i => i.from.startsWith('@/') || i.from.startsWith('./') || i.from.startsWith('../'))
    .flatMap(i => i.names.filter(n => /^[A-Z]/.test(n)));

  // External libs
  const externalLibs = imports
    .filter(i => !i.from.startsWith('@/') && !i.from.startsWith('.'))
    .map(i => i.from);

  return { lineCount, imports, stateVars, apiCalls: dedup(apiCalls), functions: [...new Set(functions)], components, externalLibs };
}

function dedup(arr: { method: string; url: string }[]) {
  const seen = new Set<string>();
  return arr.filter(a => { const k = a.method + a.url; if (seen.has(k)) return false; seen.add(k); return true; });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getServerClient();
  const { data: screen } = await supabase
    .from('bop_screens').select('route, title').eq('screen_id', id).single();

  if (!screen?.route) return NextResponse.json({ error: 'Screen not found' }, { status: 404 });

  const filePath = routeToFile(screen.route);
  if (!filePath) return NextResponse.json({ found: false, route: screen.route });

  const src = fs.readFileSync(filePath, 'utf-8');
  const stat = fs.statSync(filePath);
  const parsed = parseSource(src);

  return NextResponse.json({
    found: true,
    file: filePath.replace(process.cwd(), ''),
    size: src.length,
    modified: stat.mtime.toISOString(),
    ...parsed,
  });
}

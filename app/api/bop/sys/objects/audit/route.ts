import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { unstable_noStore as noStore } from 'next/cache';

export const dynamic = 'force-dynamic';

// GET /api/bop/sys/objects/audit
// Scans the filesystem for route.ts and page.tsx files, compares against
// bop_objects, and returns every gap — no matter how it got there.
// Called by: SY028 gap panel, PM2 post-restart hook, AI agents, CI checks.

const APP_ROOT = process.cwd();

function walkFiles(dir: string, pattern: string, results: string[] = []): string[] {
  if (!existsSync(dir)) return results;
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        walkFiles(full, pattern, results);
      } else if (entry.isFile() && entry.name === pattern) {
        results.push(full);
      }
    }
  } catch {}
  return results;
}

export async function GET() {
  noStore();
  const supabase = getServerClient();

  // ── Load bop_objects ──────────────────────────────────────────────────────
  const { data: objects, error } = await supabase
    .from('bop_objects')
    .select('object_id,type,module,name,route,status')
    .limit(5000);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const registeredIds = new Set((objects ?? []).map(o => o.object_id));
  const registeredRoutes = new Set(
    (objects ?? [])
      .filter(o => o.route)
      .map(o => (o.route as string).replace('/api/bop', ''))
  );

  const gaps: { object_id: string; type: string; path: string; reason: string }[] = [];

  // ── 1. Scan API routes ────────────────────────────────────────────────────
  const apiDir = join(APP_ROOT, 'app', 'api', 'bop');
  const routeFiles = walkFiles(apiDir, 'route.ts');

  for (const file of routeFiles) {
    const routePath = file
      .replace(apiDir, '')
      .replace('/route.ts', '')
      .replace(/\\/g, '/');

    // Check if any bop_objects entry covers this route
    const covered = [...registeredRoutes].some(r => {
      const norm = r.replace(/\[.*?\]/g, '[id]');
      const rNorm = routePath.replace(/\[.*?\]/g, '[id]');
      return norm === rNorm || r === routePath;
    });

    if (!covered) {
      gaps.push({
        object_id: `api:${routePath.replace(/^\//, '')}:?`,
        type: 'api',
        path: file.replace(APP_ROOT, ''),
        reason: 'route.ts exists on disk with no bop_objects entry',
      });
    }
  }

  // ── 2. Scan console pages ─────────────────────────────────────────────────
  const { data: screens } = await supabase
    .from('bop_screens')
    .select('screen_id,route')
    .limit(5000);
  const registeredPageRoutes = new Set(
    (screens ?? []).map(s => s.route).filter(Boolean)
  );

  const consoleDir = join(APP_ROOT, 'app', 'console');
  const pageFiles = walkFiles(consoleDir, 'page.tsx');

  // Pages excluded from audit (non-screen files like root redirects)
  const EXCLUDED_PAGES = new Set(['/console']);

  for (const file of pageFiles) {
    const pagePath = '/console' + file
      .replace(consoleDir, '')
      .replace('/page.tsx', '')
      .replace(/\\/g, '/');

    if (EXCLUDED_PAGES.has(pagePath)) continue;

    // Check against bop_screens routes AND bop_objects
    const inScreens = registeredPageRoutes.has(pagePath);
    const screenId = (screens ?? []).find(s => s.route === pagePath)?.screen_id;
    const inObjects = screenId ? registeredIds.has(`screen:${screenId}`) : false;

    if (!inScreens) {
      gaps.push({
        object_id: `screen:?${pagePath}`,
        type: 'screen',
        path: file.replace(APP_ROOT, ''),
        reason: 'page.tsx exists on disk but route not in bop_screens',
      });
    } else if (!inObjects) {
      gaps.push({
        object_id: `screen:${screenId}`,
        type: 'screen',
        path: file.replace(APP_ROOT, ''),
        reason: `screen:${screenId} in bop_screens but missing from bop_objects`,
      });
    }
  }

  // ── 3. bop_screens vs bop_objects ────────────────────────────────────────
  for (const s of screens ?? []) {
    if (!registeredIds.has(`screen:${s.screen_id}`)) {
      gaps.push({
        object_id: `screen:${s.screen_id}`,
        type: 'screen',
        path: s.route ?? '',
        reason: 'in bop_screens but not in bop_objects — Re-seed needed',
      });
    }
  }

  const status = gaps.length === 0 ? 'clean' : 'gaps_found';

  return NextResponse.json({
    status,
    scanned: { api_routes: routeFiles.length, page_files: pageFiles.length, bop_screens: (screens ?? []).length },
    registered: { objects: (objects ?? []).length },
    gaps,
    gap_count: gaps.length,
    checked_at: new Date().toISOString(),
  });
}

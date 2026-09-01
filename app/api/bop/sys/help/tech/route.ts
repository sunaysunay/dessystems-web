import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { promises as fs } from 'fs';
import path from 'path';

const GROUP_LABELS: Record<string, string> = {
  overview: 'Overview', operations: 'Operations', workshop: 'Workshop', salesCrm: 'Sales & CRM',
  marketplace: 'Marketplace', sales: 'Sales', finance: 'Finance',
  intelligence: 'Intelligence', shop: 'Shop', masterData: 'Master Data', tools: 'Tools', system: 'System',
};
const SUBGROUP_LABELS: Record<string, string> = {
  development: 'Development', integration: 'Integration', users: 'Users',
  accessRoles: 'Access Roles', configuration: 'Configuration',
  infrastructure: 'Infrastructure', dataAcquisition: 'Data Acquisition',
};

function buildMenuPath(
  scr: { nav_visible?: boolean | null; nav_group?: string | null; nav_subgroup?: string | null; title?: string | null } | null | undefined,
  screen: string,
): string | null {
  if (!scr?.nav_visible || !scr?.nav_group) return null;
  const groupLabel = GROUP_LABELS[scr.nav_group] ?? scr.nav_group;
  if (scr.nav_subgroup) {
    const subLabel = SUBGROUP_LABELS[scr.nav_subgroup] ?? scr.nav_subgroup;
    return groupLabel + ' → ' + subLabel + ' → ' + (scr.title ?? screen);
  }
  return groupLabel + ' → ' + (scr.title ?? screen);
}

export const dynamic = 'force-dynamic';

async function readSafe(f: string) { try { return await fs.readFile(f, 'utf8'); } catch { return null; } }

async function walkRoutes(dir: string, depth = 2): Promise<string[]> {
  const out: string[] = [];
  let entries;
  try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isFile() && e.name === 'route.ts') out.push(full);
    else if (e.isDirectory() && depth > 0) out.push(...await walkRoutes(full, depth - 1));
  }
  return out;
}

function extractTables(src: string): string[] {
  const t = new Set<string>();
  const re = /\.from\(\s*['"`]([a-zA-Z0-9_]+)['"`]\s*\)/g;
  let m; while ((m = re.exec(src))) t.add(m[1]);
  return [...t].sort();
}
function extractMethods(src: string): string[] {
  return ['GET','POST','PATCH','PUT','DELETE'].filter(mm => new RegExp(`export\\s+async\\s+function\\s+${mm}\\b`).test(src));
}

// GET /api/bop/sys/help/tech?screen=MP001
export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const screen = new URL(req.url).searchParams.get('screen');
  if (!screen) return NextResponse.json({ error: 'screen is required' }, { status: 400 });

  const { data: scr } = await supabase.from('bop_screens')
    .select('screen_id, module, title, route, func_type, nav_group, nav_subgroup, nav_visible, nav_order, lifecycle_state')
    .eq('screen_id', screen).maybeSingle();
  const { data: roles } = await supabase.from('bop_screen_roles')
    .select('role, can_read, can_write, can_delete').eq('screen_id', screen);

  const { data: deps1 } = await supabase.from('bop_dependencies')
    .select('to_id, dep_type').eq('from_id', `screen:${screen}`);

  // ── Auto-derive from source: page.tsx → /api/bop/* calls → route.ts .from() tables
  const cwd = process.cwd();
  const apis: { route: string; file: string; methods: string[]; tables: string[] }[] = [];
  const tableSet = new Set<string>();
  let pageFile: string | null = null;

  if (scr?.route) {
    const pf = path.join(cwd, 'app', scr.route, 'page.tsx');
    const pageSrc = await readSafe(pf);
    if (pageSrc) {
      pageFile = `app${scr.route}/page.tsx`;
      const apiPaths = new Set<string>();
      const re = /\/api\/bop\/[a-zA-Z0-9/_\-]+/g;
      let m; while ((m = re.exec(pageSrc))) apiPaths.add(m[0].replace(/\/+$/,''));

      const seen = new Set<string>();
      for (const ap of apiPaths) {
        const routeFiles = await walkRoutes(path.join(cwd, 'app', ap), 2);
        for (const rf of routeFiles) {
          const rel = rf.slice(cwd.length + 1).replace(/\\/g, '/');
          if (seen.has(rel)) continue; seen.add(rel);
          const src = await readSafe(rf);
          if (!src) continue;
          const tables = extractTables(src);
          tables.forEach(t => tableSet.add(t));
          apis.push({
            route: '/' + rel.replace(/^app\//, '').replace(/\/route\.ts$/, ''),
            file: rel,
            methods: extractMethods(src),
            tables,
          });
        }
      }
    }
  }


  const menu_path = buildMenuPath(scr, screen);

  return NextResponse.json({
    screen: {
      tc: screen,
      module: scr?.module ?? null,
      title: scr?.title ?? null,
      route: scr?.route ?? null,
      func_type: scr?.func_type ?? null,
      lifecycle_state: scr?.lifecycle_state ?? null,
      registered: !!scr,
      page_file: pageFile,
      menu_path,
      nav_group: scr?.nav_group ?? null,
      nav_subgroup: scr?.nav_subgroup ?? null,
      nav_visible: scr?.nav_visible ?? false,
    },
    roles: roles ?? [],
    apis: apis.sort((a, b) => a.route.localeCompare(b.route)),
    tables_touched: [...tableSet].sort(),
    registered_deps: (deps1 ?? []).length,
    source: pageFile ? 'code-scan' : 'registry-only',
  });
}

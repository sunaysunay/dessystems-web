import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;
const exec = promisify(execFile);

// GET /api/bop/dev/definition-audit — scan the code screen-registry against
// bop_objects / bop_documentation / bop_dependencies and report every gap.
export async function GET(_req: NextRequest) {
  const supabase = getServerClient();
  const regPath = path.join(process.cwd(), 'lib', 'screen-registry.ts');
  const src = fs.readFileSync(regPath, 'utf8');

  const screens: { id: string; title: string; mod: string; route: string }[] = [];
  const seen = new Set<string>();
  for (const m of src.matchAll(/'([^']+)':\s*\{\s*id:\s*'([A-Z]{2}\d{3})',\s*title:\s*'([^']*)',\s*mod:\s*'([^']*)'/g)) {
    if (!seen.has(m[2])) { seen.add(m[2]); screens.push({ route: m[1], id: m[2], title: m[3], mod: m[4] }); }
  }

  const [{ data: objs }, { data: docs }, { data: deps }, { data: procEdges }, { data: navRows }] = await Promise.all([
    supabase.from('bop_objects').select('object_id').eq('type', 'screen'),
    supabase.from('bop_documentation').select('target_id, owner, doc_type, body_md').eq('target_type', 'screen'),
    supabase.from('bop_dependencies').select('from_id').like('from_id', 'screen:%'),
    supabase.from('bop_dependencies').select('from_id, to_id').like('from_id', 'process:%').eq('dep_type', 'involves'),
    supabase.from('bop_screens').select('screen_id, nav_group, nav_visible'),
  ]);
  const reg = new Set((objs ?? []).map((o: any) => o.object_id.replace('screen:', '')));
  const docIds = new Set((docs ?? []).map((d: any) => d.target_id));
  const draftIds = new Set((docs ?? []).filter((d: any) => d.owner === 'ai-draft').map((d: any) => d.target_id));
  const depIds = new Set((deps ?? []).map((d: any) => d.from_id.replace('screen:', '')));
  // manual phases per screen: which doc_types exist, and their authorship
  const phases: Record<string, Record<string, string>> = {};
  const briefs: Record<string, string> = {};
  for (const d of docs ?? []) {
    (phases[d.target_id] ??= {})[d.doc_type] =
      phases[d.target_id][d.doc_type] === 'system' ? 'system' : (d.owner === 'ai-draft' ? 'draft' : 'system');
    if (d.doc_type === 'overview' && !briefs[d.target_id] && d.body_md) {
      // quick-help brief: first sentence of the overview, markdown stripped
      const plain = d.body_md.replace(/[*`_#]/g, '').replace(/\n+/g, ' ').trim();
      const cut = plain.match(/^.{20,180}?(?:\.|$)/);
      briefs[d.target_id] = (cut ? cut[0] : plain.slice(0, 160)).trim();
    }
  }
  // flows each screen participates in
  const flowsOf: Record<string, string[]> = {};
  for (const e of procEdges ?? []) {
    const sid = e.to_id.replace('screen:', '');
    (flowsOf[sid] ??= []).push(e.from_id.replace('process:', ''));
  }

  // nav assignment (the console sidebar is DB-driven from bop_screens.nav_*).
  // Detail screens ([id] routes) and /menu hubs are legitimately nav-less.
  const navOf: Record<string, boolean> = {};
  for (const r of navRows ?? []) navOf[r.screen_id] = Boolean(r.nav_group && r.nav_visible !== false);

  // fetched API paths that have no route file (phantom endpoints)
  const phantom: { screen: string; api: string }[] = [];
  for (const s of screens) {
    const pf = path.join(process.cwd(), 'app', ...s.route.split('/').filter(Boolean), 'page.tsx');
    if (!fs.existsSync(pf)) continue;
    const psrc = fs.readFileSync(pf, 'utf8');
    for (const m of psrc.matchAll(/fetch\(\s*[`'"](\/api\/[^`'"?$\s]+)/g)) {
      const p = m[1].replace(/\/+$/, '');
      const rf = path.join(process.cwd(), 'app', ...p.split('/').filter(Boolean), 'route.ts');
      const parts = p.split('/').filter(Boolean); parts[parts.length - 1] = '[id]';
      const rf2 = path.join(process.cwd(), 'app', ...parts, 'route.ts');
      if (!fs.existsSync(rf) && !fs.existsSync(rf2)) phantom.push({ screen: s.id, api: p });
    }
  }

  const rows = screens.map(s => ({
    ...s,
    registered: reg.has(s.id),
    has_docs: docIds.has(s.id),
    docs_draft: draftIds.has(s.id),
    has_deps: depIds.has(s.id),
    phases: phases[s.id] ?? {},          // { overview|steps|faq|reference|process: 'system'|'draft' }
    flows: flowsOf[s.id] ?? [],
    brief: briefs[s.id] ?? null,         // quick-help one-liner from the overview
    // nav status: 'ok' | 'missing' | 'n/a' (detail screens + menu hubs exempt)
    nav: (s.route.includes('[id]') || s.route.startsWith('/menu'))
      ? 'n/a'
      : (navOf[s.id] ? 'ok' : 'missing'),
  }));

  return NextResponse.json({
    total: screens.length,
    missing_objects: rows.filter(r => !r.registered).length,
    missing_docs: rows.filter(r => !r.has_docs).length,
    missing_deps: rows.filter(r => !r.has_deps && !r.route.startsWith('/menu')).length,
    api_less_menus: rows.filter(r => !r.has_deps && r.route.startsWith('/menu')).length,
    missing_nav: rows.filter(r => r.nav === 'missing').length,
    draft_docs: rows.filter(r => r.docs_draft).length,
    phantom_apis: phantom,
    rows,
    scanned_at: new Date().toISOString(),
  });
}

// POST — run the populate engine (register + wire + draft docs), return its log
export async function POST(_req: NextRequest) {
  try {
    const { stdout, stderr } = await exec('node', ['scripts/populate-all.cjs'], {
      cwd: process.cwd(), timeout: 110_000,
    });
    return NextResponse.json({ ok: true, log: (stdout + (stderr ? '\n' + stderr : '')).trim() });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message, log: e.stdout ?? '' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

// GET /api/bop/sys/processes — all business flows with manuals + member screens
export async function GET(_req: NextRequest) {
  const supabase = getServerClient();

  const [{ data: procs }, { data: docs }, { data: edges }, { data: screens }] = await Promise.all([
    supabase.from('bop_objects').select('object_id, name, status').eq('type', 'process').order('name'),
    supabase.from('bop_documentation').select('target_id, doc_type, seq, title, body_md').eq('target_type', 'process').eq('status', 'active').order('seq'),
    supabase.from('bop_dependencies').select('from_id, to_id').like('from_id', 'process:%').eq('dep_type', 'involves'),
    supabase.from('bop_screens').select('screen_id, title, route, module'),
  ]);

  const smap = Object.fromEntries((screens ?? []).map((s: any) => [s.screen_id, s]));
  const docsBy: Record<string, any[]> = {};
  for (const d of docs ?? []) (docsBy[d.target_id] ??= []).push(d);
  const membersBy: Record<string, any[]> = {};
  for (const e of edges ?? []) {
    const slug = e.from_id.replace('process:', '');
    const sid = e.to_id.replace('screen:', '');
    (membersBy[slug] ??= []).push({ id: sid, title: smap[sid]?.title ?? sid, route: smap[sid]?.route ?? null, module: smap[sid]?.module ?? null });
  }

  return NextResponse.json({
    processes: (procs ?? []).map((p: any) => {
      const slug = p.object_id.replace('process:', '');
      const d = docsBy[slug] ?? [];
      const members = (membersBy[slug] ?? []);
      return {
        slug, name: p.name, status: p.status,
        modules: [...new Set(members.map((m: any) => m.module).filter(Boolean))].sort(),
        overview: d.find(x => x.doc_type === 'overview') ?? null,
        steps: d.filter(x => x.doc_type === 'steps'),
        faq: d.filter(x => x.doc_type === 'faq'),
        screens: (membersBy[slug] ?? []).sort((a, b) => a.id.localeCompare(b.id)),
      };
    }),
  });
}

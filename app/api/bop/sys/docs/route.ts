import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

// GET /api/bop/sys/docs — full-parameter documentation search.
// Params: q (full-text over title+body), target_type (screen|process),
// target_id, doc_type, owner, status, module (via bop_screens),
// limit (default 100, max 500), offset.
export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const p = new URL(req.url).searchParams;
  const q = (p.get('q') ?? '').trim();
  const targetType = p.get('target_type') ?? '';
  const targetId = (p.get('target_id') ?? '').trim();
  const docType = p.get('doc_type') ?? '';
  const owner = p.get('owner') ?? '';
  const status = p.get('status') ?? '';
  const module = p.get('module') ?? '';
  const relatedScreen = p.get('related_screen') ?? '';
  const limit = Math.min(Number(p.get('limit') ?? 100), 500);
  const offset = Number(p.get('offset') ?? 0);

  // module filter resolves to a set of screen ids first
  let moduleIds: string[] | null = null;
  if (module) {
    const { data } = await supabase.from('bop_screens').select('screen_id').eq('module', module);
    moduleIds = (data ?? []).map((r: any) => r.screen_id);
    if (!moduleIds.length) return NextResponse.json({ docs: [], total: 0, facets: {} });
  }

  let query = supabase.from('bop_documentation')
    .select('doc_id, target_type, target_id, doc_type, seq, title, body_md, status, owner, version, updated_at, module, related_screens', { count: 'exact' })
    .order('target_id').order('doc_type').order('seq')
    .range(offset, offset + limit - 1);

  if (targetType) query = query.eq('target_type', targetType);
  if (targetId) {
    if (targetId.includes(',')) {
      query = query.in('target_id', targetId.split(',').map(s => s.trim()));
    } else {
      query = query.ilike('target_id', `%${targetId}%`);
    }
  }
  if (docType) query = query.eq('doc_type', docType);
  if (owner) query = query.eq('owner', owner);
  if (status) query = query.eq('status', status);
  if (moduleIds) query = query.in('target_id', moduleIds);
  if (relatedScreen) query = query.contains('related_screens', [relatedScreen]);
  if (q) query = query.or(`title.ilike.%${q}%,body_md.ilike.%${q}%`);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // screen titles + modules for display
  const { data: screens } = await supabase.from('bop_screens').select('screen_id, title, module');
  const smap = Object.fromEntries((screens ?? []).map((s: any) => [s.screen_id, s]));
  const { data: procs } = await supabase.from('bop_objects').select('object_id, name').eq('type', 'process');
  const pmap = Object.fromEntries((procs ?? []).map((x: any) => [x.object_id.replace('process:', ''), x.name]));

  // facet counts over the whole (unpaged, unfiltered-by-self) corpus for the filter bar
  const { data: all } = await supabase.from('bop_documentation').select('target_type, doc_type, owner, status');
  const facet = (key: string) => {
    const out: Record<string, number> = {};
    for (const r of all ?? []) out[(r as any)[key]] = (out[(r as any)[key]] ?? 0) + 1;
    return out;
  };

  return NextResponse.json({
    docs: (data ?? []).map((d: any) => ({
      ...d,
      target_title: d.target_type === 'screen'
        ? (smap[d.target_id]?.title ?? d.target_id)
        : (pmap[d.target_id] ?? d.target_id),
      target_module: d.target_type === 'screen' ? (smap[d.target_id]?.module ?? null) : d.target_type === 'platform' ? (d.module ?? 'SYS') : 'FLOW',
    })),
    total: count ?? 0,
    facets: { target_type: facet('target_type'), doc_type: facet('doc_type'), owner: facet('owner'), status: facet('status') },
  });
}

// PATCH /api/bop/sys/docs — inline editorial actions from the browser:
// { doc_id, approve: true }  → owner 'system' (draft promoted after review)
// { doc_id, body_md?, title?, status? } → content edit (bumps version)
export async function PATCH(req: NextRequest) {
  const supabase = getServerClient();
  const b = await req.json();
  if (!b.doc_id) return NextResponse.json({ error: 'doc_id required' }, { status: 400 });

  const patch: any = {};
  if (b.approve) patch.owner = 'system';
  if (b.body_md !== undefined) patch.body_md = b.body_md;
  if (b.title !== undefined) patch.title = b.title;
  if (b.status !== undefined) patch.status = b.status;
  if (!Object.keys(patch).length) return NextResponse.json({ error: 'nothing to update' }, { status: 400 });

  const { data, error } = await supabase.from('bop_documentation')
    .update(patch).eq('doc_id', b.doc_id).select('doc_id, owner, status').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, doc: data });
}

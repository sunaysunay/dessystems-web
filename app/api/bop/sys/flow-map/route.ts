import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

// GET /api/bop/sys/flow-map — full graph for the Flow Map:
// processes, their screens (involves), and each screen's api/table deps.
export async function GET(_req: NextRequest) {
  const supabase = getServerClient();

  const [{ data: procs }, { data: edges }, { data: screens }, { data: allDeps }, { data: objs }] = await Promise.all([
    supabase.from('bop_objects').select('object_id, name').eq('type', 'process').order('name'),
    supabase.from('bop_dependencies').select('from_id, to_id').like('from_id', 'process:%').eq('dep_type', 'involves'),
    supabase.from('bop_screens').select('screen_id, title, module, route'),
    supabase.from('bop_dependencies').select('from_id, to_id, dep_type').like('from_id', 'screen:%'),
    supabase.from('bop_objects').select('object_id, name, route').in('type', ['api', 'table']),
  ]);

  const smap = Object.fromEntries((screens ?? []).map((s: any) => [s.screen_id, s]));
  const omap = Object.fromEntries((objs ?? []).map((o: any) => [o.object_id, o]));

  // second hop: api → table
  const { data: apiDeps } = await supabase.from('bop_dependencies')
    .select('from_id, to_id, dep_type').like('from_id', 'api:%');

  return NextResponse.json({
    processes: (procs ?? []).map((p: any) => ({ slug: p.object_id.replace('process:', ''), name: p.name })),
    involves: (edges ?? []).map((e: any) => ({
      flow: e.from_id.replace('process:', ''), screen: e.to_id.replace('screen:', ''),
    })),
    screens: Object.values(smap),
    screenDeps: (allDeps ?? []).map((d: any) => ({
      screen: d.from_id.replace('screen:', ''), target: d.to_id, dep: d.dep_type,
      label: omap[d.to_id]?.route ?? omap[d.to_id]?.name ?? d.to_id.split(':').pop(),
      kind: d.to_id.startsWith('api:') ? 'api' : 'table',
    })),
    apiDeps: (apiDeps ?? []).map((d: any) => ({
      api: d.from_id, target: d.to_id, dep: d.dep_type,
      label: (omap[d.to_id]?.name ?? d.to_id.replace('table:', '')),
    })),
  });
}

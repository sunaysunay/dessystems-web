import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

// GET /api/bop/sys/search?q=xxx
// Returns screens matching title/id/route/module + meta matching api_routes paths or db_tables
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.toLowerCase().trim();
  if (!q || q.length < 2) return NextResponse.json({ results: [] });

  const supabase = getServerClient();

  const [screensRes, metaRes] = await Promise.all([
    supabase.from('bop_screens')
      .select('screen_id,title,module,route,status,lifecycle_state')
      .or(`screen_id.ilike.%${q}%,title.ilike.%${q}%,route.ilike.%${q}%,module.ilike.%${q}%`)
      .order('module').limit(20),
    supabase.from('bop_screen_meta')
      .select('screen_id,api_routes,db_tables'),
  ]);

  const screens = screensRes.data ?? [];
  const metas   = metaRes.data ?? [];

  // Build results: start with direct screen matches
  const results: any[] = screens.map(s => ({
    screen_id: s.screen_id, title: s.title, module: s.module,
    route: s.route, status: s.status, lifecycle_state: s.lifecycle_state,
    match_type: 'screen',
  }));

  const seenIds = new Set(results.map(r => r.screen_id));

  // Add meta matches (api_routes paths or db_tables containing query)
  for (const m of metas) {
    if (seenIds.has(m.screen_id)) continue;
    const apiMatch = (m.api_routes ?? []).some((r: any) =>
      r.path?.toLowerCase().includes(q)
    );
    const dbMatch = (m.db_tables ?? []).some((t: string) =>
      t.toLowerCase().includes(q)
    );
    if (!apiMatch && !dbMatch) continue;

    // Fetch screen title for this meta match
    const { data: s } = await supabase.from('bop_screens')
      .select('screen_id,title,module,route,status,lifecycle_state')
      .eq('screen_id', m.screen_id).single();
    if (s) {
      seenIds.add(m.screen_id);
      results.push({
        ...s,
        match_type: apiMatch ? 'api_route' : 'db_table',
        match_value: apiMatch
          ? (m.api_routes ?? []).find((r: any) => r.path?.toLowerCase().includes(q))?.path
          : (m.db_tables ?? []).find((t: string) => t.toLowerCase().includes(q)),
      });
    }
  }

  return NextResponse.json({ results: results.slice(0, 15) });
}

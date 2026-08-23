import { analyticsRoute, TENANT_ID } from '@/lib/ci/analytics-api';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

// CI-T33 — Scoring overview API: latest scores per entity, definitions, benchmarks.

export const GET = analyticsRoute('analytics.scoring', async (range) => {
  const sb = getServerClient();

  const [
    { data: defs },
    { data: results },
    { data: benchmarks },
  ] = await Promise.all([
    sb.from('ci_score_def')
      .select('*, ci_score_component(*)')
      .eq('tenant_id', TENANT_ID)
      .eq('is_active', true),
    sb.from('ci_score_result')
      .select('*')
      .eq('tenant_id', TENANT_ID)
      .eq('computed_date', range.to)
      .order('score', { ascending: false, nullsFirst: false })
      .limit(200),
    sb.from('ci_benchmark')
      .select('*')
      .eq('tenant_id', TENANT_ID)
      .eq('computed_date', range.to)
      .eq('scope', `site:${TENANT_ID}`),
  ]);

  const defMap = Object.fromEntries(
    (defs ?? []).map((d: Record<string, unknown>) => [d.id, d])
  );

  const grouped: Record<string, {
    definition: Record<string, unknown>;
    results: Record<string, unknown>[];
    summary: { total: number; scored: number; suppressed: number; avg: number };
  }> = {};

  for (const d of (defs ?? [])) {
    const defResults = (results ?? []).filter(
      (r: Record<string, unknown>) => r.score_def_id === d.id
    );
    const scored = defResults.filter((r: Record<string, unknown>) => r.score !== null);
    const suppressed = defResults.filter((r: Record<string, unknown>) => r.score === null);
    const avg = scored.length > 0
      ? scored.reduce((s: number, r: Record<string, unknown>) => s + Number(r.score ?? 0), 0) / scored.length
      : 0;

    grouped[String(d.score_key)] = {
      definition: d,
      results: defResults,
      summary: {
        total: defResults.length,
        scored: scored.length,
        suppressed: suppressed.length,
        avg: Math.round(avg * 10) / 10,
      },
    };
  }

  return {
    scores: grouped,
    benchmarks: benchmarks ?? [],
    date: range.to,
  };
});

import { analyticsRoute, TENANT_ID } from '@/lib/ci/analytics-api';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

// CI-T15 — Attention Center feed. The rule engine (ci_attention_item,
// migration v2_113) lands in R4; until then this serves the data-health
// reds as attention items so the Overview card has real content.

export const GET = analyticsRoute('analytics.attention', async () => {
  const sb = getServerClient();

  const { data: attention, error } = await sb
    .from('ci_attention_item')
    .select('*')
    .eq('tenant_id', TENANT_ID)
    .eq('status', 'open')
    .order('severity', { ascending: true })
    .limit(50);

  // Table absent until R4 (v2_113) — fall back to health reds.
  if (error) {
    const { data: health } = await sb
      .from('ci_data_health')
      .select('check_name, status, message, actual_value, checked_at')
      .eq('tenant_id', TENANT_ID)
      .neq('status', 'green')
      .order('status', { ascending: false });

    return {
      items: (health ?? []).map(h => ({
        rule_id: h.check_name,
        severity: h.status === 'red' ? 'critical' : 'medium',
        title: h.message,
        evidence: h.actual_value,
        last_seen: h.checked_at,
        source: 'data_health',
      })),
      engine: 'data_health_fallback',
      note: 'Attention rule engine arrives in R4 (CI-T34+); showing data-health findings.',
    };
  }

  return { items: attention ?? [], engine: 'attention_rules' };
});

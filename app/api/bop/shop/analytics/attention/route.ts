import { NextRequest, NextResponse } from 'next/server';
import { analyticsRoute, requireAnalyticsView, TENANT_ID } from '@/lib/ci/analytics-api';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export const GET = analyticsRoute('analytics.attention', async () => {
  const sb = getServerClient();

  const { data: attention, error } = await sb
    .from('ci_attention_item')
    .select('*')
    .eq('tenant_id', TENANT_ID)
    .eq('status', 'open')
    .order('severity', { ascending: true })
    .limit(50);

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

  const { data: history } = await sb
    .from('ci_attention_item')
    .select('id, rule_id, severity, title, status, actioned_by, actioned_at, outcome_note, first_seen, last_seen')
    .eq('tenant_id', TENANT_ID)
    .in('status', ['actioned', 'dismissed', 'expired'])
    .order('actioned_at', { ascending: false })
    .limit(20);

  return { items: attention ?? [], history: history ?? [], engine: 'attention_rules' };
});

export async function POST(request: NextRequest) {
  const guard = await requireAnalyticsView('analytics.attention');
  if (guard instanceof NextResponse) return guard;

  const body = await request.json();
  const { action, item_id, outcome_note } = body;

  if (!action || !item_id) {
    return NextResponse.json({ error: 'action and item_id required' }, { status: 400 });
  }
  if (!['action', 'dismiss'].includes(action)) {
    return NextResponse.json({ error: 'action must be "action" or "dismiss"' }, { status: 400 });
  }

  const sb = getServerClient();
  const newStatus = action === 'action' ? 'actioned' : 'dismissed';

  const { error } = await sb
    .from('ci_attention_item')
    .update({
      status: newStatus,
      actioned_by: guard.role,
      actioned_at: new Date().toISOString(),
      outcome_note: outcome_note ?? null,
    })
    .eq('id', item_id)
    .eq('tenant_id', TENANT_ID)
    .eq('status', 'open');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, status: newStatus });
}

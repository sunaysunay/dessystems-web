import { analyticsRoute, factRows, sumBy, pctChange, TENANT_ID } from '@/lib/ci/analytics-api';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

// CI-T15/CI-T17 — Overview: 8 KPI cards with comparison base + health score.

export const GET = analyticsRoute('analytics.overview', async (range) => {
  const [cur, prev, traffic, prevTraffic, funnel, prevFunnel] = await Promise.all([
    factRows('ci_daily_sales', range),
    factRows('ci_daily_sales', { from: range.prevFrom, to: range.prevTo }),
    factRows('ci_daily_traffic', range),
    factRows('ci_daily_traffic', { from: range.prevFrom, to: range.prevTo }),
    factRows('ci_daily_funnel', range),
    factRows('ci_daily_funnel', { from: range.prevFrom, to: range.prevTo }),
  ]);

  const kpi = (plane: 'A' | 'B', value: number, prevValue: number, n?: number) => ({
    plane, value, prev: prevValue, change_pct: pctChange(value, prevValue), ...(n != null ? { n } : {}),
  });

  const netSales = sumBy(cur, 'net_sales_cents');
  const prevNet = sumBy(prev, 'net_sales_cents');
  const orders = sumBy(cur, 'orders');
  const prevOrders = sumBy(prev, 'orders');
  const contribution = sumBy(cur, 'contribution_cents');
  const sessions = sumBy(traffic, 'sessions');
  const prevSessions = sumBy(prevTraffic, 'sessions');
  const funnelSessions = sumBy(funnel, 'sessions_total');
  const funnelOrders = sumBy(funnel, 'sessions_order');
  const prevFunnelSessions = sumBy(prevFunnel, 'sessions_total');
  const prevFunnelOrders = sumBy(prevFunnel, 'sessions_order');

  const cvr = funnelSessions > 0 ? Math.round((funnelOrders / funnelSessions) * 10000) / 100 : 0;
  const prevCvr = prevFunnelSessions > 0 ? Math.round((prevFunnelOrders / prevFunnelSessions) * 10000) / 100 : 0;

  const sb = getServerClient();
  const { data: health } = await sb
    .from('ci_data_health')
    .select('status')
    .eq('tenant_id', TENANT_ID);
  const checks = health ?? [];
  const healthScore = checks.length > 0
    ? Math.round((checks.filter(c => c.status === 'green').length / checks.length) * 100)
    : null;

  const consentSessions = sumBy(traffic, 'consent_sessions');
  const consentRate = sessions > 0 ? Math.round((consentSessions / sessions) * 1000) / 10 : null;

  return {
    cards: {
      net_sales_cents: kpi('A', netSales, prevNet, orders),
      orders: kpi('A', orders, prevOrders),
      contribution_cents: kpi('A', contribution, sumBy(prev, 'contribution_cents'), orders),
      avg_order_value_cents: kpi('A', orders > 0 ? Math.round(netSales / orders) : 0, prevOrders > 0 ? Math.round(prevNet / prevOrders) : 0),
      refund_cents: kpi('A', sumBy(cur, 'refund_cents'), sumBy(prev, 'refund_cents')),
      sessions: kpi('B', sessions, prevSessions),
      cvr_pct: kpi('B', cvr, prevCvr, funnelSessions),
      items_sold: kpi('A', sumBy(cur, 'items_sold'), sumBy(prev, 'items_sold')),
    },
    health_score: healthScore,
    consent_rate_pct: consentRate,
    daily: cur.map(r => ({
      date: r.fact_date, net_sales_cents: r.net_sales_cents, orders: r.orders, partial: r.partial,
    })),
  };
});

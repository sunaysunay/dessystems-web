import { analyticsRoute, factRows, sumBy, pctChange } from '@/lib/ci/analytics-api';

export const dynamic = 'force-dynamic';

// CI-T15/CI-T21 — Traffic + MER/POAS.
// POAS uses contribution, never revenue (§ CI-T21 acceptance).
// ROAS is shown but captioned "directional" — Plane B attribution is
// consent-limited and never the reference for a euro figure.

export const GET = analyticsRoute('analytics.traffic', async (range) => {
  const [traffic, prevTraffic, campaigns, adSpend, sales] = await Promise.all([
    factRows('ci_daily_traffic', range),
    factRows('ci_daily_traffic', { from: range.prevFrom, to: range.prevTo }),
    factRows('ci_daily_campaign', range),
    factRows('ci_ad_spend_daily', range),
    factRows('ci_daily_sales', range),
  ]);

  const sessions = sumBy(traffic, 'sessions');
  const totalSpend = sumBy(adSpend, 'spend_eur_cents');
  const netSales = sumBy(sales, 'net_sales_cents');
  const contribution = sumBy(sales, 'contribution_cents');

  // Campaign rollup (Plane B sessions + Plane A order attribution per UTM).
  const bySource = new Map<string, any>();
  for (const c of campaigns as any[]) {
    const key = `${c.utm_source}|${c.utm_medium ?? ''}|${c.utm_campaign ?? ''}`;
    const acc = bySource.get(key) ?? {
      utm_source: c.utm_source, utm_medium: c.utm_medium, utm_campaign: c.utm_campaign,
      sessions: 0, page_views: 0, orders: 0, net_sales_cents: 0, contribution_cents: 0,
    };
    acc.sessions += c.sessions; acc.page_views += c.page_views; acc.orders += c.orders;
    acc.net_sales_cents += c.net_sales_cents; acc.contribution_cents += c.contribution_cents;
    bySource.set(key, acc);
  }

  return {
    totals: {
      sessions,
      prev_sessions: sumBy(prevTraffic, 'sessions'),
      change_pct: pctChange(sessions, sumBy(prevTraffic, 'sessions')),
      unique_visitors: sumBy(traffic, 'unique_visitors'),
      page_views: sumBy(traffic, 'page_views'),
      bounces: sumBy(traffic, 'bounces'),
      bounce_rate_pct: sessions > 0 ? Math.round((sumBy(traffic, 'bounces') / sessions) * 1000) / 10 : null,
      bot_sessions: sumBy(traffic, 'bot_sessions'),
      consent_rate_pct: sessions > 0 ? Math.round((sumBy(traffic, 'consent_sessions') / sessions) * 1000) / 10 : null,
    },
    spend: {
      total_spend_eur_cents: totalSpend,
      // MER: whole-business net sales / whole-business ad spend (Plane A).
      mer: totalSpend > 0 ? Math.round((netSales / totalSpend) * 100) / 100 : null,
      // POAS: contribution / spend — profitability, not revenue.
      poas: totalSpend > 0 ? Math.round((contribution / totalSpend) * 100) / 100 : null,
      roas_note: 'Per-campaign ROAS is directional — consent-limited Plane B attribution.',
    },
    campaigns: [...bySource.values()].sort((a, b) => b.sessions - a.sessions),
    daily: (traffic as any[]).map(r => ({
      date: r.fact_date, sessions: r.sessions, page_views: r.page_views, partial: r.partial,
    })),
  };
});

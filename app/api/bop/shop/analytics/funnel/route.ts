import { analyticsRoute, factRows, sumBy } from '@/lib/ci/analytics-api';

export const dynamic = 'force-dynamic';

// CI-T15/CI-T19 — Funnel: 6 stages, Plane B, with consent-projection toggle.
// cvr_projected divides observed orders (Plane A complete) by consent-scaled
// sessions; it is labelled a projection, never mixed silently (§ non-negotiable 1).

export const GET = analyticsRoute('analytics.funnel', async (range, request) => {
  const [funnel, traffic] = await Promise.all([
    factRows('ci_daily_funnel', range),
    factRows('ci_daily_traffic', range),
  ]);

  const stages = [
    { stage: 'sessions', count: sumBy(funnel, 'sessions_total') },
    { stage: 'product_view', count: sumBy(funnel, 'sessions_product_view') },
    { stage: 'cart_add', count: sumBy(funnel, 'sessions_cart_add') },
    { stage: 'checkout', count: sumBy(funnel, 'sessions_checkout') },
    { stage: 'payment', count: sumBy(funnel, 'sessions_payment') },
    { stage: 'order', count: sumBy(funnel, 'sessions_order') },
  ];

  const withRates = stages.map((s, i) => ({
    ...s,
    plane: 'B',
    step_rate_pct: i === 0 || stages[i - 1].count === 0
      ? null
      : Math.round((s.count / stages[i - 1].count) * 1000) / 10,
  }));

  const sessions = sumBy(traffic, 'sessions');
  const consentSessions = sumBy(traffic, 'consent_sessions');
  const consentRate = sessions > 0 ? consentSessions / sessions : 0;

  const observedCvr = stages[0].count > 0
    ? Math.round((stages[5].count / stages[0].count) * 10000) / 100 : null;
  const projected = request.nextUrl.searchParams.get('projected') === 'true';
  const cvrProjected = consentRate > 0 && stages[0].count > 0
    ? Math.round((stages[5].count / (stages[0].count / consentRate)) * 10000) / 100
    : null;

  return {
    stages: withRates,
    cvr_pct: observedCvr,
    consent_rate_pct: Math.round(consentRate * 1000) / 10,
    ...(projected ? { cvr_projected_pct: cvrProjected, projection_basis: 'sessions scaled by stored consent_rate' } : {}),
  };
});

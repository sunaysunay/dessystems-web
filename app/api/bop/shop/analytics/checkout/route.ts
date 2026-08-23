import { analyticsRoute, factRows, sumBy } from '@/lib/ci/analytics-api';

export const dynamic = 'force-dynamic';

// CI-T15/CI-T23 — Cart & Checkout: step drop-off + payment failure rates.

export const GET = analyticsRoute('analytics.checkout', async (range) => {
  const [checkout, cart] = await Promise.all([
    factRows('ci_daily_checkout', range),
    factRows('ci_daily_cart', range),
  ]);

  const started = sumBy(checkout, 'checkouts_started');
  const completed = sumBy(checkout, 'checkouts_completed');
  const attempts = sumBy(checkout, 'payment_attempts');
  const failures = sumBy(checkout, 'payment_failures');
  const cartAdds = sumBy(cart, 'cart_adds');
  const abandoned = sumBy(cart, 'carts_abandoned');
  const converted = sumBy(cart, 'carts_converted');

  return {
    checkout: {
      started,
      completed,
      completion_rate_pct: started > 0 ? Math.round((completed / started) * 1000) / 10 : null,
      payment_attempts: attempts,
      payment_failures: failures,
      payment_failure_rate_pct: attempts > 0 ? Math.round((failures / attempts) * 1000) / 10 : null,
    },
    cart: {
      cart_adds: cartAdds,
      cart_removes: sumBy(cart, 'cart_removes'),
      cart_views: sumBy(cart, 'cart_views'),
      carts_abandoned: abandoned,
      carts_converted: converted,
      abandonment_rate_pct: (abandoned + converted) > 0
        ? Math.round((abandoned / (abandoned + converted)) * 1000) / 10 : null,
    },
    daily: (checkout as any[]).map(r => ({
      date: r.fact_date,
      started: r.checkouts_started,
      completed: r.checkouts_completed,
      failures: r.payment_failures,
      partial: r.partial,
    })),
  };
});

// CI-T35 — All 13 intelligence rules (spec §8)
// Each rule has fire + must-not-fire guards.

import {
  registerRule, mean, stddev, zScore, twoProportionZTest,
  type RuleContext, type AttentionCandidate, type Severity,
} from './rule-engine';

function daysAgo(today: string, days: number): string {
  const d = new Date(today);
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

// ── 1. payment_failure_spike (critical, n≥20) ──
registerRule({
  id: 'payment_failure_spike',
  severity: 'critical',
  async run(ctx) {
    const { data: recent } = await ctx.supabase.from('ci_daily_checkout')
      .select('fact_date, payment_attempts, payment_failures')
      .gte('fact_date', daysAgo(ctx.today, 7))
      .order('fact_date');
    if (!recent?.length) return [];

    const todayRow = recent.find((r: any) => r.fact_date === ctx.today);
    if (!todayRow || todayRow.payment_attempts < 20) return [];

    const prior = recent.filter((r: any) => r.fact_date !== ctx.today);
    if (prior.length < 2) return [];
    const priorRates = prior.map((r: any) => r.payment_failures / (r.payment_attempts || 1));
    const todayRate = todayRow.payment_failures / todayRow.payment_attempts;
    const m = mean(priorRates);
    const sd = stddev(priorRates);
    if (sd === 0 || zScore(todayRate, m, sd) <= 3) return [];

    return [{
      rule_id: 'payment_failure_spike', severity: 'critical',
      entity_type: null, entity_id: null,
      title: `Payment failure rate spiked to ${(todayRate * 100).toFixed(1)}%`,
      detail: { rate: todayRate, mean: m, stddev: sd, n: todayRow.payment_attempts },
      evidence: { today_failures: todayRow.payment_failures, today_attempts: todayRow.payment_attempts },
    }];
  },
});

// ── 2. checkout_error_spike (critical, n≥50) ──
registerRule({
  id: 'checkout_error_spike',
  severity: 'critical',
  async run(ctx) {
    const { data: recent } = await ctx.supabase.from('ci_daily_checkout')
      .select('fact_date, sessions, checkout_errors')
      .gte('fact_date', daysAgo(ctx.today, 7))
      .order('fact_date');
    if (!recent?.length) return [];

    const todayRow = recent.find((r: any) => r.fact_date === ctx.today);
    if (!todayRow || todayRow.sessions < 50) return [];

    const baseline = mean(recent.filter((r: any) => r.fact_date !== ctx.today).map((r: any) => r.checkout_errors || 0));
    if (baseline === 0 || (todayRow.checkout_errors || 0) <= baseline * 2) return [];

    return [{
      rule_id: 'checkout_error_spike', severity: 'critical',
      entity_type: null, entity_id: null,
      title: `Checkout errors at ${todayRow.checkout_errors} (2×+ baseline ${baseline.toFixed(0)})`,
      detail: { errors: todayRow.checkout_errors, baseline, sessions: todayRow.sessions },
      evidence: { ratio: todayRow.checkout_errors / baseline },
    }];
  },
});

// ── 3. revenue_drop (critical, ≥8 weeks history) ──
registerRule({
  id: 'revenue_drop',
  severity: 'critical',
  async run(ctx) {
    const { data: weeks } = await ctx.supabase.from('ci_daily_sales')
      .select('fact_date, net_sales_cents')
      .gte('fact_date', daysAgo(ctx.today, 63)) // 9 weeks
      .order('fact_date');
    if (!weeks?.length || weeks.length < 56) return []; // need ≥8 weeks

    const weekTotals: number[] = [];
    for (let i = 0; i < weeks.length; i += 7) {
      const chunk = weeks.slice(i, i + 7);
      if (chunk.length === 7) weekTotals.push(chunk.reduce((s: number, r: any) => s + (r.net_sales_cents || 0), 0));
    }
    if (weekTotals.length < 8) return [];

    const last7d = weekTotals[weekTotals.length - 1];
    const prior = weekTotals.slice(0, -1);
    const m = mean(prior);
    const sd = stddev(prior);
    if (sd === 0 || zScore(last7d, m, sd) >= -2.5) return [];

    return [{
      rule_id: 'revenue_drop', severity: 'critical',
      entity_type: null, entity_id: null,
      title: `Weekly revenue €${(last7d / 100).toFixed(0)} is ${((m - last7d) / m * 100).toFixed(0)}% below average`,
      detail: { last7d, mean: m, stddev: sd, weeks: weekTotals.length },
      evidence: { z_score: zScore(last7d, m, sd) },
    }];
  },
});

// ── 4. cvr_drop (high, n≥300 each side, z-test p<0.05, ≥15% drop) ──
registerRule({
  id: 'cvr_drop',
  severity: 'high',
  async run(ctx) {
    const { data: recent } = await ctx.supabase.from('ci_daily_funnel')
      .select('fact_date, sessions_total, sessions_order')
      .gte('fact_date', daysAgo(ctx.today, 14))
      .order('fact_date');
    if (!recent?.length) return [];

    const mid = daysAgo(ctx.today, 7);
    const period1 = recent.filter((r: any) => r.fact_date < mid);
    const period2 = recent.filter((r: any) => r.fact_date >= mid);

    const n1 = period1.reduce((s: number, r: any) => s + (r.sessions_total || 0), 0);
    const n2 = period2.reduce((s: number, r: any) => s + (r.sessions_total || 0), 0);
    if (n1 < 300 || n2 < 300) return [];

    const o1 = period1.reduce((s: number, r: any) => s + (r.sessions_order || 0), 0);
    const o2 = period2.reduce((s: number, r: any) => s + (r.sessions_order || 0), 0);
    const p1 = o1 / n1;
    const p2 = o2 / n2;

    if (p2 >= p1 * 0.85) return []; // less than 15% drop
    const { pValue } = twoProportionZTest(p1, n1, p2, n2);
    if (pValue >= 0.05) return [];

    return [{
      rule_id: 'cvr_drop', severity: 'high',
      entity_type: null, entity_id: null,
      title: `CVR dropped ${((1 - p2 / p1) * 100).toFixed(0)}%: ${(p1 * 100).toFixed(2)}% → ${(p2 * 100).toFixed(2)}%`,
      detail: { p1, n1, p2, n2, pValue, drop_pct: (1 - p2 / p1) * 100 },
      evidence: { p_value: pValue },
    }];
  },
});

// ── 5. stockout_imminent (high, grouped by supplier) ──
registerRule({
  id: 'stockout_imminent',
  severity: 'high',
  async run(ctx) {
    const { data: inv } = await ctx.supabase.from('ci_daily_inventory')
      .select('variant_id, days_of_stock, supplier_lead_time, supplier_id')
      .eq('fact_date', ctx.today)
      .lt('days_of_stock', 999); // only items with stock tracking
    if (!inv?.length) return [];

    const alerts: AttentionCandidate[] = [];
    for (const item of inv) {
      const dos = item.days_of_stock ?? 999;
      const lead = item.supplier_lead_time ?? 14;
      if (dos < lead) {
        alerts.push({
          rule_id: 'stockout_imminent', severity: 'high',
          entity_type: 'product', entity_id: item.variant_id,
          title: `Stockout in ~${dos}d (lead time ${lead}d)`,
          detail: { days_of_stock: dos, supplier_lead_time: lead, supplier_id: item.supplier_id },
          evidence: { variant_id: item.variant_id },
        });
      }
    }
    return alerts;
  },
});

// ── 6. margin_erosion (high, n≥50 orders) ──
registerRule({
  id: 'margin_erosion',
  severity: 'high',
  async run(ctx) {
    const { data: recent } = await ctx.supabase.from('ci_daily_sales')
      .select('fact_date, net_sales_cents, contribution_cents, orders')
      .gte('fact_date', daysAgo(ctx.today, 90))
      .order('fact_date');
    if (!recent?.length) return [];

    const totalOrders = recent.reduce((s: number, r: any) => s + (r.orders || 0), 0);
    if (totalOrders < 50) return [];

    const last7 = recent.filter((r: any) => r.fact_date >= daysAgo(ctx.today, 7));
    const prior = recent.filter((r: any) => r.fact_date < daysAgo(ctx.today, 7));

    const recentRev = last7.reduce((s: number, r: any) => s + (r.net_sales_cents || 0), 0);
    const recentContrib = last7.reduce((s: number, r: any) => s + (r.contribution_cents || 0), 0);
    const priorRev = prior.reduce((s: number, r: any) => s + (r.net_sales_cents || 0), 0);
    const priorContrib = prior.reduce((s: number, r: any) => s + (r.contribution_cents || 0), 0);

    if (recentRev === 0 || priorRev === 0) return [];
    const recentPct = recentContrib / recentRev * 100;
    const priorPct = priorContrib / priorRev * 100;

    if (priorPct - recentPct <= 3) return []; // less than 3pp drop

    return [{
      rule_id: 'margin_erosion', severity: 'high',
      entity_type: null, entity_id: null,
      title: `Contribution margin dropped ${(priorPct - recentPct).toFixed(1)}pp (${priorPct.toFixed(1)}% → ${recentPct.toFixed(1)}%)`,
      detail: { recent_pct: recentPct, prior_pct: priorPct, drop_pp: priorPct - recentPct },
      evidence: { recent_revenue: recentRev, recent_contribution: recentContrib },
    }];
  },
});

// ── 7. wrong_fit_returns (high, n≥15) ──
registerRule({
  id: 'wrong_fit_returns',
  severity: 'high',
  async run(ctx) {
    const { data: products } = await ctx.supabase.from('ci_daily_product')
      .select('variant_id, orders, returns, return_reason_fit')
      .eq('fact_date', ctx.today);
    if (!products?.length) return [];

    const alerts: AttentionCandidate[] = [];
    for (const p of products) {
      const fitReturns = p.return_reason_fit ?? 0;
      const units = p.orders ?? 0;
      if (units < 15 || fitReturns === 0) continue;
      const rate = fitReturns / units;
      if (rate > 0.08) {
        alerts.push({
          rule_id: 'wrong_fit_returns', severity: 'high',
          entity_type: 'product', entity_id: p.variant_id,
          title: `Wrong-fit return rate ${(rate * 100).toFixed(1)}% (${fitReturns}/${units})`,
          detail: { rate, fit_returns: fitReturns, units },
          evidence: { variant_id: p.variant_id },
        });
      }
    }
    return alerts;
  },
});

// ── 8. zero_result_demand (opportunity) ──
registerRule({
  id: 'zero_result_demand',
  severity: 'opportunity',
  async run(ctx) {
    const { data: searches } = await ctx.supabase.from('ci_daily_search')
      .select('query_normalised, search_count, zero_results')
      .eq('fact_date', ctx.today);
    if (!searches?.length) return [];

    const alerts: AttentionCandidate[] = [];
    for (const s of searches) {
      if (s.zero_results && s.search_count >= 50) {
        alerts.push({
          rule_id: 'zero_result_demand', severity: 'opportunity',
          entity_type: 'query', entity_id: s.query_normalised,
          title: `"${s.query_normalised}" — ${s.search_count} searches, zero results`,
          detail: { query: s.query_normalised, count: s.search_count },
          evidence: {},
        });
      }
    }
    return alerts;
  },
});

// ── 9. hidden_opportunity (opportunity, confidence≥0.6) ──
registerRule({
  id: 'hidden_opportunity',
  severity: 'opportunity',
  async run(ctx) {
    const { data: scores } = await ctx.supabase.from('ci_score_result')
      .select('entity_id, score, confidence, components')
      .eq('computed_date', ctx.today)
      .eq('entity_type', 'product')
      .gte('confidence', 0.6)
      .not('score', 'is', null);
    if (!scores?.length) return [];

    const alerts: AttentionCandidate[] = [];
    for (const s of scores) {
      const score = s.score ?? 0;
      const trend = (s.components as any)?.trend?.value ?? 0;
      if (score < 50 && trend >= 0) {
        alerts.push({
          rule_id: 'hidden_opportunity', severity: 'opportunity',
          entity_type: 'product', entity_id: s.entity_id,
          title: `Hidden opportunity: score ${score.toFixed(0)} with positive trend`,
          detail: { score, trend, confidence: s.confidence },
          evidence: { entity_id: s.entity_id },
        });
      }
    }
    return alerts;
  },
});

// ── 10. dead_stock (medium, grouped, stock value ≥€250) ──
registerRule({
  id: 'dead_stock',
  severity: 'medium',
  async run(ctx) {
    const { data: inv } = await ctx.supabase.from('ci_daily_inventory')
      .select('variant_id, stock_value_cents, days_since_last_sale, supplier_id')
      .eq('fact_date', ctx.today)
      .gte('days_since_last_sale', 90);
    if (!inv?.length) return [];

    const alerts: AttentionCandidate[] = [];
    for (const item of inv) {
      if ((item.stock_value_cents ?? 0) >= 25000) { // €250
        alerts.push({
          rule_id: 'dead_stock', severity: 'medium',
          entity_type: 'product', entity_id: item.variant_id,
          title: `Dead stock: €${((item.stock_value_cents ?? 0) / 100).toFixed(0)} value, ${item.days_since_last_sale}d since last sale`,
          detail: { stock_value_cents: item.stock_value_cents, days_since_last_sale: item.days_since_last_sale },
          evidence: { variant_id: item.variant_id },
        });
      }
    }
    return alerts;
  },
});

// ── 11. promise_miss (medium, n≥30) ──
registerRule({
  id: 'promise_miss',
  severity: 'medium',
  async run(ctx) {
    const { data: fulfilment } = await ctx.supabase.from('ci_daily_fulfilment')
      .select('fact_date, orders_fulfilled, orders_on_time')
      .gte('fact_date', daysAgo(ctx.today, 30));
    if (!fulfilment?.length) return [];

    const totalFulfilled = fulfilment.reduce((s: number, r: any) => s + (r.orders_fulfilled || 0), 0);
    const totalOnTime = fulfilment.reduce((s: number, r: any) => s + (r.orders_on_time || 0), 0);
    if (totalFulfilled < 30) return [];

    const accuracy = totalOnTime / totalFulfilled;
    if (accuracy >= 0.9) return [];

    return [{
      rule_id: 'promise_miss', severity: 'medium',
      entity_type: null, entity_id: null,
      title: `Promise accuracy ${(accuracy * 100).toFixed(1)}% (target 90%)`,
      detail: { accuracy, fulfilled: totalFulfilled, on_time: totalOnTime },
      evidence: { period_days: 30 },
    }];
  },
});

// ── 12. oss_threshold (high) ──
registerRule({
  id: 'oss_threshold',
  severity: 'high',
  async run(ctx) {
    const { data: countries } = await ctx.supabase.from('ci_daily_sales')
      .select('country, net_sales_cents')
      .gte('fact_date', daysAgo(ctx.today, 365));
    if (!countries?.length) return [];

    const OSS_LIMIT_CENTS = 1000000; // €10,000 threshold
    const byCountry = new Map<string, number>();
    for (const r of countries) {
      if (!r.country) continue;
      byCountry.set(r.country, (byCountry.get(r.country) ?? 0) + (r.net_sales_cents ?? 0));
    }

    const alerts: AttentionCandidate[] = [];
    for (const [country, total] of byCountry) {
      if (total >= OSS_LIMIT_CENTS * 0.8) {
        alerts.push({
          rule_id: 'oss_threshold', severity: 'high',
          entity_type: 'country', entity_id: country,
          title: `${country} at ${((total / OSS_LIMIT_CENTS) * 100).toFixed(0)}% of OSS threshold (€${(total / 100).toFixed(0)}/€${OSS_LIMIT_CENTS / 100})`,
          detail: { country, total_cents: total, threshold_cents: OSS_LIMIT_CENTS, pct: total / OSS_LIMIT_CENTS * 100 },
          evidence: {},
        });
      }
    }
    return alerts;
  },
});

// ── 13. consent_shift (medium) ──
registerRule({
  id: 'consent_shift',
  severity: 'medium',
  async run(ctx) {
    const { data: traffic } = await ctx.supabase.from('ci_daily_traffic')
      .select('fact_date, sessions, consent_yes')
      .gte('fact_date', daysAgo(ctx.today, 14))
      .order('fact_date');
    if (!traffic?.length || traffic.length < 7) return [];

    const mid = daysAgo(ctx.today, 7);
    const prev = traffic.filter((r: any) => r.fact_date < mid);
    const curr = traffic.filter((r: any) => r.fact_date >= mid);

    const prevSessions = prev.reduce((s: number, r: any) => s + (r.sessions || 0), 0);
    const prevConsent = prev.reduce((s: number, r: any) => s + (r.consent_yes || 0), 0);
    const currSessions = curr.reduce((s: number, r: any) => s + (r.sessions || 0), 0);
    const currConsent = curr.reduce((s: number, r: any) => s + (r.consent_yes || 0), 0);

    if (prevSessions === 0 || currSessions === 0) return [];
    const prevRate = prevConsent / prevSessions * 100;
    const currRate = currConsent / currSessions * 100;
    const shift = Math.abs(currRate - prevRate);

    if (shift <= 10) return [];

    return [{
      rule_id: 'consent_shift', severity: 'medium',
      entity_type: null, entity_id: null,
      title: `Consent rate shifted ${shift.toFixed(1)}pp (${prevRate.toFixed(1)}% → ${currRate.toFixed(1)}%)`,
      detail: { prev_rate: prevRate, curr_rate: currRate, shift_pp: shift },
      evidence: { prev_sessions: prevSessions, curr_sessions: currSessions },
    }];
  },
});

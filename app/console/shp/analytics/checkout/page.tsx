'use client';
// SH106 — CI001 Cart & Checkout: drop-off + payment failure rates.
import { useState } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import { Section, RangePicker, Spark, KpiCard } from '@/components/CockpitKit';
import { useAnalytics, fmtNum, fmtPct, DegradedBanner, ForbiddenNote } from '@/components/ci/analytics';

export default function SH106Page() {
  const [range, setRange] = useState(30);
  const { data: d, forbidden, error } = useAnalytics('checkout', range);

  if (forbidden) return <div className="p-6"><ScreenHeader title="Cart & Checkout" /><ForbiddenNote /></div>;

  const c = d?.checkout;
  const k = d?.cart;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <ScreenHeader title="Cart & Checkout" description="Step drop-off, abandonment and payment failure rates" />
        <RangePicker value={range} onChange={setRange} />
      </div>
      <DegradedBanner degraded={d?.degraded} reason={d?.degraded_reason} />
      {error && <div className="mt-3 text-[12px] text-red-600">{error}</div>}

      {c && k && (
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard label="Checkouts started" value={fmtNum(c.started)} plane="B"
            base={{ prev: fmtNum(c.completed), label: 'completed', changePct: null }} />
          <KpiCard label="Completion rate" value={fmtPct(c.completion_rate_pct)} plane="B"
            base={{ prev: '—', label: 'of started checkouts', changePct: null }} n={c.started} />
          <KpiCard label="Payment failure rate" value={fmtPct(c.payment_failure_rate_pct)} plane="A"
            base={{ prev: fmtNum(c.payment_attempts), label: 'attempts', changePct: null }} n={c.payment_attempts} />
          <KpiCard label="Cart abandonment" value={fmtPct(k.abandonment_rate_pct)} plane="B"
            base={{ prev: fmtNum(k.carts_converted), label: 'carts converted', changePct: null }} />
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section title="Checkouts per day">
          {d?.daily && (
            <>
              <Spark data={d.daily.map((r: any) => r.started)} height={48} />
              <Spark data={d.daily.map((r: any) => r.completed)} height={48} color="#10b981" />
            </>
          )}
        </Section>
        <Section title="Payment failures per day">
          {d?.daily && <Spark data={d.daily.map((r: any) => r.failures)} height={48} color="#ef4444" />}
        </Section>
      </div>
    </div>
  );
}

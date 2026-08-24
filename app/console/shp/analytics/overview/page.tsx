'use client';
// SH100 — CI001 Overview: 8 KPI cards, health score, consent badge.
import { useState } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import { Section, RangePicker, Spark, KpiCard, ConsentCoverageBadge, Dot } from '@/components/CockpitKit';
import { useAnalytics, fmtEur, fmtNum, fmtPct, DegradedBanner, ForbiddenNote } from '@/components/ci/analytics';

export default function SH100Page() {
  const [range, setRange] = useState(30);
  const { data: d, forbidden, error } = useAnalytics('overview', range);

  const baseLabel = `vs prev ${range} d`;
  const card = (c: any, fmt: (n: number) => string) => c && ({
    value: fmt(c.value), plane: c.plane as 'A' | 'B',
    base: { prev: fmt(c.prev), label: baseLabel, changePct: c.change_pct }, n: c.n,
  });

  if (forbidden) return <div className="p-6"><ScreenHeader title="Overview" /><ForbiddenNote /></div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <ScreenHeader title="Overview" description="DESShop commerce intelligence — Plane A money, Plane B behaviour" />
        <div className="flex items-center gap-2">
          {d && <ConsentCoverageBadge ratePct={d.consent_rate_pct} />}
          <RangePicker value={range} onChange={setRange} />
        </div>
      </div>
      <DegradedBanner degraded={d?.degraded} reason={d?.degraded_reason} />
      {error && <div className="mt-3 text-[12px] text-red-600">{error}</div>}

      {d?.cards && (
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard label="Net Sales" {...card(d.cards.net_sales_cents, fmtEur)!} />
          <KpiCard label="Orders" {...card(d.cards.orders, fmtNum)!} />
          <KpiCard label="Contribution" {...card(d.cards.contribution_cents, fmtEur)!} />
          <KpiCard label="Avg Order Value" {...card(d.cards.avg_order_value_cents, fmtEur)!} />
          <KpiCard label="Refunds" {...card(d.cards.refund_cents, fmtEur)!} />
          <KpiCard label="Sessions" {...card(d.cards.sessions, fmtNum)!} />
          <KpiCard label="Conversion Rate" {...card(d.cards.cvr_pct, fmtPct)!} />
          <KpiCard label="Items Sold" {...card(d.cards.items_sold, fmtNum)!} />
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Section title="Net sales per day" right={undefined}>
          {d?.daily && <Spark data={d.daily.map((r: any) => r.net_sales_cents / 100)} height={56} />}
        </Section>
        <Section title="Orders per day">
          {d?.daily && <Spark data={d.daily.map((r: any) => r.orders)} height={56} color="#10b981" />}
        </Section>
        <Section title="Data health">
          <div className="flex items-center gap-2 text-[13px] text-slate-700">
            <Dot status={d?.health_score == null ? 'amber' : d.health_score >= 100 ? 'green' : d.health_score >= 80 ? 'amber' : 'red'} />
            {d?.health_score == null ? 'No checks recorded yet' : `${d.health_score}% of checks green`}
          </div>
        </Section>
      </div>
    </div>
  );
}

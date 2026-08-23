'use client';
// SH107 — CI001 Inventory: stock-health snapshot + series.
import { useState } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import { Section, RangePicker, Spark, KpiCard } from '@/components/CockpitKit';
import { useAnalytics, fmtNum, fmtPct, DegradedBanner, ForbiddenNote } from '@/components/ci/analytics';

export default function SH107Page() {
  const [range, setRange] = useState(30);
  const { data: d, forbidden, error } = useAnalytics('inventory', range);

  if (forbidden) return <div className="p-6"><ScreenHeader title="Inventory" /><ForbiddenNote /></div>;

  const s = d?.snapshot;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <ScreenHeader title="Inventory Health" description="Daily stock snapshot — reorder proposals and dead-stock classification arrive with R3 scoring" />
        <RangePicker value={range} onChange={setRange} />
      </div>
      <DegradedBanner degraded={d?.degraded} reason={d?.degraded_reason} />
      {error && <div className="mt-3 text-[12px] text-red-600">{error}</div>}

      {s && (
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard label="In stock" value={fmtNum(s.in_stock)} plane="A"
            base={{ prev: fmtNum(s.total_variants), label: 'of variants', changePct: null }}
            footnote={`snapshot ${s.date}`} />
          <KpiCard label="In-stock rate" value={fmtPct(s.in_stock_rate_pct)} plane="A"
            base={{ prev: '—', label: 'of catalogue', changePct: null }} n={s.total_variants} />
          <KpiCard label="Out of stock" value={fmtNum(s.out_of_stock)} plane="A"
            base={{ prev: fmtNum(s.low_stock), label: 'low stock (≤5)', changePct: null }} />
          <KpiCard label="On hand" value={fmtNum(s.total_on_hand)} plane="A"
            base={{ prev: fmtNum(s.total_reserved), label: 'reserved', changePct: null }} />
        </div>
      )}

      <div className="mt-4">
        <Section title="Out-of-stock variants per day">
          {d?.daily && <Spark data={d.daily.map((r: any) => r.out_of_stock)} height={48} color="#ef4444" />}
        </Section>
      </div>
    </div>
  );
}

'use client';
// SH104 — CI001 Customers: new vs repeat (Plane A). RFM/cohorts follow in CI-T22 depth.
import { useState } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import { Section, RangePicker, Spark, KpiCard } from '@/components/CockpitKit';
import { HeatmapChart } from '@/components/Charts';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Week × weekday intensity of new customers; the same HeatmapChart renders
// cohort retention (rows = cohorts, cols = M1..M12) once cohort facts land.
function weekHeatmap(daily: Array<{ date: string; new_customers: number }>) {
  const weeks = new Map<string, (number | null)[]>();
  for (const r of daily) {
    const d = new Date(r.date);
    const monday = new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * 86400000);
    const wk = monday.toISOString().slice(0, 10);
    if (!weeks.has(wk)) weeks.set(wk, Array(7).fill(null));
    weeks.get(wk)![(d.getUTCDay() + 6) % 7] = r.new_customers;
  }
  return [...weeks.entries()].map(([label, cells]) => ({ label, cells }));
}
import { useAnalytics, fmtNum, fmtPct, DegradedBanner, ForbiddenNote } from '@/components/ci/analytics';

export default function SH104Page() {
  const [range, setRange] = useState(30);
  const { data: d, forbidden, error } = useAnalytics('customers', range);

  if (forbidden) return <div className="p-6"><ScreenHeader title="Customers" /><ForbiddenNote /></div>;

  const t = d?.totals;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <ScreenHeader title="Customer Analytics" description="New vs repeat buyers from order truth (Plane A)" />
        <RangePicker value={range} onChange={setRange} />
      </div>
      <DegradedBanner degraded={d?.degraded} reason={d?.degraded_reason} />
      {error && <div className="mt-3 text-[12px] text-red-600">{error}</div>}

      {t && (
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard label="Customers" value={fmtNum(t.total_customers)} plane="A"
            base={{ prev: fmtNum(t.prev_total_customers), label: `vs prev ${range} d`, changePct: t.change_pct }} />
          <KpiCard label="New" value={fmtNum(t.new_customers)} plane="A"
            base={{ prev: '—', label: 'first order in period', changePct: null }} />
          <KpiCard label="Repeat" value={fmtNum(t.repeat_customers)} plane="A"
            base={{ prev: '—', label: 'ordered before period', changePct: null }} />
          <KpiCard label="Repeat rate" value={fmtPct(t.repeat_rate_pct)} plane="A"
            base={{ prev: '—', label: 'of period customers', changePct: null }} />
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section title="New vs repeat per day">
          {d?.daily && (
            <>
              <Spark data={d.daily.map((r: any) => r.new_customers)} height={48} />
              <Spark data={d.daily.map((r: any) => r.repeat_customers)} height={48} color="#10b981" />
            </>
          )}
        </Section>
        <Section title="New customers — week × weekday">
          {d?.daily && (
            <>
              <div className="mb-1 flex gap-1 pl-24">
                {DAY_LABELS.map(l => <div key={l} className="flex-1 text-center text-[9px] text-slate-400">{l}</div>)}
              </div>
              <HeatmapChart rows={weekHeatmap(d.daily)} />
            </>
          )}
        </Section>
      </div>
    </div>
  );
}

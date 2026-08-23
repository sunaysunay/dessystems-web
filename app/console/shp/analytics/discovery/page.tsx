'use client';
// SH108 — CI001 Discovery: search volume + zero-result demand.
import { useState } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import { Section, RangePicker, Spark, KpiCard } from '@/components/CockpitKit';
import { useAnalytics, fmtNum, fmtPct, DegradedBanner, ForbiddenNote } from '@/components/ci/analytics';

export default function SH108Page() {
  const [range, setRange] = useState(30);
  const { data: d, forbidden, error } = useAnalytics('discovery', range);

  if (forbidden) return <div className="p-6"><ScreenHeader title="Discovery" /><ForbiddenNote /></div>;

  const t = d?.totals;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <ScreenHeader title="Search & Discovery" description="On-site search volume and zero-result demand — what people want that we do not sell" />
        <RangePicker value={range} onChange={setRange} />
      </div>
      <DegradedBanner degraded={d?.degraded} reason={d?.degraded_reason} />
      {error && <div className="mt-3 text-[12px] text-red-600">{error}</div>}

      {t && (
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard label="Searches" value={fmtNum(t.searches)} plane="B"
            base={{ prev: fmtNum(t.prev_searches), label: `vs prev ${range} d`, changePct: t.change_pct }} />
          <KpiCard label="Unique searchers" value={fmtNum(t.unique_searchers)} plane="B"
            base={{ prev: '—', label: 'consented visitors', changePct: null }} />
          <KpiCard label="Zero-result searches" value={fmtNum(t.zero_result_searches)} plane="B"
            base={{ prev: '—', label: 'unmet demand', changePct: null }} />
          <KpiCard label="Zero-result rate" value={fmtPct(t.zero_result_rate_pct)} plane="B"
            base={{ prev: '—', label: 'of searches', changePct: null }} n={t.searches} />
        </div>
      )}

      <div className="mt-4">
        <Section title="Searches vs zero-result per day">
          {d?.daily && (
            <>
              <Spark data={d.daily.map((r: any) => r.searches)} height={48} />
              <Spark data={d.daily.map((r: any) => r.zero_result_searches)} height={48} color="#f59e0b" />
            </>
          )}
        </Section>
      </div>
    </div>
  );
}

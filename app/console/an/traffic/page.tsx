'use client';
// AN004 — Traffic & Acquisition Cockpit: sources with compare, UTM campaigns.
import { useState, useEffect, useCallback } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import { useScope } from '@/lib/scope-context';
import { Section, RangePicker, Spark, Bars, Kpi } from '@/components/CockpitKit';

export default function TrafficCockpit() {
  const { unit } = useScope();
  const [range, setRange] = useState(30);
  const [d, setD] = useState<any>(null);

  const load = useCallback(async () => {
    const j = await fetch(`/api/bop/an/cockpits?view=traffic&tenant_id=${unit.id}&range=${range}`).then(r => r.json());
    setD(j);
  }, [unit.id, range]);
  useEffect(() => { void load(); }, [load]);

  const delta = d?.totals?.prev_visitors
    ? Number((((d.totals.visitors - d.totals.prev_visitors) / d.totals.prev_visitors) * 100).toFixed(1)) : null;

  return (
    <div className="p-6">
      <ScreenHeader title="Traffic & Acquisition" description="Sources with period comparison, UTM campaign attribution, device mix" />
      <div className="mt-3 flex items-center gap-3">
        <RangePicker value={range} onChange={setRange} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Visitors" value={d?.totals?.visitors ?? 0} delta={delta} prev={d?.totals?.prev_visitors} />
        <div className="col-span-1 lg:col-span-3 rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Visitors trend</div>
          {d?.trend && <div className="mt-2"><Spark data={d.trend.map((t: any) => t.visitors ?? 0)} height={50} /></div>}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section title="Sources — current vs previous period">
          <Bars rows={(d?.sources ?? []).slice(0, 15).map((s: any) => ({
            label: s.source, value: s.value,
            extra: s.prev ? `${s.value >= s.prev ? '▲' : '▼'} vs ${s.prev}` : 'new',
          }))} />
        </Section>
        <div className="space-y-4">
          <Section title="UTM campaigns — sessions → conversions">
            {(d?.campaigns ?? []).length === 0 ? (
              <p className="text-[11px] text-slate-300">No UTM-tagged sessions in range. Tag campaign links with utm_source/utm_medium/utm_campaign.</p>
            ) : (
              <div className="space-y-1.5">
                {(d?.campaigns ?? []).slice(0, 12).map((c: any) => (
                  <div key={c.campaign} className="flex items-center justify-between text-[11px]">
                    <span className="truncate pr-2 text-slate-600" title={c.campaign}>{c.campaign}</span>
                    <span className="flex-none">
                      <b className="text-slate-700">{c.sessions}</b> sess ·
                      <b className={`ml-1 ${c.converted ? 'text-emerald-600' : 'text-slate-300'}`}>{c.converted}</b> conv
                      {c.sessions > 0 && <span className="ml-1 text-slate-400">({((c.converted / c.sessions) * 100).toFixed(0)}%)</span>}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Section>
          <Section title="Devices">
            {d?.devices && <Bars color="bg-cyan-400" rows={Object.entries(d.devices).map(([k, v]) => ({ label: k, value: Number(v) }))} />}
          </Section>
          <Section title="Browsers">
            {d?.browsers
              ? <Bars color="bg-violet-400" rows={Object.entries(d.browsers).sort((a: any, b: any) => Number(b[1]) - Number(a[1])).map(([k, v]) => ({ label: k, value: Number(v) }))} />
              : <p className="py-4 text-center text-[11px] text-slate-300">No browser data</p>}
          </Section>
        </div>
      </div>
    </div>
  );
}

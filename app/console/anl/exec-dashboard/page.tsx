'use client';
// AN001 — Executive Cockpit: the 60-second morning view.
import { useState, useEffect, useCallback } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import { useScope } from '@/lib/scope-context';
import { Kpi, Spark, Section, RangePicker } from '@/components/CockpitKit';

export default function ExecCockpit() {
  const { unit } = useScope();
  const [range, setRange] = useState(30);
  const [d, setD] = useState<any>(null);

  const load = useCallback(async () => {
    const j = await fetch(`/api/bop/an/cockpits?view=exec&tenant_id=${unit.id}&range=${range}`).then(r => r.json());
    setD(j);
  }, [unit.id, range]);
  useEffect(() => { void load(); }, [load]);

  return (
    <div className="p-6">
      <ScreenHeader title="Executive Cockpit" description="KPIs with period deltas, trend, alerts and top movers — snapshot-powered" />
      <div className="mt-3 flex items-center gap-3">
        <RangePicker value={range} onChange={setRange} />
        {d && <span className="text-[11px] text-slate-400">{d.days} snapshot days · vs previous {range}d</span>}
      </div>

      {d?.alerts?.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {d.alerts.map((a: any, i: number) => (
            <div key={i} className={`rounded-lg px-4 py-2.5 text-[12px] font-semibold ${a.level === 'red' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
              ⚠ {a.text}
            </div>
          ))}
        </div>
      )}

      {d?.kpis && (
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-6">
          <Kpi label="Visitors" {...d.kpis.visitors} />
          <Kpi label="Page views" {...d.kpis.page_views} />
          <Kpi label="Listing views" {...d.kpis.listing_views} />
          <Kpi label="Conversions" {...d.kpis.conversions} />
          <Kpi label="Leads" {...d.kpis.leads} />
          <Kpi label="Won (purchased)" {...d.kpis.won} />
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section title={`Trend — visitors / leads (${range}d)`}>
          {d?.trend && (
            <div className="space-y-3">
              <div><div className="text-[10px] text-slate-400 mb-1">Visitors</div><Spark data={d.trend.map((t: any) => t.visitors ?? 0)} color="#6366f1" /></div>
              <div><div className="text-[10px] text-slate-400 mb-1">Leads</div><Spark data={d.trend.map((t: any) => t.leads ?? 0)} color="#f59e0b" /></div>
              <div><div className="text-[10px] text-slate-400 mb-1">Conversions</div><Spark data={d.trend.map((t: any) => t.conversions ?? 0)} color="#10b981" /></div>
            </div>
          )}
        </Section>
        <Section title="Top movers — listing views (2nd half vs 1st half of range)">
          <div className="space-y-1.5">
            {(d?.movers ?? []).map((m: any) => (
              <div key={m.title} className="flex items-center justify-between text-[11px]">
                <span className="truncate pr-3 text-slate-600" title={m.title}>{m.title}</span>
                <span className={`font-bold ${m.delta > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {m.delta > 0 ? '▲' : '▼'} {Math.abs(m.delta)} <span className="font-normal text-slate-300">({m.before}→{m.after})</span>
                </span>
              </div>
            ))}
            {(d?.movers ?? []).length === 0 && <p className="text-[11px] text-slate-300">Not enough snapshot data yet — movers appear once snapshots cover the range.</p>}
          </div>
        </Section>
      </div>
    </div>
  );
}

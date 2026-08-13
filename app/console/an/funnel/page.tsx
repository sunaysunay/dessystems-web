'use client';
// AN002 — Conversion Funnel Cockpit: visit → view → engage → lead → won.
import { useState, useEffect, useCallback } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import { useScope } from '@/lib/scope-context';
import { Section, RangePicker, Spark, Bars } from '@/components/CockpitKit';

const STAGES: { key: string; label: string; color: string }[] = [
  { key: 'visits', label: 'Visits (sessions)', color: 'bg-indigo-500' },
  { key: 'listing_views', label: 'Listing views', color: 'bg-blue-500' },
  { key: 'engaged', label: 'Engaged (fav/share/save)', color: 'bg-cyan-500' },
  { key: 'leads', label: 'Leads (sell+crm+offers)', color: 'bg-amber-500' },
  { key: 'won', label: 'Won (purchased)', color: 'bg-emerald-500' },
];

export default function FunnelCockpit() {
  const { unit } = useScope();
  const [range, setRange] = useState(30);
  const [d, setD] = useState<any>(null);

  const load = useCallback(async () => {
    const j = await fetch(`/api/bop/an/cockpits?view=funnel&tenant_id=${unit.id}&range=${range}`).then(r => r.json());
    setD(j);
  }, [unit.id, range]);
  useEffect(() => { void load(); }, [load]);

  const max = d ? Math.max(d.stages?.visits ?? 1, 1) : 1;

  return (
    <div className="p-6">
      <ScreenHeader title="Conversion Funnel" description="Visit → listing view → engagement → lead → purchase, with drop-offs and period comparison" />
      <div className="mt-3"><RangePicker value={range} onChange={setRange} /></div>

      {d?.stages && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-6">
          <div className="space-y-3">
            {STAGES.map((s, i) => {
              const v = d.stages[s.key] ?? 0;
              const pv = d.prev_stages?.[s.key] ?? 0;
              const prevStage = i > 0 ? (d.stages[STAGES[i - 1].key] ?? 0) : null;
              const conv = prevStage ? ((v / Math.max(prevStage, 1)) * 100).toFixed(1) : null;
              const delta = pv ? Math.round(((v - pv) / pv) * 100) : null;
              return (
                <div key={s.key}>
                  <div className="mb-1 flex items-baseline justify-between text-[12px]">
                    <span className="font-semibold text-slate-700">{s.label}</span>
                    <span className="flex items-baseline gap-3">
                      {conv && <span className="text-[10px] text-slate-400">→ {conv}% of previous stage</span>}
                      {delta !== null && <span className={`text-[10px] font-bold ${delta >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{delta >= 0 ? '▲' : '▼'}{Math.abs(delta)}% vs prev period</span>}
                      <span className="text-[15px] font-bold text-slate-800">{v.toLocaleString('nl-NL')}</span>
                    </span>
                  </div>
                  <div className="h-6 rounded-lg bg-slate-100">
                    <div className={`flex h-full items-center rounded-lg px-2 ${s.color}`} style={{ width: `${Math.max((v / max) * 100, 2)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          {d.stages.visits > 0 && (
            <p className="mt-4 text-[12px] text-slate-500">
              Overall: <b className="text-slate-700">{((d.stages.leads / Math.max(d.stages.visits, 1)) * 100).toFixed(2)}%</b> visit→lead ·
              <b className="ml-1 text-slate-700">{((d.stages.won / Math.max(d.stages.leads, 1)) * 100).toFixed(1)}%</b> lead→won
            </p>
          )}
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-4">
        <Section title="Lead sources split">
          {d?.lead_split && <Bars color="bg-amber-400" rows={[
            { label: 'Sell leads (acquisition)', value: d.lead_split.sell_leads ?? 0 },
            { label: 'CRM leads', value: d.lead_split.crm_leads ?? 0 },
            { label: 'DM offers (buyers)', value: d.lead_split.dm_offers ?? 0 },
          ]} />}
        </Section>
        <Section title="Events by device">
          {d?.by_device && <Bars color="bg-blue-400" rows={Object.entries(d.by_device).map(([k, v]) => ({ label: k, value: Number(v) }))} />}
        </Section>
        <Section title="Sessions by browser">
          {d?.by_browser
            ? <Bars color="bg-violet-400" rows={Object.entries(d.by_browser).sort((a: any, b: any) => Number(b[1]) - Number(a[1])).map(([k, v]) => ({ label: k, value: Number(v) }))} />
            : <p className="py-4 text-center text-[11px] text-slate-300">No browser data</p>}
        </Section>
        <Section title="Leads trend">
          {d?.trend && <Spark data={d.trend.map((t: any) => t.leads ?? 0)} color="#f59e0b" height={90} />}
        </Section>
      </div>
    </div>
  );
}

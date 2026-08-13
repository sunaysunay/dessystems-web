'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useScope } from '@/lib/scope-context';
import { ScreenHeader } from '@/components/ScreenBadge';
import { ENTITY_LABEL, ENTITY_COLOR, HEALTH_COLOR, HEALTH_LABEL } from '../ops-goal-ui';

const STATUS_BADGE: Record<string, { bg: string; label: string }> = {
  achieved: { bg: 'bg-emerald-100 text-emerald-700', label: 'Achieved' },
  semi_achieved: { bg: 'bg-amber-100 text-amber-700', label: 'Semi-Achieved' },
  closed: { bg: 'bg-slate-200 text-slate-600', label: 'Closed' },
  cancelled: { bg: 'bg-red-100 text-red-600', label: 'Cancelled' },
};

function periodLabel(g: any): string {
  const s = g.period_start?.slice(0, 7) ?? '';
  const e = g.period_end?.slice(0, 7) ?? '';
  if (s && e) return `${s} → ${e}`;
  if (g.period_type) return g.period_type;
  return 'No period';
}

export default function HistoricalLedgerPage() {
  const { unit } = useScope();
  const router = useRouter();
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ view: 'historical-ledger', tenant_id: String(unit.id) });
    if (entityFilter) params.set('entity', entityFilter);
    fetch(`/api/bop/ops/goals?${params}`).then(r => r.json()).then(j => {
      setGoals(j.goals ?? []);
      setLoading(false);
    });
  }, [unit.id, entityFilter]);

  const grouped = goals.reduce<Record<string, any[]>>((acc, g) => {
    const key = periodLabel(g);
    (acc[key] ??= []).push(g);
    return acc;
  }, {});

  const periods = Object.keys(grouped).sort().reverse();
  const totalAchieved = goals.filter(g => g.status === 'achieved').length;
  const avgProgress = goals.length > 0 ? Math.round(goals.reduce((s, g) => s + Number(g.progress_pct ?? 0), 0) / goals.length) : 0;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <ScreenHeader title="Historical Ledger" description="OP002 — Closed goals by period" />
        <button onClick={() => router.push('/console/ops/goals')}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 shadow-sm">
          Back to Goals
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
          <div className="text-2xl font-bold text-slate-800 tabular-nums">{goals.length}</div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">Total Closed</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
          <div className="text-2xl font-bold text-emerald-600 tabular-nums">{totalAchieved}</div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">Achieved</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
          <div className="text-2xl font-bold text-slate-800 tabular-nums">{avgProgress}%</div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">Avg Progress</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
          <div className="text-2xl font-bold text-slate-800 tabular-nums">{periods.length}</div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">Periods</div>
        </div>
      </div>

      {/* Entity filter */}
      <div className="flex gap-2">
        <button onClick={() => setEntityFilter('')}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${!entityFilter ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'}`}>All</button>
        {Object.entries(ENTITY_LABEL).map(([k, v]) => (
          <button key={k} onClick={() => setEntityFilter(k)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${entityFilter === k ? 'bg-slate-800 text-white' : `${(ENTITY_COLOR as Record<string,string>)[k]} bg-opacity-10`}`}>{v as string}</button>
        ))}
      </div>

      {loading && <div className="text-sm text-slate-400">Loading...</div>}

      {/* Period groups */}
      {periods.map(period => (
        <div key={period} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between bg-slate-50 px-4 py-2 border-b border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">{period}</h3>
            <span className="text-[10px] text-slate-400">{grouped[period].length} goal{grouped[period].length !== 1 ? 's' : ''}</span>
          </div>
          <div className="divide-y divide-slate-50">
            {grouped[period].map((g: any) => {
              const badge = STATUS_BADGE[g.status] ?? STATUS_BADGE.closed;
              const krs = g.key_results ?? [];
              return (
                <div key={g.id} className="px-4 py-3 hover:bg-slate-50 cursor-pointer" onClick={() => router.push(`/console/ops/goals/${g.id}`)}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono text-slate-400">{g.goal_number}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${badge.bg}`}>{badge.label}</span>
                    {g.entity && <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${(ENTITY_COLOR as Record<string,string>)[g.entity]}`}>{(ENTITY_LABEL as Record<string,string>)[g.entity]}</span>}
                    {g.health && <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${(HEALTH_COLOR as Record<string,string>)[g.health]}`}>{(HEALTH_LABEL as Record<string,string>)[g.health]}</span>}
                  </div>
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-800">{g.title}</h4>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <div className="h-1.5 w-16 rounded-full bg-slate-100">
                          <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${Math.min(100, Number(g.progress_pct ?? 0))}%` }} />
                        </div>
                        <span className="text-xs font-bold tabular-nums text-slate-600">{Math.round(Number(g.progress_pct ?? 0))}%</span>
                      </div>
                      {g.budget > 0 && <span className="text-[10px] text-slate-400 tabular-nums">{Number(g.budget).toLocaleString('nl-NL', { style: 'currency', currency: 'EUR' })}</span>}
                    </div>
                  </div>
                  {krs.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {krs.map((kr: any) => {
                        const pct = Math.round(Number(kr.progress_pct ?? 0));
                        const met = pct >= 100;
                        return (
                          <span key={kr.id} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold ${met ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-500'}`}>
                            {met ? '✓' : `${pct}%`} {kr.title}
                          </span>
                        );
                      })}
                    </div>
                  )}
                  {g.closing_note && <p className="mt-1 text-[11px] text-slate-400 italic">{g.closing_note}</p>}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {!loading && goals.length === 0 && (
        <div className="text-center py-12 text-sm text-slate-400">No closed goals found. Active goals will appear here once they are closed out.</div>
      )}
    </div>
  );
}

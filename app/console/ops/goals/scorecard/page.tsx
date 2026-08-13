'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useScope } from '@/lib/scope-context';
import { ScreenHeader } from '@/components/ScreenBadge';
import { Spark, Kpi } from '@/components/CockpitKit';
import { ENTITY_LABEL, ENTITY_COLOR, HEALTH_COLOR, HEALTH_LABEL } from '../ops-goal-ui';
import type { EntityScope, GoalHealth } from '@/lib/op-goals-types';

const ENTITIES: EntityScope[] = ['des_mobil', 'des_campers', 'des_shop', 'des_systems', 'des_group'];

interface ScorecardData {
  entity: string;
  active_goals: number;
  closed_goals: number;
  avg_progress: number;
  health: { on_track: number; at_risk: number; off_track: number };
  goals: Record<string, unknown>[];
  key_results: { id: string; title: string; progress_pct: number; current_value: number; target: number; unit_label: string }[];
  snapshots: { kr_id: string; progress_pct: number }[];
  ledger: { goal_title: string; final_progress_pct: number; final_status: string; period_start: string; period_end: string }[];
  budget: { budget: number; actual_ap: number; net_spend: number; variance: number; variance_pct: number } | null;
}

function RadarChart({ dimensions }: { dimensions: { label: string; value: number }[] }) {
  const cx = 120, cy = 120, r = 90;
  const n = dimensions.length;
  if (n < 3) return null;
  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;

  const gridLevels = [0.25, 0.5, 0.75, 1];
  const points = dimensions.map((d, i) => {
    const a = angle(i);
    const v = Math.min(1, d.value / 100);
    return { x: cx + Math.cos(a) * r * v, y: cy + Math.sin(a) * r * v };
  });
  const poly = points.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <svg viewBox="0 0 240 240" className="w-full max-w-[280px] mx-auto">
      {gridLevels.map(l => (
        <polygon key={l} fill="none" stroke="#e2e8f0" strokeWidth={0.5}
          points={Array.from({ length: n }, (_, i) => {
            const a = angle(i);
            return `${cx + Math.cos(a) * r * l},${cy + Math.sin(a) * r * l}`;
          }).join(' ')} />
      ))}
      {dimensions.map((d, i) => {
        const a = angle(i);
        const lx = cx + Math.cos(a) * (r + 16);
        const ly = cy + Math.sin(a) * (r + 16);
        return (
          <g key={i}>
            <line x1={cx} y1={cy} x2={cx + Math.cos(a) * r} y2={cy + Math.sin(a) * r} stroke="#e2e8f0" strokeWidth={0.5} />
            <text x={lx} y={ly} textAnchor="middle" dominantBaseline="central" className="text-[8px] fill-slate-500 font-medium">{d.label}</text>
          </g>
        );
      })}
      <polygon points={poly} fill="rgba(99, 102, 241, 0.15)" stroke="#6366f1" strokeWidth={1.5} />
      {points.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={3} fill="#6366f1" />)}
    </svg>
  );
}

function HealthDonut({ health }: { health: ScorecardData['health'] }) {
  const total = health.on_track + health.at_risk + health.off_track;
  if (!total) return null;
  const segments = [
    { key: 'on_track', count: health.on_track, color: '#10b981' },
    { key: 'at_risk', count: health.at_risk, color: '#f59e0b' },
    { key: 'off_track', count: health.off_track, color: '#ef4444' },
  ];
  const r = 40, cx = 50, cy = 50, circ = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 100 100" className="w-24 h-24">
        {segments.map(s => {
          const len = (s.count / total) * circ;
          const el = <circle key={s.key} cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth={10}
            strokeDasharray={`${len} ${circ - len}`} strokeDashoffset={-offset}
            transform={`rotate(-90 ${cx} ${cy})`} />;
          offset += len;
          return el;
        })}
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" className="text-lg font-bold fill-slate-700">{total}</text>
      </svg>
      <div className="space-y-1">
        {segments.filter(s => s.count > 0).map(s => (
          <div key={s.key} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-slate-600">{s.key.replace(/_/g, ' ')}: {s.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ScorecardPage() {
  const { unit } = useScope();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [entity, setEntity] = useState<EntityScope>((searchParams.get('entity') ?? ENTITIES[0]) as EntityScope);
  const [data, setData] = useState<ScorecardData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/bop/ops/goals?view=scorecard&tenant_id=${unit.id}&entity=${entity}`).then(r => r.json());
    setData(res.scorecard ?? null);
    setLoading(false);
  }, [unit.id, entity]);

  useEffect(() => { void load(); }, [load]);

  const snapsByKr: Record<string, number[]> = {};
  if (data) {
    for (const s of data.snapshots) { (snapsByKr[s.kr_id] ??= []).push(s.progress_pct); }
    for (const k of Object.keys(snapsByKr)) { snapsByKr[k] = snapsByKr[k].reverse(); }
  }

  const radarDims = data ? data.key_results.slice(0, 8).map(kr => ({
    label: kr.title.length > 14 ? kr.title.slice(0, 12) + '…' : kr.title,
    value: Number(kr.progress_pct ?? 0),
  })) : [];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <ScreenHeader title="Entity Scorecard" description="OP015 — Per-entity strategy performance" />
        <div className="flex items-center gap-2">
          <button onClick={() => router.push('/console/ops/goals/dashboard')}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">Dashboard</button>
          <button onClick={() => void load()}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">Refresh</button>
        </div>
      </div>

      <div className="flex gap-2">
        {ENTITIES.map(e => (
          <button key={e} onClick={() => setEntity(e)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              entity === e
                ? `${ENTITY_COLOR[e] ?? 'bg-slate-800 text-white'}`
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}>
            {ENTITY_LABEL[e] ?? e}
          </button>
        ))}
      </div>

      {loading && <div className="flex h-40 items-center justify-center text-sm text-slate-400">Loading scorecard...</div>}

      {!loading && data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Kpi label="Active Goals" value={data.active_goals} />
            <Kpi label="Avg Progress" value={`${data.avg_progress}%`} />
            <Kpi label="Closed Goals" value={data.closed_goals} />
            {data.budget && <Kpi label="Budget Variance" value={`€${Math.abs(data.budget.variance).toLocaleString('nl-NL')}`}
              delta={data.budget.variance_pct} />}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">KR Radar</div>
              {radarDims.length >= 3 ? <RadarChart dimensions={radarDims} /> : (
                <p className="text-sm text-slate-400 text-center py-8">Need at least 3 KRs for radar chart</p>
              )}
            </div>

            <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Goal Health</div>
              <HealthDonut health={data.health} />
              <div className="mt-4 space-y-2">
                {data.goals.map((g: Record<string, unknown>) => (
                  <button key={g.id as string} onClick={() => router.push(`/console/ops/goals/${g.id}`)}
                    className="flex w-full items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-left hover:bg-slate-100">
                    <div className={`h-2 w-2 rounded-full ${HEALTH_COLOR[g.health as GoalHealth] ?? 'bg-slate-300'}`} />
                    <span className="flex-1 text-xs font-medium text-slate-700 truncate">{g.title as string}</span>
                    <span className="text-xs font-bold text-slate-500 tabular-nums">{Math.round(Number(g.progress_pct))}%</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {data.key_results.length > 0 && (
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">Key Results</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {data.key_results.map(kr => (
                  <div key={kr.id} className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                    <div className="text-xs font-medium text-slate-700 truncate mb-2">{kr.title}</div>
                    {snapsByKr[kr.id]?.length > 1 && (
                      <Spark data={snapsByKr[kr.id]} height={32} color={Number(kr.progress_pct) >= 60 ? '#10b981' : '#6366f1'} />
                    )}
                    <div className="flex justify-between mt-2 text-[10px] text-slate-400">
                      <span>{kr.current_value} / {kr.target} {kr.unit_label}</span>
                      <span className="font-bold tabular-nums">{Math.round(Number(kr.progress_pct))}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.ledger.length > 0 && (
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">Period History</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-[10px] uppercase tracking-wider text-slate-400">
                      <th className="py-2 pr-4">Goal</th>
                      <th className="py-2 pr-4">Period</th>
                      <th className="py-2 pr-4">Progress</th>
                      <th className="py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.ledger.map((l, i) => (
                      <tr key={i} className="border-b border-slate-50">
                        <td className="py-2 pr-4 font-medium text-slate-700">{l.goal_title}</td>
                        <td className="py-2 pr-4 text-slate-500 tabular-nums">{l.period_start} → {l.period_end}</td>
                        <td className="py-2 pr-4 font-bold tabular-nums">{Math.round(l.final_progress_pct)}%</td>
                        <td className="py-2">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            l.final_status === 'achieved' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                          }`}>{l.final_status.replace(/_/g, ' ')}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {!loading && !data && (
        <div className="flex h-40 items-center justify-center text-sm text-slate-400">No data for this entity.</div>
      )}
    </div>
  );
}

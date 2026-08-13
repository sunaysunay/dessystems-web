'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useScope } from '@/lib/scope-context';
import { Spark } from '@/components/CockpitKit';
import {
  HEALTH_COLOR, HEALTH_LABEL, ENTITY_LABEL, ENTITY_COLOR,
  type OpGoal, type OpKeyResult,
} from '../ops-goal-ui';
import type { EntityScope } from '@/lib/op-goals-types';

interface Snapshot { kr_id: string; snapshot_date: string; value: number; progress_pct: number }

interface ForecastEntry {
  kr_id: string; kr_title: string; current_value: number; target: number;
  projected_value: number; projected_pct: number; trend: string;
  days_remaining: number; slope_per_day: number;
}

interface LedgerEntry {
  id: string; goal_id: string; goal_title: string; goal_number: string;
  entity: string; period_type: string; period_start: string; period_end: string;
  final_status: string; final_health: string; final_progress_pct: number;
  budget: number | null; budget_actual: number | null;
  kr_snapshot: { kr_number: string; title: string; progress_pct: number; current_value: number; target: number; unit_label: string }[];
  closed_at: string; notes: string | null; checkin_count: number;
}

function ProgressRing({ pct, size = 64, stroke = 6 }: { pct: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(100, Math.max(0, pct)) / 100) * circ;
  const color = pct >= 75 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#ef4444';
  return (
    <svg width={size} height={size} className="block">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} className="transition-all duration-700" />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
        className="text-sm font-bold fill-slate-700">{Math.round(pct)}%</text>
    </svg>
  );
}

function AtRiskPanel({ goals, router }: { goals: OpGoal[]; router: ReturnType<typeof useRouter> }) {
  const atRisk = goals.filter(g => g.health === 'at_risk' || g.health === 'off_track');
  if (!atRisk.length) return null;
  return (
    <div className="rounded-xl border border-red-100 bg-red-50/50 p-4">
      <div className="text-xs font-bold uppercase tracking-wider text-red-600 mb-3">Attention Required</div>
      <div className="space-y-2">
        {atRisk.map(g => (
          <button key={g.id} onClick={() => router.push(`/console/ops/goals/${g.id}`)}
            className="flex w-full items-center gap-3 rounded-lg bg-white px-3 py-2 text-left shadow-sm hover:bg-slate-50">
            <div className={`h-2.5 w-2.5 rounded-full ${HEALTH_COLOR[g.health]}`} />
            <span className="font-mono text-[10px] text-slate-400">{g.goal_number}</span>
            <span className="flex-1 text-sm font-medium text-slate-800 truncate">{g.title}</span>
            <span className="text-xs font-bold text-slate-500 tabular-nums">{Math.round(Number(g.progress_pct))}%</span>
            <span className="text-[10px] font-bold text-red-500">{HEALTH_LABEL[g.health]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function EntityLane({ entity, goals, router }: { entity: string; goals: OpGoal[]; router: ReturnType<typeof useRouter> }) {
  const ent = entity as EntityScope;
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <button onClick={() => router.push(`/console/ops/goals/scorecard?entity=${entity}`)}
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold hover:opacity-80 ${ENTITY_COLOR[ent] ?? 'bg-slate-100 text-slate-500'}`}>
          {ENTITY_LABEL[ent] ?? entity}
        </button>
        <span className="text-xs text-slate-400">{goals.length} goal{goals.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="space-y-2">
        {goals.map(g => (
          <button key={g.id} onClick={() => router.push(`/console/ops/goals/${g.id}`)}
            className="flex w-full items-center gap-3 rounded-lg bg-slate-50 px-3 py-2 text-left hover:bg-slate-100">
            <div className={`h-2 w-2 rounded-full ${HEALTH_COLOR[g.health] ?? 'bg-slate-300'}`} />
            <span className="flex-1 text-sm font-medium text-slate-700 truncate">{g.title}</span>
            <ProgressRing pct={Number(g.progress_pct)} size={36} stroke={4} />
          </button>
        ))}
      </div>
    </div>
  );
}

function VisionBanner({ vision, goals, onSaved }: { vision: string; goals: OpGoal[]; onSaved: () => void }) {
  const [text, setText] = useState(vision);
  const [editing, setEditing] = useState(false);

  async function save() {
    const topGoal = goals.find(g => g.level === 0);
    if (!topGoal) return;
    await fetch('/api/bop/ops/goals', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: topGoal.id, vision_text: text }),
    });
    setEditing(false);
    onSaved();
  }

  if (!vision && !editing) return null;
  return (
    <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
      <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 mb-1">Vision</div>
      {editing ? (
        <div className="flex gap-2">
          <input value={text} onChange={e => setText(e.target.value)}
            className="flex-1 rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:outline-none" />
          <button onClick={() => void save()} className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-bold text-white">Save</button>
          <button onClick={() => setEditing(false)} className="text-xs text-slate-500">Cancel</button>
        </div>
      ) : (
        <button onClick={() => { setText(vision); setEditing(true); }} className="text-sm italic text-indigo-700 hover:underline text-left">
          {vision || 'Click to set vision...'}
        </button>
      )}
    </div>
  );
}

function KpiStrip({ active, avgProgress, onTrack, autoKrCount }: { active: OpGoal[]; avgProgress: number; onTrack: number; autoKrCount: number }) {
  const cards = [
    { label: 'Active Goals', value: active.length, color: 'text-blue-700 bg-blue-50' },
    { label: 'Avg Progress', value: `${avgProgress}%`, color: 'text-slate-700 bg-slate-50' },
    { label: 'On Track', value: onTrack, color: 'text-emerald-700 bg-emerald-50' },
    { label: 'At Risk', value: active.filter(g => g.health === 'at_risk' || g.health === 'off_track').length, color: 'text-red-700 bg-red-50' },
    { label: 'Auto KRs', value: autoKrCount, color: 'text-indigo-700 bg-indigo-50' },
  ];
  return (
    <div className="grid grid-cols-5 gap-3">
      {cards.map(c => (
        <div key={c.label} className={`rounded-xl border border-slate-100 p-3 ${c.color}`}>
          <div className="text-lg font-bold tabular-nums">{c.value}</div>
          <div className="text-[10px] font-medium uppercase tracking-wider opacity-70">{c.label}</div>
        </div>
      ))}
    </div>
  );
}

function CloseOutModal({ goals, onClose, onDone }: { goals: OpGoal[]; onClose: () => void; onDone: () => void }) {
  const closeable = goals.filter(g => g.level === 0 && g.status === 'active');
  const [selectedId, setSelectedId] = useState(closeable[0]?.id ?? '');
  const [achieved, setAchieved] = useState(true);
  const [cloneNext, setCloneNext] = useState(true);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!selectedId) return;
    setSaving(true);
    await fetch('/api/bop/ops/goals', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'close_out', goal_id: selectedId, achieved, clone_next_period: cloneNext, notes: notes || null }),
    });
    setSaving(false);
    onDone();
  }

  if (!closeable.length) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="rounded-xl bg-white p-6 shadow-xl max-w-md" onClick={e => e.stopPropagation()}>
        <p className="text-sm text-slate-600">No active top-level goals to close out.</p>
        <button onClick={onClose} className="mt-4 rounded-lg bg-slate-800 px-4 py-2 text-xs font-bold text-white">Close</button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="rounded-xl bg-white p-6 shadow-xl w-full max-w-lg space-y-4" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-slate-900">Period Close-Out</h2>
        <p className="text-xs text-slate-500">Snapshot KRs to the historical ledger and close the goal period.</p>

        <label className="block">
          <span className="text-xs font-medium text-slate-600">Goal</span>
          <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
            {closeable.map(g => <option key={g.id} value={g.id}>{g.goal_number} — {g.title} ({Math.round(Number(g.progress_pct))}%)</option>)}
          </select>
        </label>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="radio" checked={achieved} onChange={() => setAchieved(true)} /> Achieved
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="radio" checked={!achieved} onChange={() => setAchieved(false)} /> Semi-achieved
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={cloneNext} onChange={e => setCloneNext(e.target.checked)} />
          Clone goal to next period (carry forward KRs)
        </label>

        <label className="block">
          <span className="text-xs font-medium text-slate-600">Close-out notes</span>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
            className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700" placeholder="Summary of outcomes..." />
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600">Cancel</button>
          <button onClick={() => void submit()} disabled={saving}
            className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
            {saving ? 'Closing...' : 'Close Period'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PeriodHistory({ ledger }: { ledger: LedgerEntry[] }) {
  if (!ledger.length) return null;
  const statusColor: Record<string, string> = { achieved: 'text-emerald-600 bg-emerald-50', semi_achieved: 'text-amber-600 bg-amber-50' };
  return (
    <div>
      <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">Period History</h2>
      <div className="space-y-3">
        {ledger.map(l => (
          <div key={l.id} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-slate-400">{l.goal_number}</span>
                <span className="text-sm font-medium text-slate-800">{l.goal_title}</span>
                {l.entity && <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${ENTITY_COLOR[l.entity as EntityScope] ?? 'bg-slate-100 text-slate-500'}`}>
                  {ENTITY_LABEL[l.entity as EntityScope] ?? l.entity}
                </span>}
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusColor[l.final_status] ?? 'bg-slate-100 text-slate-500'}`}>
                {l.final_status.replace(/_/g, ' ')}
              </span>
            </div>
            <div className="flex items-center gap-4 text-[10px] text-slate-400 mb-2">
              <span>{l.period_start} → {l.period_end}</span>
              <span>{Math.round(l.final_progress_pct)}% progress</span>
              <span>{l.checkin_count} check-ins</span>
              {l.budget != null && <span>Budget: €{Number(l.budget).toLocaleString('nl-NL')}</span>}
              <span>Closed {new Date(l.closed_at).toLocaleDateString('nl-NL')}</span>
            </div>
            {l.kr_snapshot.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {l.kr_snapshot.map((kr, i) => (
                  <div key={i} className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-2 py-1">
                    <span className="font-mono text-[9px] text-slate-400">{kr.kr_number}</span>
                    <span className="text-[10px] text-slate-600 truncate max-w-[120px]">{kr.title}</span>
                    <span className="text-[10px] font-bold text-slate-700 tabular-nums">{Math.round(kr.progress_pct)}%</span>
                  </div>
                ))}
              </div>
            )}
            {l.notes && <div className="mt-2 text-xs text-slate-500 italic">{l.notes}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function ForecastPanel({ forecasts }: { forecasts: ForecastEntry[] }) {
  if (!forecasts.length) return null;
  const trendIcon: Record<string, string> = { ahead: '🟢', on_pace: '🟡', behind: '🔴' };
  const trendLabel: Record<string, string> = { ahead: 'Ahead', on_pace: 'On Pace', behind: 'Behind' };
  return (
    <div>
      <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">Forecast Projections</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {forecasts.map(f => (
          <div key={f.kr_id} className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
            <div className="text-xs font-medium text-slate-700 truncate mb-2">{f.kr_title}</div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-slate-400">{f.days_remaining}d remaining</span>
              <span className="text-[10px] font-bold">{trendIcon[f.trend]} {trendLabel[f.trend]}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-[9px] uppercase text-slate-400">Current</div>
                <div className="text-xs font-bold text-slate-700 tabular-nums">{f.current_value}</div>
              </div>
              <div>
                <div className="text-[9px] uppercase text-slate-400">Projected</div>
                <div className={`text-xs font-bold tabular-nums ${f.trend === 'behind' ? 'text-red-600' : 'text-emerald-600'}`}>{f.projected_value}</div>
              </div>
              <div>
                <div className="text-[9px] uppercase text-slate-400">Target</div>
                <div className="text-xs font-bold text-slate-700 tabular-nums">{f.target}</div>
              </div>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div className={`h-full rounded-full ${f.trend === 'behind' ? 'bg-red-400' : 'bg-emerald-400'}`}
                style={{ width: `${Math.min(100, f.projected_pct)}%` }} />
            </div>
            <div className="text-[9px] text-slate-400 text-right mt-0.5 tabular-nums">
              {Math.round(f.projected_pct)}% projected · {f.slope_per_day > 0 ? '+' : ''}{f.slope_per_day}/day
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrendCharts({ krs, snapsByKr }: { krs: OpKeyResult[]; snapsByKr: Record<string, number[]> }) {
  const trending = krs.filter(kr => snapsByKr[kr.id]?.length > 1).slice(0, 9);
  if (!trending.length) return null;
  return (
    <div>
      <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">KR Trends</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {trending.map(kr => (
          <div key={kr.id} className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
            <div className="text-xs font-medium text-slate-700 truncate mb-2">{kr.title}</div>
            <Spark data={[...snapsByKr[kr.id]].reverse()} height={40} color={kr.progress_pct >= 60 ? '#10b981' : '#6366f1'} />
            <div className="text-[10px] text-slate-400 mt-1 tabular-nums">{Math.round(Number(kr.progress_pct))}% of target</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ExecDashboardPage() {
  const { unit } = useScope();
  const router = useRouter();
  const [goals, setGoals] = useState<OpGoal[]>([]);
  const [krs, setKrs] = useState<OpKeyResult[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [autoKrCount, setAutoKrCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [vision, setVision] = useState('');
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [forecasts, setForecasts] = useState<ForecastEntry[]>([]);
  const [showCloseOut, setShowCloseOut] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [res, ledgerRes, forecastRes] = await Promise.all([
      fetch(`/api/bop/ops/goals?view=exec-summary&tenant_id=${unit.id}`).then(r => r.json()),
      fetch(`/api/bop/ops/goals?view=ledger-history&tenant_id=${unit.id}`).then(r => r.json()),
      fetch(`/api/bop/ops/goals?view=forecast&tenant_id=${unit.id}`).then(r => r.json()),
    ]);
    setGoals(res.goals ?? []);
    setKrs(res.key_results ?? []);
    setSnapshots(res.snapshots ?? []);
    setAutoKrCount(res.auto_kr_count ?? 0);
    setLedger(ledgerRes.ledger ?? []);
    setForecasts(forecastRes.forecasts ?? []);
    const topGoal = (res.goals ?? []).find((g: OpGoal) => g.level === 0);
    setVision(topGoal?.vision_text ?? '');
    setLoading(false);
  }, [unit.id]);

  useEffect(() => { void load(); }, [load]);

  if (loading) return <div className="flex h-64 items-center justify-center text-sm text-slate-400">Loading dashboard...</div>;

  const topLevel = goals.filter(g => g.level === 0);
  const active = topLevel.filter(g => g.status === 'active');
  const avgProgress = active.length > 0 ? Math.round(active.reduce((s, g) => s + Number(g.progress_pct), 0) / active.length) : 0;
  const onTrack = active.filter(g => g.health === 'on_track').length;

  const byEntity: Record<string, OpGoal[]> = {};
  for (const g of active) { const e = g.entity ?? 'des_group'; (byEntity[e] ??= []).push(g); }

  const snapsByKr: Record<string, number[]> = {};
  for (const s of snapshots) { (snapsByKr[s.kr_id] ??= []).push(s.progress_pct); }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Executive Dashboard</h1>
          <p className="text-sm text-slate-500">Strategy progress at a glance</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowCloseOut(true)}
            className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100">Close Period</button>
          <button onClick={() => router.push('/console/ops/goals/scorecard')}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">Scorecards</button>
          <button onClick={() => router.push('/console/ops/goals')}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">Goal Tree</button>
          <button onClick={() => void load()}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">Refresh</button>
        </div>
      </div>

      <VisionBanner vision={vision} goals={goals} onSaved={() => void load()} />
      <KpiStrip active={active} avgProgress={avgProgress} onTrack={onTrack} autoKrCount={autoKrCount} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {active.map(g => (
          <button key={g.id} onClick={() => router.push(`/console/ops/goals/${g.id}`)}
            className="flex flex-col items-center gap-2 rounded-xl border border-slate-100 bg-white p-4 shadow-sm hover:bg-slate-50">
            <ProgressRing pct={Number(g.progress_pct)} />
            <span className="text-xs font-medium text-slate-700 text-center truncate w-full">{g.title}</span>
            <span className="text-[10px] text-slate-400">{HEALTH_LABEL[g.health] ?? g.health}</span>
          </button>
        ))}
      </div>

      <AtRiskPanel goals={active} router={router} />

      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">By Entity</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(byEntity).map(([entity, eGoals]) => (
            <EntityLane key={entity} entity={entity} goals={eGoals} router={router} />
          ))}
        </div>
      </div>

      <TrendCharts krs={krs} snapsByKr={snapsByKr} />

      <ForecastPanel forecasts={forecasts} />

      <PeriodHistory ledger={ledger} />

      {showCloseOut && (
        <CloseOutModal goals={goals} onClose={() => setShowCloseOut(false)} onDone={() => { setShowCloseOut(false); void load(); }} />
      )}
    </div>
  );
}

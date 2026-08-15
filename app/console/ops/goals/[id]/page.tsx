'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ScreenHeader } from '@/components/ScreenBadge';
import { useScope } from '@/lib/scope-context';
import { Spark } from '@/components/CockpitKit';
import {
  METRIC_TYPE_LABEL,
  type OpGoal, type OpKeyResult, type OpCheckin,
} from '../ops-goal-ui';
import { GoalHeader, ChildrenList, LinkedTasksList } from './detail-sections';
import GoalFormModal from '../goal-form-modal';
import CycleReviewWizard from './cycle-review-wizard';
import CycleHistory from './cycle-history';
import CloseOutModal from './close-out-modal';
import GoalEditModal from './goal-edit-modal';

interface Snapshot { kr_id: string; snapshot_date: string; value: number; progress_pct: number }
interface LinkedTask { id: string; task_number: string; title: string; status: string; goal_kr_id: string }

type Tab = 'overview' | 'checkins' | 'cycles' | 'budget' | 'work';

const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'checkins', label: 'Check-ins' },
  { key: 'cycles', label: 'Cycles' },
  { key: 'budget', label: 'Budget' },
  { key: 'work', label: 'Linked Work' },
];

function ProgressBar({ pct, size = 'md' }: { pct: number; size?: 'sm' | 'md' }) {
  const w = Math.max(0, Math.min(100, pct));
  const color = w >= 75 ? 'bg-emerald-500' : w >= 40 ? 'bg-amber-400' : 'bg-red-400';
  const h = size === 'sm' ? 'h-1.5' : 'h-2';
  return (
    <div className="flex items-center gap-2">
      <div className={`${h} flex-1 rounded-full bg-slate-100 overflow-hidden`}>
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${w}%` }} />
      </div>
      <span className="text-xs font-bold text-slate-500 tabular-nums">{Math.round(w)}%</span>
    </div>
  );
}

function PaceArrow({ delta }: { delta: number }) {
  if (delta >= -5) return <span className="text-emerald-500 text-xs font-bold" title={`Pace: ${delta > 0 ? '+' : ''}${delta.toFixed(1)}`}>&#9650;</span>;
  if (delta >= -20) return <span className="text-amber-500 text-xs font-bold" title={`Pace: ${delta.toFixed(1)}`}>&#9654;</span>;
  return <span className="text-red-500 text-xs font-bold" title={`Pace: ${delta.toFixed(1)}`}>&#9660;</span>;
}

function ExpectedProgressMarker({ goal }: { goal: OpGoal }) {
  if (!goal.period_start || !goal.period_end) return null;
  const now = Date.now();
  const ps = new Date(goal.period_start).getTime();
  const pe = new Date(goal.period_end).getTime();
  if (pe <= ps) return null;
  const elapsed = Math.max(0, Math.min(100, ((now - ps) / (pe - ps)) * 100));
  return (
    <div className="rounded-lg bg-slate-50 border border-slate-100 px-4 py-3 flex items-center gap-4">
      <div className="flex-1">
        <div className="text-[10px] font-medium uppercase text-slate-400 mb-1">Time Elapsed</div>
        <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
          <div className="h-full rounded-full bg-slate-400 transition-all" style={{ width: `${elapsed}%` }} />
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm font-bold text-slate-600 tabular-nums">{Math.round(elapsed)}%</div>
        <div className="text-[10px] text-slate-400">of period</div>
      </div>
      <div className="border-l border-slate-200 pl-4 text-right">
        <div className="text-sm font-bold text-slate-600 tabular-nums">{Math.round(Number(goal.progress_pct))}%</div>
        <div className="text-[10px] text-slate-400">progress</div>
      </div>
      <div className="border-l border-slate-200 pl-4 text-right">
        <div className={`text-sm font-bold tabular-nums ${
          Number(goal.progress_pct) >= elapsed - 5 ? 'text-emerald-600' :
          Number(goal.progress_pct) >= elapsed - 20 ? 'text-amber-600' : 'text-red-600'
        }`}>
          {(Number(goal.progress_pct) - elapsed) > 0 ? '+' : ''}{Math.round(Number(goal.progress_pct) - elapsed)}%
        </div>
        <div className="text-[10px] text-slate-400">pace</div>
      </div>
    </div>
  );
}

function KrCard({ kr, snaps, expectedPct, onUpdateValue, onCompute }: {
  kr: OpKeyResult; snaps: number[]; expectedPct: number;
  onUpdateValue: (krId: string, val: number) => void;
  onCompute: (krId: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(kr.current_value));
  const isAuto = !!kr.metric_code;

  function save() {
    const num = parseFloat(val);
    if (!isNaN(num)) onUpdateValue(kr.id, num);
    setEditing(false);
  }

  return (
    <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <span className="font-mono text-[10px] text-slate-400">{kr.kr_number}</span>
        {isAuto ? (
          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[9px] font-bold text-indigo-600">
            Auto·{kr.metric_code}
          </span>
        ) : (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase text-slate-400">
            {METRIC_TYPE_LABEL[kr.metric_type] ?? kr.metric_type}
          </span>
        )}
        <span className="text-[10px] text-slate-400">{kr.direction === 'decrease' ? '↓' : '↑'}</span>
        <PaceArrow delta={Number(kr.pace_delta ?? 0)} />
        {isAuto && (
          <button onClick={() => onCompute(kr.id)}
            className="ml-auto rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-600 hover:bg-indigo-100">
            Compute
          </button>
        )}
      </div>
      <div className="text-sm font-medium text-slate-800 mb-3">{kr.title}</div>

      {snaps.length > 1 && (
        <div className="mb-3">
          <Spark data={snaps} height={32} color={Number(kr.progress_pct) >= 60 ? '#10b981' : '#6366f1'}
            targetLine={expectedPct > 0 ? expectedPct : undefined} />
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 text-center mb-3">
        <div>
          <div className="text-[10px] font-medium uppercase text-slate-400">Baseline</div>
          <div className="text-sm font-bold text-slate-600 tabular-nums">{Number(kr.baseline)} {kr.unit_label}</div>
        </div>
        <div>
          <div className="text-[10px] font-medium uppercase text-slate-400">Current</div>
          {editing ? (
            <div className="flex items-center justify-center gap-1">
              <input type="number" value={val} onChange={e => setVal(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
                className="w-16 rounded border border-blue-300 px-1 py-0.5 text-center text-sm font-bold tabular-nums focus:outline-none" autoFocus />
              <button onClick={save} className="text-blue-600 text-xs font-bold">OK</button>
            </div>
          ) : (
            <button onClick={() => { setVal(String(kr.current_value)); setEditing(true); }}
              className="text-sm font-bold text-blue-600 hover:underline tabular-nums">
              {Number(kr.current_value)} {kr.unit_label}
            </button>
          )}
        </div>
        <div>
          <div className="text-[10px] font-medium uppercase text-slate-400">Target</div>
          <div className="text-sm font-bold text-slate-600 tabular-nums">{Number(kr.target)} {kr.unit_label}</div>
        </div>
      </div>

      <ProgressBar pct={Number(kr.progress_pct ?? 0)} />

      {kr.weight !== 1 && (
        <div className="mt-2 text-[10px] text-slate-400">Weight: {Number(kr.weight)}</div>
      )}
    </div>
  );
}

function CheckinCard({ checkin }: { checkin: OpCheckin }) {
  const conf = checkin.confidence;
  const confColor = conf >= 4 ? 'text-emerald-600' : conf >= 3 ? 'text-amber-600' : 'text-red-600';
  return (
    <div className="rounded-lg border border-slate-100 bg-white px-4 py-3">
      <div className="flex items-center gap-2 mb-1">
        <span className={`text-xs font-bold ${confColor}`}>
          Confidence: {conf}/5
        </span>
        <span className="ml-auto text-[10px] text-slate-400">
          {new Date(checkin.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      {checkin.note && <p className="text-sm text-slate-700">{checkin.note}</p>}
      {checkin.blockers && <p className="mt-1 text-xs text-red-600">Blockers: {checkin.blockers}</p>}
    </div>
  );
}

function CheckinForm({ goalId, tenantId, onDone }: { goalId: string; tenantId: string; onDone: () => void }) {
  const [confidence, setConfidence] = useState(3);
  const [note, setNote] = useState('');
  const [blockers, setBlockers] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    await fetch('/api/bop/ops/goals', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'checkin', goal_id: goalId, tenant_id: tenantId, confidence, note: note || null, blockers: blockers || null }),
    });
    setSaving(false); setNote(''); setBlockers(''); setConfidence(3); onDone();
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
      <div className="text-xs font-bold uppercase tracking-wider text-slate-500">New Check-in</div>
      <div>
        <label className="text-xs text-slate-500">Confidence (1-5)</label>
        <div className="flex gap-1 mt-1">
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n} onClick={() => setConfidence(n)}
              className={`h-8 w-8 rounded-lg text-xs font-bold ${confidence === n ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {n}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-xs text-slate-500">Note</label>
        <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-400 focus:outline-none" />
      </div>
      <div>
        <label className="text-xs text-slate-500">Blockers (optional)</label>
        <input value={blockers} onChange={e => setBlockers(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-blue-400 focus:outline-none" />
      </div>
      <button disabled={saving} onClick={() => void submit()}
        className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-40">
        {saving ? 'Saving...' : 'Submit Check-in'}
      </button>
    </div>
  );
}

interface BudgetData { budget: number; actual_ap: number; actual_ar: number; net_spend: number; variance: number; variance_pct: number }

function BudgetCard({ goalId }: { goalId: string }) {
  const [data, setData] = useState<BudgetData | null>(null);
  const [monthly, setMonthly] = useState<{ month: string; ap: number; ar: number }[]>([]);
  useEffect(() => {
    fetch(`/api/bop/ops/goals?view=budget-actuals&goal_id=${goalId}`).then(r => r.json()).then(j => {
      setData(j.budget ?? null);
      setMonthly(j.monthly ?? []);
    });
  }, [goalId]);
  if (!data || !data.budget) return <div className="text-sm text-slate-400">No budget assigned to this goal.</div>;
  const overBudget = data.variance < 0;
  const usedPct = data.budget > 0 ? Math.min(100, Math.round((data.net_spend / data.budget) * 100)) : 0;
  const maxMonthly = Math.max(1, ...monthly.map(m => Math.max(m.ap, m.ar)));
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-[10px] font-medium uppercase text-slate-400">Budget</div>
            <div className="text-sm font-bold text-slate-700 tabular-nums">{data.budget.toLocaleString('nl-NL', { style: 'currency', currency: 'EUR' })}</div>
          </div>
          <div>
            <div className="text-[10px] font-medium uppercase text-slate-400">Spent (AP)</div>
            <div className="text-sm font-bold text-slate-700 tabular-nums">{data.net_spend.toLocaleString('nl-NL', { style: 'currency', currency: 'EUR' })}</div>
          </div>
          <div>
            <div className="text-[10px] font-medium uppercase text-slate-400">Revenue (AR)</div>
            <div className="text-sm font-bold text-slate-700 tabular-nums">{data.actual_ar.toLocaleString('nl-NL', { style: 'currency', currency: 'EUR' })}</div>
          </div>
          <div>
            <div className="text-[10px] font-medium uppercase text-slate-400">Variance</div>
            <div className={`text-sm font-bold tabular-nums ${overBudget ? 'text-red-600' : 'text-emerald-600'}`}>
              {data.variance.toLocaleString('nl-NL', { style: 'currency', currency: 'EUR' })}
            </div>
          </div>
        </div>
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
          <div className={`h-full rounded-full transition-all ${overBudget ? 'bg-red-400' : 'bg-emerald-400'}`} style={{ width: `${usedPct}%` }} />
        </div>
        <div className="text-[10px] text-slate-400 text-right tabular-nums">{usedPct}% of budget used</div>
      </div>

      {monthly.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Monthly Breakdown</h3>
          <div className="space-y-2">
            {monthly.map(m => (
              <div key={m.month} className="flex items-center gap-3">
                <span className="text-[10px] font-mono text-slate-500 w-16 flex-shrink-0">{m.month}</span>
                <div className="flex-1 flex items-center gap-1">
                  <div className="h-3 rounded bg-red-200" style={{ width: `${(m.ap / maxMonthly) * 100}%`, minWidth: m.ap > 0 ? '4px' : '0' }} title={`AP: ${m.ap.toLocaleString('nl-NL', { style: 'currency', currency: 'EUR' })}`} />
                  <div className="h-3 rounded bg-emerald-200" style={{ width: `${(m.ar / maxMonthly) * 100}%`, minWidth: m.ar > 0 ? '4px' : '0' }} title={`AR: ${m.ar.toLocaleString('nl-NL', { style: 'currency', currency: 'EUR' })}`} />
                </div>
                <span className="text-[10px] text-slate-400 tabular-nums w-20 text-right">{(m.ap - m.ar).toLocaleString('nl-NL', { style: 'currency', currency: 'EUR' })}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-2 text-[9px] text-slate-400">
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded bg-red-200" /> AP (costs)</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded bg-emerald-200" /> AR (revenue)</span>
          </div>
        </div>
      )}
    </div>
  );
}

function ForecastPanel({ goalId }: { goalId: string }) {
  const [forecasts, setForecasts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch(`/api/bop/ops/goals?view=forecast&goal_id=${goalId}`).then(r => r.json()).then(j => {
      setForecasts(j.forecasts ?? []);
      setLoading(false);
    });
  }, [goalId]);

  if (loading) return null;
  if (forecasts.length === 0) return null;
  const valid = forecasts.filter(f => f.trend !== 'insufficient_data');
  if (valid.length === 0) return null;

  return (
    <div>
      <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">Forecast Projections</h2>
      <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-50">
        {valid.map((f: any) => {
          const trendIcon = f.trend === 'up' ? '↗' : f.trend === 'down' ? '↘' : '→';
          const trendColor = f.will_hit_target ? 'text-emerald-600' : 'text-red-500';
          return (
            <div key={f.kr_id} className="flex items-center gap-3 px-4 py-2.5">
              <span className={`text-lg ${trendColor}`}>{trendIcon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-slate-700 truncate">{f.title}</div>
                <div className="text-[10px] text-slate-400">
                  Current: {f.current_value} → Projected: {f.projected_value} {f.unit_label ?? ''} ({f.projected_pct}%)
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className={`text-xs font-bold ${f.will_hit_target ? 'text-emerald-600' : 'text-red-500'}`}>
                  {f.will_hit_target ? 'On Track' : 'At Risk'}
                </div>
                <div className="text-[10px] text-slate-400">{f.days_remaining}d left · {f.daily_rate > 0 ? '+' : ''}{f.daily_rate}/day</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function GoalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { unit } = useScope();
  const router = useRouter();
  const [goal, setGoal] = useState<OpGoal | null>(null);
  const [krs, setKrs] = useState<OpKeyResult[]>([]);
  const [checkins, setCheckins] = useState<OpCheckin[]>([]);
  const [children, setChildren] = useState<Partial<OpGoal>[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [linkedTasks, setLinkedTasks] = useState<LinkedTask[]>([]);
  const [cycles, setCycles] = useState<any[]>([]);
  const [openCycle, setOpenCycle] = useState<any>(null);
  const [bottleneckData, setBottleneckData] = useState<any>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [tab, setTab] = useState<Tab>('overview');
  const [showAddChild, setShowAddChild] = useState(false);
  const [showCloseOut, setShowCloseOut] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [followUpKrs, setFollowUpKrs] = useState<any[] | null>(null);

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 2500); }

  const load = useCallback(async () => {
    setLoading(true);
    const [j, cyclesRes, openCycleRes, bnRes] = await Promise.all([
      fetch(`/api/bop/ops/goals?id=${id}&tenant_id=${unit.id}`).then(r => r.json()),
      fetch(`/api/bop/ops/goals?view=cycles&goal_id=${id}`).then(r => r.json()),
      fetch(`/api/bop/ops/goals?view=open-cycle&goal_id=${id}`).then(r => r.json()).catch(() => ({ cycle: null })),
      fetch(`/api/bop/ops/goals?view=bottleneck&goal_id=${id}`).then(r => r.json()).catch(() => null),
    ]);
    setGoal(j.goal ?? null);
    setKrs(j.key_results ?? []);
    setCheckins(j.checkins ?? []);
    setChildren(j.children ?? []);
    setSnapshots(j.snapshots ?? []);
    setLinkedTasks(j.linked_tasks ?? []);
    setCycles(cyclesRes.cycles ?? []);
    setOpenCycle(openCycleRes.cycle ?? null);
    setBottleneckData(bnRes);
    setLoading(false);
  }, [id, unit.id]);

  useEffect(() => { void load(); }, [load]);

  async function updateKrValue(krId: string, val: number) {
    await fetch('/api/bop/ops/goals', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_kr_value', kr_id: krId, current_value: val }),
    });
    showToast('KR value updated');
    void load();
  }

  async function computeKr(krId: string) {
    showToast('Computing...');
    await fetch('/api/bop/ops/goals', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'compute_kr', kr_id: krId }),
    });
    showToast('KR computed');
    void load();
  }

  async function triggerCycle() {
    const res = await fetch('/api/bop/ops/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'trigger_cycle', goal_id: id }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error ?? 'Failed to trigger cycle');
      return;
    }
    showToast(`Cycle #${data.cycle_number} opened`);
    void load();
  }

  function closeOut() {
    setShowCloseOut(true);
  }

  if (loading) return <div className="flex h-64 items-center justify-center text-sm text-slate-400">Loading...</div>;
  if (!goal) return <div className="flex h-64 items-center justify-center text-sm text-slate-400">Goal not found</div>;

  const snapsByKr: Record<string, number[]> = {};
  for (const s of snapshots) { (snapsByKr[s.kr_id] ??= []).push(s.progress_pct); }

  const expectedPct = (() => {
    if (!goal.period_start || !goal.period_end) return 0;
    const now = Date.now();
    const ps = new Date(goal.period_start).getTime();
    const pe = new Date(goal.period_end).getTime();
    return pe > ps ? Math.max(0, Math.min(100, ((now - ps) / (pe - ps)) * 100)) : 0;
  })();

  return (
    <div className="space-y-4 p-6">
      {toast && <div className="fixed top-5 right-5 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-xl">{toast}</div>}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/console/ops/goals')} title="Back to goals"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 shadow-sm">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <ScreenHeader title="Goal Detail" description={goal.goal_number} />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowEdit(true)}
            className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100">
            Edit
          </button>
          <button onClick={() => setShowAddChild(true)}
            className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">
            + Sub-Goal
          </button>
          <button onClick={() => { void load(); }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 shadow-sm">
            Refresh
          </button>
        </div>
      </div>

      <GoalHeader goal={goal} onCloseOut={() => closeOut()} />

      <ExpectedProgressMarker goal={goal} />

      {/* Next-Best-Action strip */}
      {openCycle && !showWizard && (
        <div className="flex items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3">
          <span className="rounded-lg bg-indigo-200 px-2 py-1 text-[10px] font-bold text-indigo-800">
            Cycle #{openCycle.cycle_number}
          </span>
          <span className="text-xs text-indigo-700 flex-1">
            Review due
            {bottleneckData?.bottleneck && (
              <> &middot; Bottleneck: <strong>{bottleneckData.bottleneck.kr_number}</strong> {bottleneckData.bottleneck.title}</>
            )}
          </span>
          <button onClick={() => setShowWizard(true)}
            className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700">
            Start Review
          </button>
        </div>
      )}

      {/* Cycle Review Wizard */}
      {showWizard && openCycle && (
        <CycleReviewWizard
          cycle={openCycle}
          krs={bottleneckData?.krs ?? []}
          snapsByKr={snapsByKr}
          goalId={id}
          onClose={() => setShowWizard(false)}
          onDone={() => { setShowWizard(false); showToast('Cycle closed'); void load(); }}
        />
      )}

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-xs font-semibold transition-colors ${
              tab === t.key
                ? 'border-b-2 border-indigo-500 text-indigo-600'
                : 'text-slate-400 hover:text-slate-600'
            }`}>
            {t.label}
            {t.key === 'checkins' && checkins.length > 0 && (
              <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] tabular-nums">{checkins.length}</span>
            )}
            {t.key === 'cycles' && cycles.length > 0 && (
              <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[9px] tabular-nums ${
                openCycle ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100'
              }`}>{cycles.length}</span>
            )}
            {t.key === 'work' && linkedTasks.length > 0 && (
              <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] tabular-nums">{linkedTasks.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab: Overview */}
      {tab === 'overview' && (
        <div className="space-y-4">
          <ChildrenList children={children} />

          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">
              Key Results
              {krs.length > 0 && <span className="ml-2 text-xs font-normal text-slate-400">({krs.length})</span>}
            </h2>
            {krs.length === 0 ? (
              <p className="text-sm text-slate-400">No key results yet.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {krs.map(kr => (
                  <KrCard key={kr.id} kr={kr} snaps={snapsByKr[kr.id] ?? []} expectedPct={expectedPct}
                    onUpdateValue={(k, v) => void updateKrValue(k, v)}
                    onCompute={(k) => void computeKr(k)} />
                ))}
              </div>
            )}
          </div>

          {/* T6.3: Forecast projection panel */}
          {goal.status === 'active' && krs.length > 0 && <ForecastPanel goalId={id} />}
        </div>
      )}

      {/* Tab: Check-ins */}
      {tab === 'checkins' && (
        <div className="space-y-4">
          <CheckinForm goalId={id} tenantId={String(unit.id)} onDone={() => { void load(); showToast('Check-in saved'); }} />
          {checkins.length > 0 ? (
            <div className="space-y-2">
              {checkins.map(c => <CheckinCard key={c.id} checkin={c} />)}
            </div>
          ) : (
            <p className="text-sm text-slate-400">No check-ins yet.</p>
          )}
        </div>
      )}

      {/* Tab: Cycles */}
      {tab === 'cycles' && (
        <div className="space-y-4">
          {!openCycle && goal.status === 'active' && (
            <div className="flex items-center justify-between rounded-xl border border-dashed border-indigo-300 bg-indigo-50/50 px-4 py-3">
              <span className="text-xs text-indigo-600">No open review cycle. Start one manually to review progress now.</span>
              <button onClick={() => void triggerCycle()}
                className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 shadow-sm">
                Trigger Review Cycle
              </button>
            </div>
          )}
          <CycleHistory cycles={cycles} />
        </div>
      )}

      {/* Tab: Budget */}
      {tab === 'budget' && (
        <BudgetCard goalId={id} />
      )}

      {/* Tab: Linked Work */}
      {tab === 'work' && (
        <LinkedTasksList tasks={linkedTasks} />
      )}

      {showAddChild && (
        <GoalFormModal tenantId={unit.id}
          defaultParentId={id} defaultEntity={goal.entity ?? undefined}
          onClose={() => setShowAddChild(false)}
          onCreated={() => void load()} />
      )}

      {/* Follow-up goal creation (pre-filled with actuals as baselines) */}
      {followUpKrs && (
        <GoalFormModal tenantId={unit.id}
          defaultEntity={goal.entity ?? undefined}
          defaultFollowUpKrs={followUpKrs}
          onClose={() => setFollowUpKrs(null)}
          onCreated={() => { setFollowUpKrs(null); showToast('Follow-up goal created'); }} />
      )}

      {showEdit && (
        <GoalEditModal
          goal={goal}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); showToast('Goal updated'); void load(); }}
        />
      )}

      {showCloseOut && (
        <CloseOutModal
          goalId={id}
          goalTitle={goal.title}
          krs={krs}
          onClose={() => setShowCloseOut(false)}
          onDone={(achieved) => {
            setShowCloseOut(false);
            showToast(achieved ? 'Goal marked Achieved' : 'Goal marked Semi-Achieved');
            void load();
          }}
          onCreateFollowUp={(krList) => {
            setShowCloseOut(false);
            setFollowUpKrs(krList);
          }}
        />
      )}
    </div>
  );
}

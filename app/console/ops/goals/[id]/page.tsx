'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ScreenHeader } from '@/components/ScreenBadge';
import { useScope } from '@/lib/scope-context';
import {
  GOAL_STATUS_COLOR, GOAL_STATUS_LABEL, HEALTH_COLOR, HEALTH_LABEL,
  ENTITY_LABEL, ENTITY_COLOR, LEVEL_LABEL, CONFIDENCE_LABEL,
  METRIC_TYPE_LABEL,
  type OpGoal, type OpKeyResult, type OpCheckin,
} from '../ops-goal-ui';

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

function KrCard({ kr, onUpdateValue }: { kr: OpKeyResult; onUpdateValue: (krId: string, val: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(kr.current_value));

  function save() {
    const num = parseFloat(val);
    if (!isNaN(num)) onUpdateValue(kr.id, num);
    setEditing(false);
  }

  return (
    <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <span className="font-mono text-[10px] text-slate-400">{kr.kr_number}</span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase text-slate-400">
          {METRIC_TYPE_LABEL[kr.metric_type] ?? kr.metric_type}
        </span>
        <span className="text-[10px] text-slate-400">{kr.direction === 'decrease' ? '↓' : '↑'}</span>
      </div>
      <div className="text-sm font-medium text-slate-800 mb-3">{kr.title}</div>

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
              <button onClick={save} className="text-blue-600 text-xs font-bold">✓</button>
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
          Confidence: {conf}/5 ({CONFIDENCE_LABEL[conf] ?? ''})
        </span>
        <span className="ml-auto text-[10px] text-slate-400">
          {new Date(checkin.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      {checkin.note && <p className="text-sm text-slate-700">{checkin.note}</p>}
      {checkin.blockers && (
        <p className="mt-1 text-xs text-red-600">Blockers: {checkin.blockers}</p>
      )}
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
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'checkin', goal_id: goalId, tenant_id: tenantId, confidence, note: note || null, blockers: blockers || null }),
    });
    setSaving(false);
    setNote('');
    setBlockers('');
    setConfidence(3);
    onDone();
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

export default function GoalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { unit } = useScope();
  const router = useRouter();
  const [goal, setGoal] = useState<OpGoal | null>(null);
  const [krs, setKrs] = useState<OpKeyResult[]>([]);
  const [checkins, setCheckins] = useState<OpCheckin[]>([]);
  const [children, setChildren] = useState<Partial<OpGoal>[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 2500); }

  const load = useCallback(async () => {
    setLoading(true);
    const j = await fetch(`/api/bop/ops/goals?id=${id}&tenant_id=${unit.id}`).then(r => r.json());
    setGoal(j.goal ?? null);
    setKrs(j.key_results ?? []);
    setCheckins(j.checkins ?? []);
    setChildren(j.children ?? []);
    setLoading(false);
  }, [id, unit.id]);

  useEffect(() => { void load(); }, [load]);

  async function updateKrValue(krId: string, val: number) {
    await fetch('/api/bop/ops/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_kr_value', kr_id: krId, current_value: val }),
    });
    showToast('KR value updated');
    void load();
  }

  async function closeOut(achieved: boolean) {
    await fetch('/api/bop/ops/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'close_out', goal_id: id, achieved }),
    });
    showToast(achieved ? 'Goal marked Achieved' : 'Goal marked Semi-Achieved');
    void load();
  }

  if (loading) {
    return <div className="flex h-64 items-center justify-center text-sm text-slate-400">Loading...</div>;
  }

  if (!goal) {
    return <div className="flex h-64 items-center justify-center text-sm text-slate-400">Goal not found</div>;
  }

  const health = goal.health_override ?? goal.health;

  return (
    <div className="space-y-6 p-6">
      {toast && <div className="fixed top-5 right-5 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-xl">{toast}</div>}

      <div className="flex items-center gap-2">
        <button onClick={() => router.push('/console/ops/goals')}
          className="text-xs text-blue-600 hover:underline">← Goals</button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-sm text-slate-400">{goal.goal_number}</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                {LEVEL_LABEL[goal.level] ?? `L${goal.level}`}
              </span>
              <div className={`h-3 w-3 rounded-full ${HEALTH_COLOR[health] ?? 'bg-slate-300'}`} title={HEALTH_LABEL[health] ?? health} />
              <span className="text-xs text-slate-500">{HEALTH_LABEL[health] ?? health}</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-1">{goal.title}</h1>
            {goal.description && <p className="text-sm text-slate-600">{goal.description}</p>}
            {goal.vision_text && <p className="mt-2 text-sm italic text-slate-500">{goal.vision_text}</p>}
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${GOAL_STATUS_COLOR[goal.status]}`}>
              {GOAL_STATUS_LABEL[goal.status] ?? goal.status}
            </span>
            {goal.entity && (
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${ENTITY_COLOR[goal.entity]}`}>
                {ENTITY_LABEL[goal.entity] ?? goal.entity}
              </span>
            )}
            {goal.period_start && goal.period_end && (
              <span className="text-xs text-slate-400">
                {new Date(goal.period_start).toLocaleDateString()} – {new Date(goal.period_end).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="rounded-lg bg-slate-50 p-3">
            <div className="text-[10px] font-medium uppercase text-slate-400">Progress</div>
            <ProgressBar pct={Number(goal.progress_pct ?? 0)} />
          </div>
          {goal.budget !== null && goal.budget !== undefined && (
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="text-[10px] font-medium uppercase text-slate-400">Budget</div>
              <div className="text-sm font-bold text-slate-700 tabular-nums">{Number(goal.budget).toLocaleString('nl-NL', { style: 'currency', currency: 'EUR' })}</div>
            </div>
          )}
          <div className="rounded-lg bg-slate-50 p-3">
            <div className="text-[10px] font-medium uppercase text-slate-400">Key Results</div>
            <div className="text-sm font-bold text-slate-700">{krs.length}</div>
          </div>
        </div>

        {goal.status === 'active' && (
          <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
            <button onClick={() => void closeOut(true)}
              className="rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-200">
              Close as Achieved
            </button>
            <button onClick={() => void closeOut(false)}
              className="rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-200">
              Close as Semi-Achieved
            </button>
          </div>
        )}
      </div>

      {children.length > 0 && (
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">
            {goal.level === 0 ? 'Objectives' : 'Children'}
          </h2>
          <div className="space-y-2">
            {children.map(c => (
              <button key={c.id} onClick={() => router.push(`/console/ops/goals/${c.id}`)}
                className="flex w-full items-center gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 text-left hover:bg-slate-50 shadow-sm">
                <div className={`h-2.5 w-2.5 rounded-full ${HEALTH_COLOR[c.health ?? 'on_track']}`} />
                <span className="font-mono text-[10px] text-slate-400">{c.goal_number}</span>
                <span className="flex-1 text-sm font-medium text-slate-800">{c.title}</span>
                <ProgressBar pct={Number(c.progress_pct ?? 0)} size="sm" />
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${GOAL_STATUS_COLOR[c.status ?? 'active']}`}>
                  {GOAL_STATUS_LABEL[c.status ?? 'active']}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">Key Results</h2>
        {krs.length === 0 ? (
          <p className="text-sm text-slate-400">No key results yet.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {krs.map(kr => <KrCard key={kr.id} kr={kr} onUpdateValue={(k, v) => void updateKrValue(k, v)} />)}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">Check-ins</h2>
        <CheckinForm goalId={id} tenantId={String(unit.id)} onDone={() => { void load(); showToast('Check-in saved'); }} />
        {checkins.length > 0 && (
          <div className="mt-3 space-y-2">
            {checkins.map(c => <CheckinCard key={c.id} checkin={c} />)}
          </div>
        )}
      </div>
    </div>
  );
}

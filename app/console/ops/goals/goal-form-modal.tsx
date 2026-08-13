'use client';
import { useState, useEffect } from 'react';
import {
  ENTITY_LABELS, PERIOD_LABELS, PRIORITY_LABELS, HEALTH_LABELS,
  METRIC_TYPE_LABELS, computePeriodEnd,
  type EntityScope, type PeriodType, type GoalPriority, type MetricType, type Direction,
  type CheckinFrequency, type KeyResultCreateInput,
} from '@/lib/op-goals-types';

interface MetricCatalogEntry {
  code: string;
  name: string;
  query_key: string;
  unit_label: string;
  metric_type: string;
  direction: string;
}

interface ParentOption {
  id: string;
  goal_number: string;
  title: string;
  level: number;
  entity: string | null;
}

interface FollowUpKr {
  title: string;
  current_value: number;
  target: number;
  unit_label: string;
  direction: string;
  metric_code?: string | null;
  metric_type?: string;
}

interface GoalFormModalProps {
  tenantId: number;
  onClose: () => void;
  onCreated: () => void;
  defaultParentId?: string;
  defaultEntity?: string;
  defaultFollowUpKrs?: FollowUpKr[];
}

const CHECKIN_FREQ_LABELS: Record<CheckinFrequency, string> = {
  daily: 'Daily', weekly: 'Weekly', biweekly: 'Bi-weekly', monthly: 'Monthly',
};

const GOAL_TYPE_LABELS: Record<string, string> = {
  committed: 'Committed', aspirational: 'Aspirational',
};

interface KrDraft {
  title: string;
  metric_code: string;
  metric_type: MetricType;
  direction: Direction;
  baseline: string;
  target: string;
  unit_label: string;
  weight: string;
}

function emptyKr(): KrDraft {
  return { title: '', metric_code: '', metric_type: 'manual', direction: 'increase', baseline: '0', target: '', unit_label: '%', weight: '1' };
}

function ReverseEngineerSection({ metrics, onGenerate }: { metrics: MetricCatalogEntry[]; onGenerate: (krs: KrDraft[]) => void }) {
  const [open, setOpen] = useState(false);
  const [conditions, setConditions] = useState<{ text: string; metricCode: string }[]>([]);

  function addCondition() {
    setConditions([...conditions, { text: '', metricCode: '' }]);
  }

  function updateCondition(i: number, patch: Partial<{ text: string; metricCode: string }>) {
    setConditions(conditions.map((c, idx) => idx === i ? { ...c, ...patch } : c));
  }

  function removeCondition(i: number) {
    setConditions(conditions.filter((_, idx) => idx !== i));
  }

  function generate() {
    const drafts: KrDraft[] = conditions
      .filter(c => c.text.trim())
      .map(c => {
        const m = metrics.find(x => x.code === c.metricCode);
        return {
          title: c.text.trim(),
          metric_code: c.metricCode,
          metric_type: (m?.metric_type as MetricType) || 'manual',
          direction: (m?.direction as Direction) || 'increase',
          baseline: '0',
          target: '',
          unit_label: m?.unit_label || '%',
          weight: '1',
        };
      });
    onGenerate(drafts);
    setConditions([]);
    setOpen(false);
  }

  if (!open) {
    return (
      <div className="border-t border-slate-100 pt-2">
        <button onClick={() => { setOpen(true); if (conditions.length === 0) addCondition(); }}
          className="text-[11px] font-semibold text-indigo-500 hover:text-indigo-700">
          Reverse-Engineer KRs from Gap Analysis
        </button>
      </div>
    );
  }

  return (
    <div className="border-t border-slate-100 pt-3 space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
          What must be true to achieve this goal?
        </label>
        <button onClick={() => setOpen(false)} className="text-[10px] text-slate-400 hover:text-slate-600">Close</button>
      </div>
      <p className="text-[11px] text-slate-400">Each answer becomes a Key Result. Optionally bind it to a BOP metric for auto-tracking.</p>

      {conditions.map((c, i) => (
        <div key={i} className="flex gap-2 items-start">
          <span className="text-[10px] font-bold text-slate-300 mt-2">{i + 1}.</span>
          <div className="flex-1 space-y-1">
            <input value={c.text} onChange={e => updateCondition(i, { text: e.target.value })}
              className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none"
              placeholder="e.g. Revenue must reach €500K" />
            <select value={c.metricCode} onChange={e => updateCondition(i, { metricCode: e.target.value })}
              className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-500">
              <option value="">No auto-metric (manual tracking)</option>
              {metrics.map(m => <option key={m.code} value={m.code}>{m.name} ({m.unit_label})</option>)}
            </select>
          </div>
          <button onClick={() => removeCondition(i)} className="text-xs text-red-400 hover:text-red-600 mt-2">✕</button>
        </div>
      ))}

      <div className="flex gap-2">
        <button onClick={addCondition}
          className="rounded bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500 hover:bg-slate-200">
          + Another condition
        </button>
        {conditions.some(c => c.text.trim()) && (
          <button onClick={generate}
            className="rounded bg-indigo-600 px-3 py-1 text-[10px] font-bold text-white hover:bg-indigo-700">
            Generate {conditions.filter(c => c.text.trim()).length} KR{conditions.filter(c => c.text.trim()).length !== 1 ? 's' : ''}
          </button>
        )}
      </div>
    </div>
  );
}

export default function GoalFormModal({ tenantId, onClose, onCreated, defaultParentId, defaultEntity, defaultFollowUpKrs }: GoalFormModalProps) {
  // Core fields
  const [title, setTitle] = useState(defaultFollowUpKrs ? 'Follow-up: ' : '');
  const [description, setDescription] = useState('');
  const [visionText, setVisionText] = useState('');
  const [entity, setEntity] = useState(defaultEntity ?? '');
  const [periodType, setPeriodType] = useState<PeriodType>('quarterly');
  const [periodStart, setPeriodStart] = useState(() => {
    const d = new Date();
    const q = Math.floor(d.getMonth() / 3) * 3;
    return new Date(d.getFullYear(), q, 1).toISOString().slice(0, 10);
  });
  const [periodEnd, setPeriodEnd] = useState('');
  const [priority, setPriority] = useState<GoalPriority>('medium');
  const [goalType, setGoalType] = useState('committed');
  const [parentGoalId, setParentGoalId] = useState(defaultParentId ?? '');
  const [checkinFrequency, setCheckinFrequency] = useState<CheckinFrequency>('weekly');
  const [budget, setBudget] = useState('');

  // Inline KRs — pre-fill from follow-up (actuals become baselines)
  const [krs, setKrs] = useState<KrDraft[]>(() => {
    if (!defaultFollowUpKrs?.length) return [];
    return defaultFollowUpKrs.map(fk => ({
      title: fk.title,
      metric_code: fk.metric_code ?? '',
      metric_type: (fk.metric_type ?? 'manual') as MetricType,
      direction: (fk.direction ?? 'increase') as Direction,
      baseline: String(fk.current_value ?? 0),
      target: String(fk.target ?? ''),
      unit_label: fk.unit_label ?? '%',
      weight: '1',
    }));
  });
  const [metrics, setMetrics] = useState<MetricCatalogEntry[]>([]);
  const [parents, setParents] = useState<ParentOption[]>([]);

  // UI state
  const [saving, setSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Auto-compute period end when type or start changes
  useEffect(() => {
    if (periodType !== 'custom' && periodStart) {
      setPeriodEnd(computePeriodEnd(periodType, periodStart));
    }
  }, [periodType, periodStart]);

  // Load metrics catalog + parent options
  useEffect(() => {
    fetch('/api/bop/ops/goals?view=metrics-catalog')
      .then(r => r.json()).then(j => setMetrics(j.metrics ?? []));
    fetch(`/api/bop/ops/goals?view=parent-options&tenant_id=${tenantId}`)
      .then(r => r.json()).then(j => setParents(j.goals ?? []));
  }, [tenantId]);

  function addKr() { setKrs([...krs, emptyKr()]); }
  function removeKr(i: number) { setKrs(krs.filter((_, idx) => idx !== i)); }
  function updateKr(i: number, patch: Partial<KrDraft>) {
    setKrs(krs.map((kr, idx) => idx === i ? { ...kr, ...patch } : kr));
  }

  function onMetricSelect(i: number, code: string) {
    const m = metrics.find(x => x.code === code);
    if (m) {
      updateKr(i, {
        metric_code: code,
        metric_type: (m.metric_type as MetricType) || 'count',
        unit_label: m.unit_label || '%',
        direction: (m.direction as Direction) || 'increase',
        title: krs[i].title || m.name,
      });
    } else {
      updateKr(i, { metric_code: '' });
    }
  }

  async function submit() {
    if (!title.trim()) return;
    setSaving(true);

    const parentLevel = parentGoalId
      ? (parents.find(p => p.id === parentGoalId)?.level ?? -1) + 1
      : 0;

    const keyResults: KeyResultCreateInput[] = krs
      .filter(kr => kr.title.trim() && kr.target)
      .map(kr => ({
        title: kr.title.trim(),
        metric_type: kr.metric_type,
        direction: kr.direction,
        baseline: parseFloat(kr.baseline) || 0,
        target: parseFloat(kr.target),
        unit_label: kr.unit_label || '%',
        weight: parseFloat(kr.weight) || 1,
        metric_code: kr.metric_code || undefined,
      }));

    const res = await fetch('/api/bop/ops/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_id: tenantId,
        title: title.trim(),
        description: description.trim() || null,
        vision_text: visionText.trim() || null,
        entity: entity || null,
        period_type: periodType,
        period_start: periodStart || null,
        period_end: periodEnd || null,
        priority,
        goal_type: goalType,
        parent_goal_id: parentGoalId || null,
        level: parentLevel,
        checkin_frequency: checkinFrequency,
        budget: budget ? parseFloat(budget) : null,
        key_results: keyResults,
      }),
    });

    setSaving(false);
    if (res.ok) { onCreated(); onClose(); }
  }

  const inputCls = 'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none';
  const labelCls = 'block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1';
  const selectCls = 'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 overflow-y-auto py-8" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl my-auto" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-bold text-slate-800 mb-4">New Strategic Goal</h3>

        <div className="space-y-3">
          {/* Title */}
          <div>
            <label className={labelCls}>Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} autoFocus
              className={inputCls} placeholder="e.g. Grow DES Shop revenue by 40%" />
          </div>

          {/* Row: Entity + Priority + Goal Type */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Entity</label>
              <select value={entity} onChange={e => setEntity(e.target.value)} className={selectCls}>
                <option value="">— All —</option>
                {Object.entries(ENTITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value as GoalPriority)} className={selectCls}>
                {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Type</label>
              <select value={goalType} onChange={e => setGoalType(e.target.value)} className={selectCls}>
                {Object.entries(GOAL_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>

          {/* Row: Period Type + Start + End (auto-computed) */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Period</label>
              <select value={periodType} onChange={e => setPeriodType(e.target.value as PeriodType)} className={selectCls}>
                {Object.entries(PERIOD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Start</label>
              <input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>End {periodType !== 'custom' && <span className="text-slate-300 normal-case">(auto)</span>}</label>
              <input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)}
                className={inputCls} readOnly={periodType !== 'custom'}
                style={periodType !== 'custom' ? { opacity: 0.6 } : undefined} />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
              className={`${inputCls} resize-none`} placeholder="What does success look like?" />
          </div>

          {/* ── Reverse-Engineer KRs ── */}
          <ReverseEngineerSection metrics={metrics} onGenerate={(drafts) => setKrs([...krs, ...drafts])} />

          {/* ── Key Results ── */}
          <div className="border-t border-slate-100 pt-3">
            <div className="flex items-center justify-between mb-2">
              <label className={labelCls}>Key Results</label>
              <button onClick={addKr} className="rounded-lg bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-600 hover:bg-indigo-100">
                + Add KR
              </button>
            </div>

            {krs.length === 0 && (
              <p className="text-xs text-slate-400 mb-2">No key results yet. Add KRs to define measurable outcomes.</p>
            )}

            <div className="space-y-3">
              {krs.map((kr, i) => (
                <div key={i} className="rounded-lg border border-slate-100 bg-slate-50/60 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400">KR-{i + 1}</span>
                    <input value={kr.title} onChange={e => updateKr(i, { title: e.target.value })}
                      className="flex-1 rounded border border-slate-200 bg-white px-2 py-1 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none"
                      placeholder="KR title" />
                    <button onClick={() => removeKr(i)} className="text-xs text-red-400 hover:text-red-600" title="Remove KR">✕</button>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="text-[9px] font-medium text-slate-400 uppercase">Metric</label>
                      <select value={kr.metric_code} onChange={e => onMetricSelect(i, e.target.value)}
                        className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600">
                        <option value="">Manual</option>
                        {metrics.map(m => <option key={m.code} value={m.code}>{m.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-medium text-slate-400 uppercase">Direction</label>
                      <select value={kr.direction} onChange={e => updateKr(i, { direction: e.target.value as Direction })}
                        className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600">
                        <option value="increase">↑ Increase</option>
                        <option value="decrease">↓ Decrease</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-medium text-slate-400 uppercase">Baseline</label>
                      <input type="number" value={kr.baseline} onChange={e => updateKr(i, { baseline: e.target.value })}
                        className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-[11px] tabular-nums" />
                    </div>
                    <div>
                      <label className="text-[9px] font-medium text-slate-400 uppercase">Target *</label>
                      <input type="number" value={kr.target} onChange={e => updateKr(i, { target: e.target.value })}
                        className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-[11px] tabular-nums" placeholder="Required" />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[9px] font-medium text-slate-400 uppercase">Unit</label>
                      <input value={kr.unit_label} onChange={e => updateKr(i, { unit_label: e.target.value })}
                        className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-[11px]" />
                    </div>
                    <div>
                      <label className="text-[9px] font-medium text-slate-400 uppercase">Weight</label>
                      <input type="number" value={kr.weight} onChange={e => updateKr(i, { weight: e.target.value })}
                        className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-[11px] tabular-nums" min="1" max="10" />
                    </div>
                    <div>
                      <label className="text-[9px] font-medium text-slate-400 uppercase">Type</label>
                      <select value={kr.metric_type} onChange={e => updateKr(i, { metric_type: e.target.value as MetricType })}
                        className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600">
                        {Object.entries(METRIC_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </div>
                  </div>

                  {kr.metric_code && (
                    <div className="text-[10px] text-indigo-500 font-medium">
                      Auto-computed from BOP data ({kr.metric_code})
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── Advanced Settings ── */}
          <div className="border-t border-slate-100 pt-2">
            <button onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider hover:text-slate-600">
              {showAdvanced ? '▾' : '▸'} Advanced Settings
            </button>

            {showAdvanced && (
              <div className="mt-3 space-y-3">
                {/* Parent goal */}
                <div>
                  <label className={labelCls}>Parent Goal</label>
                  <select value={parentGoalId} onChange={e => setParentGoalId(e.target.value)} className={selectCls}>
                    <option value="">— Top-level goal —</option>
                    {parents.map(p => (
                      <option key={p.id} value={p.id}>
                        {'  '.repeat(p.level)}{p.goal_number} — {p.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={labelCls}>Check-in Frequency</label>
                    <select value={checkinFrequency} onChange={e => setCheckinFrequency(e.target.value as CheckinFrequency)} className={selectCls}>
                      {Object.entries(CHECKIN_FREQ_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Budget (€)</label>
                    <input type="number" value={budget} onChange={e => setBudget(e.target.value)}
                      className={inputCls} placeholder="Optional" />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Vision Statement</label>
                  <textarea value={visionText} onChange={e => setVisionText(e.target.value)} rows={2}
                    className={`${inputCls} resize-none`} placeholder="Where do we want to be?" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
          <button onClick={() => void submit()} disabled={saving || !title.trim()}
            className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 shadow-sm">
            {saving ? 'Creating...' : `Create Goal${krs.length > 0 ? ` + ${krs.filter(k => k.title && k.target).length} KR${krs.filter(k => k.title && k.target).length !== 1 ? 's' : ''}` : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}

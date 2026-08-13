'use client';
import { useState } from 'react';
import {
  ENTITY_LABELS, PERIOD_LABELS, PRIORITY_LABELS,
  type EntityScope, type PeriodType, type GoalPriority, type CheckinFrequency,
  computePeriodEnd,
} from '@/lib/op-goals-types';
import type { OpGoal } from '../ops-goal-ui';

interface Props {
  goal: OpGoal;
  onClose: () => void;
  onSaved: () => void;
}

const CHECKIN_FREQ_LABELS: Record<CheckinFrequency, string> = {
  daily: 'Daily', weekly: 'Weekly', biweekly: 'Bi-weekly', monthly: 'Monthly',
};
const GOAL_TYPE_LABELS: Record<string, string> = {
  committed: 'Committed', aspirational: 'Aspirational',
};
const STATUS_OPTIONS: Record<string, string> = {
  active: 'Active', paused: 'Paused', cancelled: 'Cancelled',
};

export default function GoalEditModal({ goal, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(goal.title);
  const [description, setDescription] = useState(goal.description ?? '');
  const [visionText, setVisionText] = useState(goal.vision_text ?? '');
  const [entity, setEntity] = useState(goal.entity ?? '');
  const [periodType, setPeriodType] = useState<PeriodType>((goal.period_type as PeriodType) ?? 'quarterly');
  const [periodStart, setPeriodStart] = useState(goal.period_start?.slice(0, 10) ?? '');
  const [periodEnd, setPeriodEnd] = useState(goal.period_end?.slice(0, 10) ?? '');
  const [priority, setPriority] = useState<GoalPriority>((goal.priority as GoalPriority) ?? 'medium');
  const [goalType, setGoalType] = useState<string>(goal.goal_type ?? 'committed');
  const [checkinFrequency, setCheckinFrequency] = useState<CheckinFrequency>((goal.checkin_frequency as CheckinFrequency) ?? 'weekly');
  const [budget, setBudget] = useState(goal.budget != null ? String(goal.budget) : '');
  const [status, setStatus] = useState<string>(goal.status);
  const [saving, setSaving] = useState(false);

  function handlePeriodChange(type: PeriodType, start: string) {
    setPeriodType(type);
    setPeriodStart(start);
    if (type !== 'custom' && start) {
      setPeriodEnd(computePeriodEnd(type, start));
    }
  }

  async function save() {
    if (!title.trim()) return;
    setSaving(true);
    await fetch('/api/bop/ops/goals', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_goal',
        goal_id: goal.id,
        title: title.trim(),
        description: description.trim() || null,
        vision_text: visionText.trim() || null,
        entity: entity || null,
        period_type: periodType,
        period_start: periodStart || null,
        period_end: periodEnd || null,
        priority,
        goal_type: goalType,
        checkin_frequency: checkinFrequency,
        budget: budget ? parseFloat(budget) : null,
        status,
      }),
    });
    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h2 className="text-sm font-bold text-slate-800">Edit Goal — {goal.goal_number}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg">&times;</button>
        </div>

        <div className="px-5 py-4 space-y-3 overflow-y-auto flex-1">
          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none" />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Entity</label>
              <select value={entity} onChange={e => setEntity(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700">
                <option value="">All entities</option>
                {(Object.entries(ENTITY_LABELS) as [string, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700">
                {Object.entries(STATUS_OPTIONS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value as GoalPriority)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700">
                {(Object.entries(PRIORITY_LABELS) as [string, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Goal Type</label>
              <select value={goalType} onChange={e => setGoalType(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700">
                {Object.entries(GOAL_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Check-in</label>
              <select value={checkinFrequency} onChange={e => setCheckinFrequency(e.target.value as CheckinFrequency)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700">
                {(Object.entries(CHECKIN_FREQ_LABELS) as [string, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Period</label>
              <select value={periodType} onChange={e => handlePeriodChange(e.target.value as PeriodType, periodStart)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700">
                {(Object.entries(PERIOD_LABELS) as [string, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Start</label>
              <input type="date" value={periodStart} onChange={e => handlePeriodChange(periodType, e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">End</label>
              <input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700"
                readOnly={periodType !== 'custom'} />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Budget (EUR)</label>
            <input type="number" value={budget} onChange={e => setBudget(e.target.value)}
              placeholder="Optional"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none" />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Vision / North Star</label>
            <textarea value={visionText} onChange={e => setVisionText(e.target.value)} rows={2}
              placeholder="What does success look like?"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none" />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3">
          <button onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50">
            Cancel
          </button>
          <button onClick={() => void save()} disabled={saving || !title.trim()}
            className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-40">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

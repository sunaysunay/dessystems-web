'use client';
import { useState } from 'react';
import type { OpKeyResult } from '../ops-goal-ui';

interface Props {
  goalId: string;
  goalTitle: string;
  krs: OpKeyResult[];
  onClose: () => void;
  onDone: (achieved: boolean) => void;
  onCreateFollowUp: (krs: OpKeyResult[]) => void;
}

export default function CloseOutModal({ goalId, goalTitle, krs, onClose, onDone, onCreateFollowUp }: Props) {
  const [closingNote, setClosingNote] = useState('');
  const [saving, setSaving] = useState(false);

  const allMet = krs.every(kr => Number(kr.progress_pct) >= 100);
  const noneMet = krs.every(kr => Number(kr.progress_pct) < 50);
  const suggestedOutcome = allMet ? 'achieved' : 'semi_achieved';

  async function submit(achieved: boolean) {
    setSaving(true);
    await fetch('/api/bop/ops/goals', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'close_out', goal_id: goalId, achieved, closing_note: closingNote || null }),
    });
    setSaving(false);
    onDone(achieved);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h2 className="text-sm font-bold text-slate-800">Close-out Retrospective</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg">&times;</button>
        </div>

        <div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="text-xs text-slate-500">Final scorecard for <strong>{goalTitle}</strong></div>

          <div className="space-y-2">
            {krs.map(kr => {
              const pct = Number(kr.progress_pct ?? 0);
              const met = pct >= 100;
              return (
                <div key={kr.id} className={`rounded-lg border px-3 py-2 ${met ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-100'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-slate-700">{kr.kr_number} {kr.title}</span>
                    <span className={`text-[10px] font-bold ${met ? 'text-emerald-600' : 'text-red-500'}`}>
                      {met ? 'MET' : `${pct.toFixed(0)}%`}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-500">
                    <div>Baseline: <strong>{Number(kr.baseline)}</strong> {kr.unit_label}</div>
                    <div>Actual: <strong className="text-slate-800">{Number(kr.current_value)}</strong> {kr.unit_label}</div>
                    <div>Target: <strong>{Number(kr.target)}</strong> {kr.unit_label}</div>
                  </div>
                  <div className="mt-1 h-1 rounded-full bg-slate-100 overflow-hidden">
                    <div className={`h-full rounded-full ${met ? 'bg-emerald-400' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                      style={{ width: `${Math.min(100, pct)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500">Closing note (optional)</label>
            <textarea value={closingNote} onChange={e => setClosingNote(e.target.value)} rows={2}
              placeholder="Any final reflections on this goal?"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none" />
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
          <button onClick={() => onCreateFollowUp(krs)}
            className="rounded-lg border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50">
            Create Follow-up Goal
          </button>
          <div className="flex gap-2">
            <button onClick={() => void submit(false)} disabled={saving}
              className="rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-200 disabled:opacity-40">
              Semi-Achieved
            </button>
            <button onClick={() => void submit(true)} disabled={saving}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-40">
              {saving ? 'Closing...' : 'Achieved'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

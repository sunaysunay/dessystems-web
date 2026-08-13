'use client';
import { useState } from 'react';
import { Spark } from '@/components/CockpitKit';

interface CycleData {
  id: string;
  cycle_number: number;
  expected_progress: number;
  actual_progress: number;
  gap_pct: number;
  health_at_review: string;
  bottleneck_kr_id: string | null;
  look_summary: string | null;
  root_cause: string | null;
  decision: string | null;
  decision_note: string | null;
  learning: string | null;
}

interface KrDetail {
  id: string;
  kr_number: string;
  title: string;
  progress_pct: number;
  current_value: number;
  baseline: number;
  target: number;
  direction: string;
  unit_label: string;
  weight: number;
  expected_pct: number;
  gap: number;
}

interface Props {
  cycle: CycleData;
  krs: KrDetail[];
  snapsByKr: Record<string, number[]>;
  goalId: string;
  onClose: () => void;
  onDone: () => void;
}

const STEPS = ['LOOK', 'DIAGNOSE', 'DECIDE', 'ACT', 'LEARN'] as const;
type Step = typeof STEPS[number];

const DECISIONS = [
  { value: 'continue', label: 'Continue', desc: 'Stay the course — on track or close enough' },
  { value: 'adjust_tasks', label: 'Adjust Tasks', desc: 'Reprioritize or add execution tasks' },
  { value: 'adjust_krs', label: 'Adjust KRs', desc: 'Change targets or add/remove key results' },
  { value: 'rebaseline', label: 'Re-baseline', desc: 'Reset baselines to current values' },
  { value: 'close', label: 'Close Goal', desc: 'Goal is no longer relevant' },
] as const;

const HEALTH_COLOR: Record<string, string> = {
  on_track: 'text-emerald-600', at_risk: 'text-amber-600',
  off_track: 'text-red-600', no_data: 'text-slate-400',
};
const HEALTH_LABEL: Record<string, string> = {
  on_track: 'On Track', at_risk: 'At Risk',
  off_track: 'Off Track', no_data: 'No Data',
};

export default function CycleReviewWizard({ cycle, krs, snapsByKr, goalId, onClose, onDone }: Props) {
  const [step, setStep] = useState<Step>('LOOK');
  const [lookSummary, setLookSummary] = useState(cycle.look_summary ?? '');
  const [rootCause, setRootCause] = useState(cycle.root_cause ?? '');
  const [decision, setDecision] = useState(cycle.decision ?? '');
  const [decisionNote, setDecisionNote] = useState(cycle.decision_note ?? '');
  const [learning, setLearning] = useState(cycle.learning ?? '');
  const [saving, setSaving] = useState(false);

  const stepIdx = STEPS.indexOf(step);
  const bottleneckKr = krs.find(k => k.id === cycle.bottleneck_kr_id);

  async function saveCycle(fields: Record<string, unknown>) {
    setSaving(true);
    await fetch('/api/bop/ops/goals', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_cycle', cycle_id: cycle.id, ...fields }),
    });
    setSaving(false);
  }

  async function closeCycle() {
    setSaving(true);
    await saveCycle({ learning: learning || null });
    await fetch('/api/bop/ops/goals', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'close_cycle', cycle_id: cycle.id, goal_id: goalId }),
    });
    setSaving(false);
    onDone();
  }

  function next() {
    const idx = STEPS.indexOf(step);
    if (step === 'LOOK') void saveCycle({ look_summary: lookSummary || null });
    if (step === 'DIAGNOSE') void saveCycle({ root_cause: rootCause || null });
    if (step === 'DECIDE') void saveCycle({ decision: decision || null, decision_note: decisionNote || null });
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
  }

  function prev() {
    const idx = STEPS.indexOf(step);
    if (idx > 0) setStep(STEPS[idx - 1]);
  }

  return (
    <div className="rounded-xl border-2 border-indigo-200 bg-white shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-indigo-100 px-2.5 py-1 text-xs font-bold text-indigo-700">
            Cycle #{cycle.cycle_number}
          </span>
          <span className="text-sm font-semibold text-slate-700">Review Wizard</span>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg leading-none">&times;</button>
      </div>

      {/* Step indicator */}
      <div className="flex border-b border-slate-100">
        {STEPS.map((s, i) => (
          <button key={s} onClick={() => setStep(s)}
            className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${
              i === stepIdx ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-500' :
              i < stepIdx ? 'text-emerald-600 bg-emerald-50/50' : 'text-slate-400'
            }`}>
            {i < stepIdx && <span className="mr-1">&#10003;</span>}{s}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-5">
        {/* ── LOOK ── */}
        {step === 'LOOK' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg bg-slate-50 p-3 text-center">
                <div className="text-[10px] font-medium uppercase text-slate-400">Expected</div>
                <div className="text-lg font-bold text-slate-700 tabular-nums">{Number(cycle.expected_progress).toFixed(0)}%</div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 text-center">
                <div className="text-[10px] font-medium uppercase text-slate-400">Actual</div>
                <div className="text-lg font-bold text-slate-700 tabular-nums">{Number(cycle.actual_progress).toFixed(0)}%</div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 text-center">
                <div className="text-[10px] font-medium uppercase text-slate-400">Gap</div>
                <div className={`text-lg font-bold tabular-nums ${Number(cycle.gap_pct) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {Number(cycle.gap_pct) > 0 ? '+' : ''}{Number(cycle.gap_pct).toFixed(1)}%
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Health at review:</span>
              <span className={`text-xs font-bold ${HEALTH_COLOR[cycle.health_at_review] ?? 'text-slate-500'}`}>
                {HEALTH_LABEL[cycle.health_at_review] ?? cycle.health_at_review}
              </span>
            </div>

            {bottleneckKr && (
              <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3">
                <div className="text-[10px] font-bold uppercase text-red-500 mb-1">Bottleneck KR</div>
                <div className="text-sm font-medium text-red-800">{bottleneckKr.kr_number} — {bottleneckKr.title}</div>
                <div className="mt-1 text-xs text-red-600 tabular-nums">
                  {Number(bottleneckKr.current_value)} / {Number(bottleneckKr.target)} {bottleneckKr.unit_label}
                  &nbsp;&middot;&nbsp;{Number(bottleneckKr.progress_pct).toFixed(0)}% vs {Number(bottleneckKr.expected_pct).toFixed(0)}% expected
                  &nbsp;&middot;&nbsp;Gap: {Number(bottleneckKr.gap).toFixed(1)}%
                </div>
              </div>
            )}

            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">KR Progress vs Expected</div>
              {krs.map(kr => (
                <div key={kr.id} className={`rounded-lg border px-3 py-2 ${kr.id === cycle.bottleneck_kr_id ? 'border-red-200 bg-red-50/30' : 'border-slate-100'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-slate-700">{kr.kr_number} {kr.title}</span>
                    <span className={`text-[10px] font-bold tabular-nums ${kr.gap >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {kr.gap > 0 ? '+' : ''}{kr.gap.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className={`h-full rounded-full ${Number(kr.progress_pct) >= kr.expected_pct - 5 ? 'bg-emerald-400' : 'bg-red-400'}`}
                        style={{ width: `${Math.min(100, Number(kr.progress_pct))}%` }} />
                    </div>
                    <span className="text-[10px] text-slate-400 tabular-nums w-12 text-right">{Number(kr.progress_pct).toFixed(0)}%</span>
                    {(snapsByKr[kr.id]?.length ?? 0) > 1 && (
                      <Spark data={snapsByKr[kr.id]} height={20} color={kr.gap >= 0 ? '#10b981' : '#ef4444'} />
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div>
              <label className="text-xs font-medium text-slate-500">Summary / observations (optional)</label>
              <textarea value={lookSummary} onChange={e => setLookSummary(e.target.value)} rows={2}
                placeholder="What stands out when you look at the data?"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none" />
            </div>
          </div>
        )}

        {/* ── DIAGNOSE ── */}
        {step === 'DIAGNOSE' && (
          <div className="space-y-4">
            <div className="text-sm text-slate-600">
              Why is there a gap? What&apos;s the root cause behind the bottleneck?
            </div>

            {bottleneckKr && (
              <div className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3">
                <div className="text-[10px] font-bold uppercase text-amber-600 mb-1">Focus: Bottleneck KR</div>
                <div className="text-sm font-medium text-amber-900">{bottleneckKr.kr_number} — {bottleneckKr.title}</div>
                <div className="text-xs text-amber-700 mt-1">
                  Gap: {Number(bottleneckKr.gap).toFixed(1)}% behind expected
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-slate-500">Root cause analysis</label>
              <textarea value={rootCause} onChange={e => setRootCause(e.target.value)} rows={4}
                placeholder="What is causing the gap? e.g., delayed procurement, insufficient leads, market shift..."
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none" />
            </div>
          </div>
        )}

        {/* ── DECIDE ── */}
        {step === 'DECIDE' && (
          <div className="space-y-4">
            <div className="text-sm text-slate-600">What will you do about it?</div>

            <div className="grid gap-2">
              {DECISIONS.map(d => (
                <button key={d.value} onClick={() => setDecision(d.value)}
                  className={`rounded-lg border px-4 py-3 text-left transition-colors ${
                    decision === d.value
                      ? 'border-indigo-300 bg-indigo-50 ring-1 ring-indigo-200'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}>
                  <div className="text-sm font-semibold text-slate-700">{d.label}</div>
                  <div className="text-xs text-slate-500">{d.desc}</div>
                </button>
              ))}
            </div>

            <div>
              <label className="text-xs font-medium text-slate-500">Decision note (optional)</label>
              <textarea value={decisionNote} onChange={e => setDecisionNote(e.target.value)} rows={2}
                placeholder="Why this decision? Any specific actions planned?"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none" />
            </div>
          </div>
        )}

        {/* ── ACT ── */}
        {step === 'ACT' && (
          <div className="space-y-4">
            <div className="text-sm text-slate-600">
              Create or update tasks to execute your decision. You can do this from the Linked Work tab after closing this review.
            </div>

            {decision === 'continue' && (
              <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-4 py-3 text-sm text-emerald-700">
                Decision: <strong>Continue</strong> — no action items needed. Proceed to the Learn step.
              </div>
            )}
            {decision === 'adjust_tasks' && (
              <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-700">
                Decision: <strong>Adjust Tasks</strong> — after closing this review, go to the Linked Work tab to create or reprioritize tasks.
              </div>
            )}
            {decision === 'adjust_krs' && (
              <div className="rounded-lg bg-amber-50 border border-amber-100 px-4 py-3 text-sm text-amber-700">
                Decision: <strong>Adjust KRs</strong> — key results can be edited from the Overview tab after closing this review.
              </div>
            )}
            {decision === 'rebaseline' && (
              <div className="rounded-lg bg-purple-50 border border-purple-100 px-4 py-3 text-sm text-purple-700">
                Decision: <strong>Re-baseline</strong> — after closing, update KR baselines to current values on the Overview tab.
              </div>
            )}
            {decision === 'close' && (
              <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
                Decision: <strong>Close Goal</strong> — after this review closes, use the goal header controls to close out the goal.
              </div>
            )}
            {!decision && (
              <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-500">
                Go back to the Decide step to select an action.
              </div>
            )}
          </div>
        )}

        {/* ── LEARN ── */}
        {step === 'LEARN' && (
          <div className="space-y-4">
            <div className="text-sm text-slate-600">
              What did this cycle teach you? This is sealed into the goal&apos;s history.
            </div>
            <textarea value={learning} onChange={e => setLearning(e.target.value)} rows={4}
              placeholder="What worked? What didn't? What would you do differently next time?"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none" />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
        <button onClick={prev} disabled={stepIdx === 0}
          className="rounded-lg border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-30">
          Back
        </button>
        <div className="text-[10px] text-slate-400">{stepIdx + 1} of {STEPS.length}</div>
        {step === 'LEARN' ? (
          <button onClick={() => void closeCycle()} disabled={saving}
            className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-40">
            {saving ? 'Closing...' : 'Close Cycle'}
          </button>
        ) : (
          <button onClick={next}
            className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700">
            Next
          </button>
        )}
      </div>
    </div>
  );
}

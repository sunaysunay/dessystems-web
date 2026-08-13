'use client';

interface Cycle {
  id: string;
  cycle_number: number;
  started_at: string;
  ended_at: string | null;
  status: string;
  expected_progress: number;
  actual_progress: number;
  gap_pct: number;
  health_at_review: string;
  look_summary: string | null;
  root_cause: string | null;
  decision: string | null;
  decision_note: string | null;
  learning: string | null;
}

const HEALTH_COLOR: Record<string, string> = {
  on_track: 'text-emerald-600', at_risk: 'text-amber-600',
  off_track: 'text-red-600', no_data: 'text-slate-400',
};
const HEALTH_LABEL: Record<string, string> = {
  on_track: 'On Track', at_risk: 'At Risk',
  off_track: 'Off Track', no_data: 'No Data',
};
const DECISION_LABEL: Record<string, string> = {
  continue: 'Continue', adjust_tasks: 'Adjust Tasks',
  adjust_krs: 'Adjust KRs', rebaseline: 'Re-baseline', close: 'Close Goal',
};

export default function CycleHistory({ cycles }: { cycles: Cycle[] }) {
  if (!cycles.length) {
    return <p className="text-sm text-slate-400">No review cycles yet. Cycles are opened automatically based on your check-in frequency.</p>;
  }

  return (
    <div className="space-y-3">
      {cycles.map(c => (
        <div key={c.id} className={`rounded-xl border bg-white p-4 ${c.status === 'open' ? 'border-indigo-200 ring-1 ring-indigo-100' : 'border-slate-100'}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                Cycle #{c.cycle_number}
              </span>
              <span className={`text-[10px] font-bold ${HEALTH_COLOR[c.health_at_review] ?? 'text-slate-400'}`}>
                {HEALTH_LABEL[c.health_at_review] ?? c.health_at_review}
              </span>
              {c.status === 'open' && (
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[9px] font-bold text-indigo-600 animate-pulse">
                  OPEN
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-400">
              {new Date(c.started_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
              {c.ended_at && ` — ${new Date(c.ended_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}`}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center mb-3">
            <div>
              <div className="text-[10px] text-slate-400">Expected</div>
              <div className="text-sm font-bold text-slate-600 tabular-nums">{Number(c.expected_progress).toFixed(0)}%</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400">Actual</div>
              <div className="text-sm font-bold text-slate-600 tabular-nums">{Number(c.actual_progress).toFixed(0)}%</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400">Gap</div>
              <div className={`text-sm font-bold tabular-nums ${Number(c.gap_pct) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {Number(c.gap_pct) > 0 ? '+' : ''}{Number(c.gap_pct).toFixed(1)}%
              </div>
            </div>
          </div>

          {c.status === 'closed' && (
            <div className="space-y-2 text-xs">
              {c.root_cause && (
                <div>
                  <span className="font-bold text-slate-500">Root cause: </span>
                  <span className="text-slate-600">{c.root_cause}</span>
                </div>
              )}
              {c.decision && (
                <div>
                  <span className="font-bold text-slate-500">Decision: </span>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                    {DECISION_LABEL[c.decision] ?? c.decision}
                  </span>
                  {c.decision_note && <span className="text-slate-500 ml-1">— {c.decision_note}</span>}
                </div>
              )}
              {c.learning && (
                <div>
                  <span className="font-bold text-slate-500">Learning: </span>
                  <span className="text-slate-600 italic">{c.learning}</span>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

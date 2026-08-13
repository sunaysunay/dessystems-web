'use client';
import { useRouter } from 'next/navigation';
import {
  GOAL_STATUS_COLOR, GOAL_STATUS_LABEL, HEALTH_COLOR, HEALTH_LABEL,
  ENTITY_LABEL, ENTITY_COLOR, LEVEL_LABEL,
  type OpGoal,
} from '../ops-goal-ui';
import type { GoalHealth } from '@/lib/op-goals-types';

function ProgressBar({ pct }: { pct: number }) {
  const w = Math.max(0, Math.min(100, pct));
  const color = w >= 75 ? 'bg-emerald-500' : w >= 40 ? 'bg-amber-400' : 'bg-red-400';
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${w}%` }} />
      </div>
      <span className="text-xs font-bold text-slate-500 tabular-nums">{Math.round(w)}%</span>
    </div>
  );
}

function GoalBadges({ goal }: { goal: OpGoal }) {
  return (
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
  );
}

function GoalStats({ goal }: { goal: OpGoal }) {
  return (
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
    </div>
  );
}

export function GoalHeader({ goal, onCloseOut }: { goal: OpGoal; onCloseOut: () => void }) {
  const health = (goal.health_override ?? goal.health) as GoalHealth;
  return (
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
        <GoalBadges goal={goal} />
      </div>
      <GoalStats goal={goal} />
      {goal.status === 'active' && (
        <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
          <button onClick={onCloseOut}
            className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200">
            Close Goal
          </button>
        </div>
      )}
    </div>
  );
}

export function ChildrenList({ children }: { children: Partial<OpGoal>[] }) {
  const router = useRouter();
  if (!children.length) return null;
  return (
    <div>
      <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">Sub-Goals</h2>
      <div className="space-y-2">
        {children.map(c => (
          <button key={c.id} onClick={() => router.push(`/console/ops/goals/${c.id}`)}
            className="flex w-full items-center gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 text-left hover:bg-slate-50 shadow-sm">
            <div className={`h-2.5 w-2.5 rounded-full ${HEALTH_COLOR[c.health ?? 'on_track']}`} />
            <span className="font-mono text-[10px] text-slate-400">{c.goal_number}</span>
            <span className="flex-1 text-sm font-medium text-slate-800">{c.title}</span>
            <ProgressBar pct={Number(c.progress_pct ?? 0)} />
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${GOAL_STATUS_COLOR[c.status ?? 'active']}`}>
              {GOAL_STATUS_LABEL[c.status ?? 'active']}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

interface LinkedTask { id: string; task_number: string; title: string; status: string; goal_kr_id: string }

export function LinkedTasksList({ tasks }: { tasks: LinkedTask[] }) {
  const router = useRouter();
  if (!tasks.length) return null;
  const statusColor: Record<string, string> = {
    open: 'bg-blue-100 text-blue-700', in_progress: 'bg-amber-100 text-amber-700',
    done: 'bg-emerald-100 text-emerald-700', closed: 'bg-slate-200 text-slate-500',
  };
  return (
    <div>
      <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">Linked Tasks</h2>
      <div className="space-y-1">
        {tasks.map(t => (
          <button key={t.id} onClick={() => router.push('/console/ops/tasks')}
            className="flex w-full items-center gap-3 rounded-lg bg-white px-3 py-2 text-left hover:bg-slate-50 border border-slate-100">
            <span className="font-mono text-[10px] text-slate-400">{t.task_number}</span>
            <span className="flex-1 text-sm text-slate-700 truncate">{t.title}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusColor[t.status] ?? 'bg-slate-100 text-slate-500'}`}>
              {t.status}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

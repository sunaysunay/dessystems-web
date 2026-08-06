'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ScreenHeader } from '@/components/ScreenBadge';
import { useScope } from '@/lib/scope-context';
import {
  GOAL_STATUS_COLOR, GOAL_STATUS_LABEL, HEALTH_COLOR, HEALTH_LABEL,
  ENTITY_LABEL, ENTITY_COLOR, LEVEL_LABEL,
  type OpGoal, type OpKeyResult,
} from './ops-goal-ui';

function ProgressBar({ pct }: { pct: number }) {
  const w = Math.max(0, Math.min(100, pct));
  const color = w >= 75 ? 'bg-emerald-500' : w >= 40 ? 'bg-amber-400' : 'bg-red-400';
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${w}%` }} />
      </div>
      <span className="text-[10px] font-bold text-slate-500 tabular-nums">{Math.round(w)}%</span>
    </div>
  );
}

function KrRow({ kr }: { kr: OpKeyResult }) {
  const pct = Number(kr.progress_pct ?? 0);
  return (
    <div className="ml-12 flex items-center gap-3 rounded-lg bg-slate-50/60 px-3 py-1.5 text-xs">
      <span className="font-mono text-[10px] text-slate-400">{kr.kr_number}</span>
      <span className="flex-1 text-slate-700">{kr.title}</span>
      <span className="text-[10px] text-slate-400 tabular-nums">
        {Number(kr.current_value)}/{Number(kr.target)} {kr.unit_label}
      </span>
      <ProgressBar pct={pct} />
    </div>
  );
}

function GoalRow({ goal, depth, router }: { goal: OpGoal; depth: number; router: ReturnType<typeof useRouter> }) {
  const [expanded, setExpanded] = useState(depth === 0);
  const hasChildren = (goal.children?.length ?? 0) > 0;
  const hasKrs = (goal.key_results?.length ?? 0) > 0;
  const expandable = hasChildren || hasKrs;
  const pct = Number(goal.progress_pct ?? 0);
  const health = goal.health_override ?? goal.health;

  return (
    <div>
      <div
        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-slate-50 ${depth === 0 ? 'border border-slate-100 bg-white shadow-sm' : ''}`}
        style={{ paddingLeft: `${depth * 24 + 12}px` }}
      >
        {expandable ? (
          <button onClick={() => setExpanded(!expanded)} className="flex h-5 w-5 items-center justify-center rounded text-slate-400 hover:bg-slate-100">
            <span className={`text-xs transition-transform ${expanded ? 'rotate-90' : ''}`}>▶</span>
          </button>
        ) : (
          <span className="w-5" />
        )}

        <div className={`h-2.5 w-2.5 rounded-full ${HEALTH_COLOR[health] ?? 'bg-slate-300'}`} title={HEALTH_LABEL[health] ?? health} />

        <button
          onClick={() => router.push(`/console/ops/goals/${goal.id}`)}
          className="font-mono text-[10px] text-blue-600 hover:underline"
        >
          {goal.goal_number}
        </button>

        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">
          {LEVEL_LABEL[goal.level] ?? `L${goal.level}`}
        </span>

        <span className="flex-1 truncate text-sm font-medium text-slate-800">{goal.title}</span>

        {goal.entity && (
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${ENTITY_COLOR[goal.entity] ?? 'bg-slate-100 text-slate-500'}`}>
            {ENTITY_LABEL[goal.entity] ?? goal.entity}
          </span>
        )}

        <ProgressBar pct={pct} />

        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${GOAL_STATUS_COLOR[goal.status] ?? 'bg-slate-100 text-slate-500'}`}>
          {GOAL_STATUS_LABEL[goal.status] ?? goal.status}
        </span>

        {goal.period_start && goal.period_end && (
          <span className="text-[10px] text-slate-400">
            {new Date(goal.period_start).toLocaleDateString([], { month: 'short' })}–{new Date(goal.period_end).toLocaleDateString([], { month: 'short', year: '2-digit' })}
          </span>
        )}
      </div>

      {expanded && hasKrs && (
        <div className="space-y-1 py-1">
          {goal.key_results!.map(kr => <KrRow key={kr.id} kr={kr} />)}
        </div>
      )}

      {expanded && hasChildren && (
        <div className="space-y-1 py-1">
          {goal.children!.map(child => (
            <GoalRow key={child.id} goal={child} depth={depth + 1} router={router} />
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryCards({ summary }: { summary: Record<string, number> }) {
  const cards = [
    { label: 'Active Goals', value: summary.active ?? 0, color: 'text-blue-700 bg-blue-50' },
    { label: 'On Track', value: summary.on_track ?? 0, color: 'text-emerald-700 bg-emerald-50' },
    { label: 'At Risk', value: summary.at_risk ?? 0, color: 'text-amber-700 bg-amber-50' },
    { label: 'Off Track', value: summary.off_track ?? 0, color: 'text-red-700 bg-red-50' },
    { label: 'Achieved', value: summary.achieved ?? 0, color: 'text-emerald-700 bg-emerald-50' },
    { label: 'Avg Progress', value: `${summary.avg_progress ?? 0}%`, color: 'text-slate-700 bg-slate-50' },
  ];
  return (
    <div className="grid grid-cols-6 gap-3">
      {cards.map(c => (
        <div key={c.label} className={`rounded-xl border border-slate-100 p-3 ${c.color}`}>
          <div className="text-lg font-bold tabular-nums">{c.value}</div>
          <div className="text-[10px] font-medium uppercase tracking-wider opacity-70">{c.label}</div>
        </div>
      ))}
    </div>
  );
}

export default function GoalTreePage() {
  const { unit } = useScope();
  const router = useRouter();
  const [goals, setGoals] = useState<OpGoal[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const tp = new URLSearchParams({ tenant_id: String(unit.id), view: 'tree' });
    if (statusFilter) tp.set('status', statusFilter);
    if (entityFilter) tp.set('entity', entityFilter);

    const sp = new URLSearchParams({ tenant_id: String(unit.id), view: 'dashboard-summary' });

    const [treeRes, summaryRes] = await Promise.all([
      fetch(`/api/bop/ops/goals?${tp}`).then(r => r.json()),
      fetch(`/api/bop/ops/goals?${sp}`).then(r => r.json()),
    ]);

    let tree: OpGoal[] = treeRes.goals ?? [];
    if (search) {
      const s = search.toLowerCase();
      function matchTree(g: OpGoal): boolean {
        if (g.title.toLowerCase().includes(s) || g.goal_number.toLowerCase().includes(s)) return true;
        return (g.children ?? []).some(matchTree);
      }
      tree = tree.filter(matchTree);
    }

    setGoals(tree);
    setSummary(summaryRes.summary ?? {});
    setLoading(false);
  }, [statusFilter, entityFilter, search, unit.id]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <ScreenHeader title="Strategy Cockpit" description="OP002 — Goals, Objectives & Key Results" />
        <button
          onClick={() => { void load(); }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 shadow-sm"
        >Refresh</button>
      </div>

      <SummaryCards summary={summary} />

      <div className="flex items-center gap-3 flex-wrap">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600">
          <option value="">All statuses</option>
          {Object.entries(GOAL_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={entityFilter} onChange={e => setEntityFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600">
          <option value="">All entities</option>
          {Object.entries(ENTITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input type="text" placeholder="Search goals..." value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') void load(); }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 placeholder-slate-400 focus:border-blue-400 focus:outline-none w-64" />
        <span className="ml-auto text-xs text-slate-400">{goals.length} top-level goals</span>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center text-sm text-slate-400">Loading goals...</div>
      ) : goals.length === 0 ? (
        <div className="flex h-48 items-center justify-center text-sm text-slate-400">No goals found. Create your first goal to get started.</div>
      ) : (
        <div className="space-y-2">
          {goals.map(g => <GoalRow key={g.id} goal={g} depth={0} router={router} />)}
        </div>
      )}
    </div>
  );
}

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
import type { GoalHealth } from '@/lib/op-goals-types';
import { PRIORITY_LABELS, PRIORITY_COLORS, type GoalPriority } from '@/lib/op-goals-types';
import GoalFormModal from './goal-form-modal';

type SortField = 'status' | 'period_start' | 'period_end' | 'progress' | null;
type SortDir = 'asc' | 'desc';

const STATUS_ORDER: Record<string, number> = { active: 0, paused: 1, achieved: 2, semi_achieved: 3, closed: 4 };

function sortGoals(goals: OpGoal[], field: SortField, dir: SortDir): OpGoal[] {
  if (!field) return goals;
  return [...goals].sort((a, b) => {
    let cmp = 0;
    if (field === 'status') cmp = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9);
    else if (field === 'period_start') cmp = (a.period_start ?? '').localeCompare(b.period_start ?? '');
    else if (field === 'period_end') cmp = (a.period_end ?? '').localeCompare(b.period_end ?? '');
    else if (field === 'progress') cmp = Number(a.progress_pct ?? 0) - Number(b.progress_pct ?? 0);
    return dir === 'desc' ? -cmp : cmp;
  });
}

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

function SortableHeader({ label, field, current, dir, onSort, className }: {
  label: string; field: SortField; current: SortField; dir: SortDir;
  onSort: (f: SortField) => void; className?: string;
}) {
  const active = current === field;
  return (
    <button onClick={() => onSort(field)}
      className={`flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-wider hover:text-slate-700 transition ${active ? 'text-slate-700' : 'text-slate-400'} ${className ?? ''}`}>
      {label}
      {active ? (dir === 'asc' ? ' ↑' : ' ↓') : ' ↕'}
    </button>
  );
}

function GoalRow({ goal, depth, router, onAddChild }: {
  goal: OpGoal; depth: number; router: ReturnType<typeof useRouter>;
  onAddChild: (parentId: string, entity: string | null) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = (goal.children?.length ?? 0) > 0;
  const hasKrs = (goal.key_results?.length ?? 0) > 0;
  const expandable = hasChildren || hasKrs;
  const health = (goal.health_override ?? goal.health) as GoalHealth;
  const linkedTaskCount = (goal as any).linked_task_count ?? 0;

  return (
    <div className="group/row">
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
        <button onClick={() => router.push(`/console/ops/goals/${goal.id}`)}
          className="font-mono text-[10px] text-blue-600 hover:underline">{goal.goal_number}</button>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">
          {LEVEL_LABEL[goal.level] ?? `L${goal.level}`}
        </span>
        <span className="flex-1 truncate text-sm font-medium text-slate-800">{goal.title}</span>

        {/* Linked indicators */}
        {linkedTaskCount > 0 && (
          <span className="inline-flex items-center gap-0.5 rounded bg-cyan-50 px-1.5 py-0.5 text-[9px] font-bold text-cyan-600 border border-cyan-100"
            title={`${linkedTaskCount} linked task${linkedTaskCount > 1 ? 's' : ''} (OP001)`}>
            <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            {linkedTaskCount}
          </span>
        )}

        {goal.priority && goal.priority !== 'medium' && (
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${PRIORITY_COLORS[goal.priority as GoalPriority] ?? 'bg-slate-100 text-slate-500'}`}>
            {PRIORITY_LABELS[goal.priority as GoalPriority] ?? goal.priority}
          </span>
        )}
        {goal.entity && (
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${ENTITY_COLOR[goal.entity] ?? 'bg-slate-100 text-slate-500'}`}>
            {ENTITY_LABEL[goal.entity] ?? goal.entity}
          </span>
        )}
        <ProgressBar pct={Number(goal.progress_pct ?? 0)} />
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${GOAL_STATUS_COLOR[goal.status] ?? 'bg-slate-100 text-slate-500'}`}>
          {GOAL_STATUS_LABEL[goal.status] ?? goal.status}
        </span>
        {/* Start date */}
        <span className="text-[10px] text-slate-400 tabular-nums w-20 text-center">
          {goal.period_start ? goal.period_start.slice(0, 10) : '—'}
        </span>
        {/* End date */}
        <span className="text-[10px] text-slate-400 tabular-nums w-20 text-center">
          {goal.period_end ? goal.period_end.slice(0, 10) : '—'}
        </span>
        <button onClick={() => onAddChild(goal.id, goal.entity)} title="Add sub-goal"
          className="hidden group-hover/row:flex h-5 w-5 items-center justify-center rounded text-slate-300 hover:bg-emerald-50 hover:text-emerald-600 text-xs">+</button>
      </div>

      {expanded && hasKrs && (
        <div className="space-y-1 py-1">
          {goal.key_results!.map(kr => <KrRow key={kr.id} kr={kr} />)}
        </div>
      )}

      {expanded && hasChildren && (
        <div className="space-y-1 py-1">
          {goal.children!.map(child => (
            <GoalRow key={child.id} goal={child} depth={depth + 1} router={router} onAddChild={onAddChild} />
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
    { label: 'No Data', value: summary.no_data ?? 0, color: 'text-slate-600 bg-slate-50' },
    { label: 'Achieved', value: summary.achieved ?? 0, color: 'text-emerald-700 bg-emerald-50' },
    { label: 'Avg Progress', value: `${summary.avg_progress ?? 0}%`, color: 'text-slate-700 bg-slate-50' },
  ];
  return (
    <div className="grid grid-cols-7 gap-3">
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
  const [priorityFilter, setPriorityFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createParentId, setCreateParentId] = useState<string | undefined>();
  const [createEntity, setCreateEntity] = useState<string | undefined>();
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const load = useCallback(async () => {
    setLoading(true);
    const tp = new URLSearchParams({ tenant_id: String(unit.id), view: 'tree' });
    if (statusFilter) tp.set('status', statusFilter);
    if (entityFilter) tp.set('entity', entityFilter);
    if (priorityFilter) tp.set('priority', priorityFilter);

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
  }, [statusFilter, entityFilter, priorityFilter, search, unit.id]);

  useEffect(() => { void load(); }, [load]);

  const sorted = sortGoals(goals, sortField, sortDir);

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} title="Go back"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 shadow-sm">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <ScreenHeader title="Strategy Cockpit" description="OP002 — Goals, Objectives & Key Results" />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 shadow-sm"
          ><span className="text-sm leading-none">+</span> New Goal</button>
          <button onClick={() => router.push('/console/ops/tasks')}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 shadow-sm">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            OP001 Operations
          </button>
          <button
            onClick={() => router.push('/console/ops/goals/dashboard')}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 shadow-sm"
          >Exec Dashboard</button>
          <button
            onClick={() => router.push('/console/ops/goals/scorecard')}
            className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 shadow-sm"
          >Scorecards</button>
          <button
            onClick={() => router.push('/console/ops/goals/ledger')}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 shadow-sm"
          >History</button>
          <button
            onClick={() => { void load(); }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 shadow-sm"
          >Refresh</button>
        </div>
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
        <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600">
          <option value="">All priorities</option>
          {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input type="text" placeholder="Search goals..." value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') void load(); }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 placeholder-slate-400 focus:border-blue-400 focus:outline-none w-64" />
        <span className="ml-auto text-xs text-slate-400">{goals.length} top-level goals</span>
      </div>

      {/* Column headers */}
      <div className="flex items-center gap-3 rounded-t-xl border border-slate-100 bg-slate-50 px-3 py-2">
        <span className="w-5" />
        <span className="w-2.5" />
        <span className="w-14 text-[10px] font-bold uppercase tracking-wider text-slate-400">ID</span>
        <span className="w-16 text-[10px] font-bold uppercase tracking-wider text-slate-400">Type</span>
        <span className="flex-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Title</span>
        <span className="w-12 text-[10px] font-bold uppercase tracking-wider text-slate-400 text-center">Links</span>
        <span className="w-16 text-[10px] font-bold uppercase tracking-wider text-slate-400 text-center">Entity</span>
        <SortableHeader label="Progress" field="progress" current={sortField} dir={sortDir} onSort={handleSort} className="w-24" />
        <SortableHeader label="Status" field="status" current={sortField} dir={sortDir} onSort={handleSort} className="w-16" />
        <SortableHeader label="Start" field="period_start" current={sortField} dir={sortDir} onSort={handleSort} className="w-20 justify-center" />
        <SortableHeader label="End" field="period_end" current={sortField} dir={sortDir} onSort={handleSort} className="w-20 justify-center" />
        <span className="w-5" />
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center text-sm text-slate-400">Loading goals...</div>
      ) : goals.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center gap-3 text-sm text-slate-400">
          <span>No goals found. Create your first goal to get started.</span>
          <button onClick={() => setShowCreate(true)}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 shadow-sm">
            + Create First Goal
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map(g => <GoalRow key={g.id} goal={g} depth={0} router={router}
            onAddChild={(pid, ent) => { setCreateParentId(pid); setCreateEntity(ent ?? undefined); setShowCreate(true); }} />)}
        </div>
      )}

      {showCreate && <GoalFormModal tenantId={unit.id}
        defaultParentId={createParentId} defaultEntity={createEntity}
        onClose={() => { setShowCreate(false); setCreateParentId(undefined); setCreateEntity(undefined); }}
        onCreated={() => void load()} />}
    </div>
  );
}

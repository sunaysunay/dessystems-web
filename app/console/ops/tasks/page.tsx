'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useScope } from '@/lib/scope-context';

const STATUS_COLOR: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  waiting_input: 'bg-purple-100 text-purple-700',
  waiting_approval: 'bg-indigo-100 text-indigo-700',
  blocked: 'bg-red-100 text-red-700',
  done: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-slate-200 text-slate-500',
};

const STATUS_LABEL: Record<string, string> = {
  open: 'Open', in_progress: 'In Progress', waiting_input: 'Waiting Input',
  waiting_approval: 'Waiting Approval', blocked: 'Blocked', done: 'Done', cancelled: 'Cancelled',
};

const PRIORITY_LABEL: Record<number, string> = { 1: 'Low', 2: 'Normal', 3: 'High', 4: 'Urgent' };
const PRIORITY_COLOR: Record<number, string> = {
  1: 'bg-slate-100 text-slate-500', 2: 'bg-blue-50 text-blue-600',
  3: 'bg-orange-100 text-orange-700', 4: 'bg-red-100 text-red-700',
};

const ESCALATION_COLOR: Record<number, string> = {
  0: '', 1: 'border-l-4 border-l-amber-400', 2: 'border-l-4 border-l-orange-500', 3: 'border-l-4 border-l-red-600',
};

const STATUS_TABS = [
  { label: 'All', value: '' },
  { label: 'Open', value: 'open' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Waiting', value: 'waiting_input' },
  { label: 'Blocked', value: 'blocked' },
  { label: 'Done', value: 'done' },
];

interface Task {
  id: string;
  task_number: string;
  title: string;
  description: string | null;
  status: string;
  priority: number;
  assignee_id: string | null;
  department_id: string | null;
  due_at: string | null;
  sla_due_at: string | null;
  escalation_level: number;
  ref_object_type: string | null;
  ref_object_label: string | null;
  created_at: string;
}

interface Summary {
  open: number;
  due_today: number;
  overdue: number;
  waiting_input: number;
  waiting_approval: number;
  blocked: number;
  completed_today: number;
  sla_at_risk: number;
}

type SortField = 'task_number' | 'title' | 'priority' | 'status' | 'due_at' | 'sla_due_at' | 'created_at';

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`rounded-xl border px-4 py-3 ${color}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-[10px] font-semibold uppercase tracking-wider opacity-70">{label}</div>
    </div>
  );
}

function SortableCol({ label, field, current, dir, onSort }: {
  label: string; field: SortField; current: SortField; dir: 'asc' | 'desc';
  onSort: (f: SortField) => void;
}) {
  const active = current === field;
  return (
    <th className="px-4 py-2.5">
      <button onClick={() => onSort(field)}
        className={`flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-widest hover:text-slate-700 transition ${active ? 'text-slate-700' : 'text-slate-400'}`}>
        {label}
        {active ? (dir === 'asc' ? ' ↑' : ' ↓') : ' ↕'}
      </button>
    </th>
  );
}

export default function OP001Page() {
  const router = useRouter();
  const { unit } = useScope();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [toast, setToast] = useState('');
  const [sortField, setSortField] = useState<SortField>('sla_due_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const pageSize = 50;
  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 2500); }

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
    setPage(1);
  };

  const loadSummary = useCallback(async () => {
    try {
      const j = await fetch(`/api/bop/ops/tasks?view=cockpit-summary&tenant_id=${unit.id}`).then(r => r.json());
      setSummary(j.summary ?? null);
    } catch { /* summary is non-critical */ }
  }, [unit.id]);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      p.set('tenant_id', String(unit.id));
      if (statusFilter) p.set('status', statusFilter);
      if (search) p.set('search', search);
      p.set('page', String(page));
      p.set('page_size', String(pageSize));
      p.set('sort', sortField);
      p.set('sort_dir', sortDir);
      const j = await fetch(`/api/bop/ops/tasks?${p}`).then(r => r.json());
      setTasks(j.tasks ?? []);
      setTotal(j.total ?? 0);
    } catch { /* handled by empty state */ }
    setLoading(false);
  }, [statusFilter, search, page, unit.id, sortField, sortDir]);

  useEffect(() => { void loadSummary(); }, [loadSummary]);
  useEffect(() => { void loadTasks(); }, [loadTasks]);

  const transition = async (taskId: string, toStatus: string) => {
    const res = await fetch('/api/bop/ops/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'transition', task_id: taskId, status: toStatus, tenant_id: unit.id }),
    }).then(r => r.json());
    if (res.error) { showToast(`Error: ${res.error}`); return; }
    showToast(`Moved to ${STATUS_LABEL[toStatus] ?? toStatus}`);
    void loadTasks();
    void loadSummary();
  };

  const urgencyBand = (task: Task): 'overdue' | 'today' | 'upcoming' | 'normal' => {
    if (!task.due_at) return 'normal';
    const d = new Date(task.due_at);
    const now = new Date();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const tomorrowEnd = new Date(todayEnd.getTime() + 86400000);
    if (d < now) return 'overdue';
    if (d < todayEnd) return 'today';
    if (d < tomorrowEnd) return 'upcoming';
    return 'normal';
  };

  const bandBg: Record<string, string> = {
    overdue: 'bg-red-50/50', today: 'bg-amber-50/30', upcoming: '', normal: '',
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-4 p-6">
      {toast && <div className="fixed top-5 right-5 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-xl">{toast}</div>}

      <div className="flex items-center justify-end gap-2">
        <button onClick={() => router.push('/console/ops/goals')}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 shadow-sm">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
          OP002 Strategy
        </button>
        <button onClick={() => { void loadTasks(); void loadSummary(); showToast('Refreshed'); }}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 shadow-sm">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          Refresh
        </button>
      </div>

      {/* 8-card stat strip */}
      {summary && (
        <div className="grid grid-cols-4 gap-3 lg:grid-cols-8">
          <StatCard label="Open" value={summary.open} color="border-blue-200 bg-blue-50 text-blue-800" />
          <StatCard label="Due Today" value={summary.due_today} color="border-amber-200 bg-amber-50 text-amber-800" />
          <StatCard label="Overdue" value={summary.overdue} color="border-red-200 bg-red-50 text-red-800" />
          <StatCard label="Waiting Input" value={summary.waiting_input} color="border-purple-200 bg-purple-50 text-purple-800" />
          <StatCard label="Waiting Approval" value={summary.waiting_approval} color="border-indigo-200 bg-indigo-50 text-indigo-800" />
          <StatCard label="Blocked" value={summary.blocked} color="border-red-200 bg-red-50/70 text-red-700" />
          <StatCard label="Done Today" value={summary.completed_today} color="border-emerald-200 bg-emerald-50 text-emerald-800" />
          <StatCard label="SLA At Risk" value={summary.sla_at_risk} color="border-orange-200 bg-orange-50 text-orange-800" />
        </div>
      )}

      {/* Status tabs + search */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1">
          {STATUS_TABS.map(t => (
            <button key={t.value} onClick={() => { setStatusFilter(t.value); setPage(1); }}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                statusFilter === t.value ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
        <input type="text" placeholder="Search task number, title..." value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { setPage(1); void loadTasks(); } }}
          className="ml-auto rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 placeholder-slate-400 focus:border-blue-400 focus:outline-none w-64"
        />
        <span className="text-xs text-slate-400">{total} tasks</span>
      </div>

      {/* Work queue */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {loading ? (
          <div className="flex h-40 items-center justify-center text-sm text-slate-400">Loading...</div>
        ) : tasks.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-slate-400">No tasks found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-left">
                  <SortableCol label="No." field="task_number" current={sortField} dir={sortDir} onSort={handleSort} />
                  <SortableCol label="Title" field="title" current={sortField} dir={sortDir} onSort={handleSort} />
                  <SortableCol label="Priority" field="priority" current={sortField} dir={sortDir} onSort={handleSort} />
                  <SortableCol label="Status" field="status" current={sortField} dir={sortDir} onSort={handleSort} />
                  <SortableCol label="Due" field="due_at" current={sortField} dir={sortDir} onSort={handleSort} />
                  <SortableCol label="SLA" field="sla_due_at" current={sortField} dir={sortDir} onSort={handleSort} />
                  <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Linked</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {tasks.map(t => {
                  const band = urgencyBand(t);
                  return (
                    <tr key={t.id} className={`hover:bg-slate-50 transition-colors ${bandBg[band]} ${ESCALATION_COLOR[t.escalation_level] ?? ''}`}>
                      <td className="px-4 py-2.5 font-mono text-xs">
                        <button onClick={() => router.push(`/console/ops/tasks/${t.id}`)}
                          className="text-blue-600 hover:text-blue-800 hover:underline font-medium">
                          {t.task_number}
                        </button>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-slate-800 max-w-xs truncate">{t.title}</div>
                        {t.description && <div className="text-xs text-slate-400 max-w-xs truncate">{t.description}</div>}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${PRIORITY_COLOR[t.priority]}`}>
                          {PRIORITY_LABEL[t.priority]}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_COLOR[t.status]}`}>
                          {STATUS_LABEL[t.status] ?? t.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">
                        {t.due_at ? (
                          <span className={band === 'overdue' ? 'font-bold text-red-600' : band === 'today' ? 'font-semibold text-amber-600' : ''}>
                            {new Date(t.due_at).toLocaleDateString()}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">
                        {t.sla_due_at ? new Date(t.sla_due_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">
                        {t.ref_object_type ? (
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                            {t.ref_object_type}{t.ref_object_label ? `: ${t.ref_object_label}` : ''}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex gap-1">
                          {t.status === 'open' && (
                            <button onClick={() => void transition(t.id, 'in_progress')}
                              className="rounded bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 hover:bg-amber-100">
                              Start
                            </button>
                          )}
                          {t.status === 'in_progress' && (
                            <button onClick={() => void transition(t.id, 'done')}
                              className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-100">
                              Done
                            </button>
                          )}
                          {!['done', 'cancelled'].includes(t.status) && (
                            <button onClick={() => void transition(t.id, 'cancelled')}
                              className="rounded bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-500 hover:bg-slate-100">
                              Cancel
                            </button>
                          )}
                          {t.status === 'done' && (
                            <button onClick={() => void transition(t.id, 'open')}
                              className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 hover:bg-blue-100">
                              Reopen
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">Page {page} of {totalPages}</span>
          <div className="flex gap-1">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40">
              Prev
            </button>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40">
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

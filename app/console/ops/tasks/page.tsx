'use client';
import { useState, useEffect, useCallback } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import { useScope } from '@/lib/scope-context';
import {
  STATUS_COLOR, STATUS_LABEL, PRIORITY_LABEL, PRIORITY_COLOR,
  ESCALATION_COLOR, urgencyBand, URGENCY_BG,
  type OpTask, type CockpitSummary,
} from './ops-task-ui';

const STATUS_TABS = [
  { label: 'All', value: '' },
  { label: 'Open', value: 'open' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Waiting', value: 'waiting_input' },
  { label: 'Blocked', value: 'blocked' },
  { label: 'Done', value: 'done' },
];

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`rounded-xl border px-4 py-3 ${color}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-[10px] font-semibold uppercase tracking-wider opacity-70">{label}</div>
    </div>
  );
}

const TH = 'px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400';

function TaskRow({ t, onTransition }: { t: OpTask; onTransition: (id: string, s: string) => void }) {
  const band = urgencyBand(t);
  return (
    <tr className={`hover:bg-slate-50 transition-colors ${URGENCY_BG[band]} ${ESCALATION_COLOR[t.escalation_level] ?? ''}`}>
      <td className="px-4 py-2.5 font-mono text-xs text-slate-400">{t.task_number}</td>
      <td className="px-4 py-2.5">
        <div className="font-medium text-slate-800 max-w-xs truncate">{t.title}</div>
        {t.description && <div className="text-xs text-slate-400 max-w-xs truncate">{t.description}</div>}
      </td>
      <td className="px-4 py-2.5">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${PRIORITY_COLOR[t.priority]}`}>{PRIORITY_LABEL[t.priority]}</span>
      </td>
      <td className="px-4 py-2.5">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_COLOR[t.status]}`}>{STATUS_LABEL[t.status] ?? t.status}</span>
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
          {t.status === 'open' && <button onClick={() => void onTransition(t.id, 'in_progress')} className="rounded bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 hover:bg-amber-100">Start</button>}
          {t.status === 'in_progress' && <button onClick={() => void onTransition(t.id, 'done')} className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-100">Done</button>}
          {!['done', 'cancelled'].includes(t.status) && <button onClick={() => void onTransition(t.id, 'cancelled')} className="rounded bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-500 hover:bg-slate-100">Cancel</button>}
          {t.status === 'done' && <button onClick={() => void onTransition(t.id, 'open')} className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 hover:bg-blue-100">Reopen</button>}
        </div>
      </td>
    </tr>
  );
}

export default function OP001Page() {
  const { unit } = useScope();
  const [tasks, setTasks] = useState<OpTask[]>([]);
  const [summary, setSummary] = useState<CockpitSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [toast, setToast] = useState('');
  const pageSize = 50;
  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 2500); }

  const loadSummary = useCallback(async () => {
    const j = await fetch(`/api/bop/ops/tasks?view=cockpit-summary&tenant_id=${unit.id}`).then(r => r.json());
    setSummary(j.summary ?? null);
  }, [unit.id]);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    p.set('tenant_id', String(unit.id));
    if (statusFilter) p.set('status', statusFilter);
    if (search) p.set('search', search);
    p.set('page', String(page));
    p.set('page_size', String(pageSize));
    p.set('sort', 'sla_due_at');
    p.set('sort_dir', 'asc');
    const j = await fetch(`/api/bop/ops/tasks?${p}`).then(r => r.json());
    setTasks(j.tasks ?? []);
    setTotal(j.total ?? 0);
    setLoading(false);
  }, [statusFilter, search, page, unit.id]);

  useEffect(() => { void loadSummary(); }, [loadSummary]);
  useEffect(() => { void loadTasks(); }, [loadTasks]);

  const transition = async (taskId: string, toStatus: string) => {
    const res = await fetch('/api/bop/ops/tasks', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'transition', task_id: taskId, status: toStatus, tenant_id: unit.id }),
    }).then(r => r.json());
    if (res.error) { showToast(`Error: ${res.error}`); return; }
    showToast(`Moved to ${STATUS_LABEL[toStatus] ?? toStatus}`);
    void loadTasks();
    void loadSummary();
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-4 p-6">
      {toast && <div className="fixed top-5 right-5 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-xl">{toast}</div>}

      <div className="flex items-center justify-between">
        <ScreenHeader title="Operations Cockpit" description="OP001 — Task management & SLA monitoring" />
        <button onClick={() => { void loadTasks(); void loadSummary(); showToast('Refreshed'); }}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 shadow-sm">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          Refresh
        </button>
      </div>

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

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1">
          {STATUS_TABS.map(t => (
            <button key={t.value} onClick={() => { setStatusFilter(t.value); setPage(1); }}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${statusFilter === t.value ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <input type="text" placeholder="Search task number, title..." value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { setPage(1); void loadTasks(); } }}
          className="ml-auto rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 placeholder-slate-400 focus:border-blue-400 focus:outline-none w-64" />
        <span className="text-xs text-slate-400">{total} tasks</span>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {loading ? (
          <div className="flex h-40 items-center justify-center text-sm text-slate-400">Loading...</div>
        ) : tasks.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-slate-400">No tasks found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-100 bg-slate-50/50 text-left">
                {['No.','Title','Priority','Status','Due','SLA','Linked','Actions'].map(h => <th key={h} className={TH}>{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-slate-50">
                {tasks.map(t => <TaskRow key={t.id} t={t} onTransition={(id, s) => void transition(id, s)} />)}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">Page {page} of {totalPages}</span>
          <div className="flex gap-1">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40">Prev</button>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}

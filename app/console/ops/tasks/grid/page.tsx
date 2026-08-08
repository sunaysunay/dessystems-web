'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ScreenHeader } from '@/components/ScreenBadge';
import { useScope } from '@/lib/scope-context';
import {
  STATUS_COLOR, STATUS_LABEL, PRIORITY_LABEL, PRIORITY_COLOR,
  type OpTask,
} from '../ops-task-ui';

type SortKey = 'task_number' | 'title' | 'priority' | 'status' | 'due_at' | 'sla_due_at' | 'created_at';
type SortDir = 'asc' | 'desc';

function BulkBar({ count, saving, onAction }: {
  count: number; saving: boolean;
  onAction: (action: string, payload?: Record<string, unknown>) => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2">
      <span className="text-xs font-bold text-blue-700">{count} selected</span>
      <div className="ml-auto flex gap-1.5">
        <button disabled={saving} onClick={() => onAction('transition', { status: 'in_progress' })}
          className="rounded-lg bg-amber-100 px-2.5 py-1 text-[10px] font-semibold text-amber-700 hover:bg-amber-200 disabled:opacity-40">Start All</button>
        <button disabled={saving} onClick={() => onAction('transition', { status: 'done' })}
          className="rounded-lg bg-emerald-100 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-200 disabled:opacity-40">Done All</button>
        <button disabled={saving} onClick={() => onAction('transition', { status: 'cancelled' })}
          className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500 hover:bg-slate-200 disabled:opacity-40">Cancel All</button>
        <button disabled={saving} onClick={() => onAction('priority', { priority: 4 })}
          className="rounded-lg bg-red-100 px-2.5 py-1 text-[10px] font-semibold text-red-700 hover:bg-red-200 disabled:opacity-40">Urgent</button>
        <button disabled={saving} onClick={() => onAction('priority', { priority: 1 })}
          className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500 hover:bg-slate-200 disabled:opacity-40">Low</button>
      </div>
    </div>
  );
}

const TH = 'px-3 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 cursor-pointer select-none hover:text-slate-600';

export default function TaskGridPage() {
  const { unit } = useScope();
  const router = useRouter();
  const [tasks, setTasks] = useState<OpTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 100;

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 2500); }

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    p.set('tenant_id', String(unit.id));
    if (statusFilter) p.set('status', statusFilter);
    if (search) p.set('search', search);
    p.set('page', String(page));
    p.set('page_size', String(pageSize));
    p.set('sort', sortKey);
    p.set('sort_dir', sortDir);
    const j = await fetch(`/api/bop/ops/tasks?${p}`).then(r => r.json());
    setTasks(j.tasks ?? []);
    setTotal(j.total ?? 0);
    setSelected(new Set());
    setLoading(false);
  }, [statusFilter, search, page, sortKey, sortDir, unit.id]);

  useEffect(() => { void load(); }, [load]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir(key === 'created_at' ? 'desc' : 'asc'); }
  }

  function toggleSelect(id: string) {
    setSelected(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }

  function toggleAll() {
    if (selected.size === tasks.length) setSelected(new Set());
    else setSelected(new Set(tasks.map(t => t.id)));
  }

  async function bulkAction(action: string, payload?: Record<string, unknown>) {
    const ids = [...selected];
    if (!ids.length) return;
    setSaving(true);
    if (action === 'transition') {
      await fetch('/api/bop/ops/tasks', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'bulk_update', task_ids: ids, updates: { status: payload?.status }, tenant_id: unit.id }),
      });
      showToast(`${ids.length} tasks → ${STATUS_LABEL[payload?.status as string] ?? payload?.status}`);
    } else if (action === 'priority') {
      await fetch('/api/bop/ops/tasks', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'bulk_update', task_ids: ids, updates: { priority: payload?.priority }, tenant_id: unit.id }),
      });
      showToast(`${ids.length} tasks → priority ${PRIORITY_LABEL[payload?.priority as number] ?? payload?.priority}`);
    }
    setSaving(false);
    void load();
  }

  const totalPages = Math.ceil(total / pageSize);
  const arrow = (col: SortKey) => sortKey === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  return (
    <div className="space-y-4 p-6">
      {toast && <div className="fixed top-5 right-5 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-xl">{toast}</div>}

      <div className="flex items-center justify-between">
        <ScreenHeader title="Task Grid" description="OP001 — Sortable grid with bulk actions" />
        <div className="flex gap-2">
          <button onClick={() => router.push('/console/ops/tasks')}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 shadow-sm">Cockpit View</button>
          <button onClick={() => { void load(); showToast('Refreshed'); }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 shadow-sm">Refresh</button>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600">
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input type="text" placeholder="Search..." value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { setPage(1); void load(); } }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 placeholder-slate-400 focus:border-blue-400 focus:outline-none w-64" />
        <span className="ml-auto text-xs text-slate-400">{total} tasks</span>
      </div>

      {selected.size > 0 && <BulkBar count={selected.size} saving={saving} onAction={(a, p) => void bulkAction(a, p)} />}

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {loading ? (
          <div className="flex h-40 items-center justify-center text-sm text-slate-400">Loading...</div>
        ) : tasks.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-slate-400">No tasks found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-100 bg-slate-50/50 text-left">
                <th className="px-3 py-2.5 w-8">
                  <input type="checkbox" checked={selected.size === tasks.length && tasks.length > 0}
                    onChange={toggleAll} className="h-3.5 w-3.5 rounded border-slate-300" />
                </th>
                <th className={TH} onClick={() => toggleSort('task_number')}>No.{arrow('task_number')}</th>
                <th className={TH} onClick={() => toggleSort('title')}>Title{arrow('title')}</th>
                <th className={TH} onClick={() => toggleSort('priority')}>Priority{arrow('priority')}</th>
                <th className={TH} onClick={() => toggleSort('status')}>Status{arrow('status')}</th>
                <th className={TH} onClick={() => toggleSort('due_at')}>Due{arrow('due_at')}</th>
                <th className={TH} onClick={() => toggleSort('sla_due_at')}>SLA{arrow('sla_due_at')}</th>
                <th className={TH} onClick={() => toggleSort('created_at')}>Created{arrow('created_at')}</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-50">
                {tasks.map(t => (
                  <tr key={t.id} className={`hover:bg-slate-50 transition-colors ${selected.has(t.id) ? 'bg-blue-50/50' : ''}`}>
                    <td className="px-3 py-2">
                      <input type="checkbox" checked={selected.has(t.id)} onChange={() => toggleSelect(t.id)}
                        className="h-3.5 w-3.5 rounded border-slate-300" />
                    </td>
                    <td className="px-3 py-2">
                      <button onClick={() => router.push(`/console/ops/tasks/${t.id}`)}
                        className="font-mono text-xs text-blue-600 hover:underline">{t.task_number}</button>
                    </td>
                    <td className="px-3 py-2 max-w-xs truncate text-slate-800">{t.title}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${PRIORITY_COLOR[t.priority]}`}>{PRIORITY_LABEL[t.priority]}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_COLOR[t.status]}`}>{STATUS_LABEL[t.status]}</span>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-500">{t.due_at ? new Date(t.due_at).toLocaleDateString() : '—'}</td>
                    <td className="px-3 py-2 text-xs text-slate-500">{t.sla_due_at ? new Date(t.sla_due_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                    <td className="px-3 py-2 text-xs text-slate-400">{new Date(t.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
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

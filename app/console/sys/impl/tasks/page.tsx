'use client';
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ScreenHeader } from '@/components/ScreenBadge';

interface Task {
  task_id: string;
  phase_id: string;
  title: Record<string, string>;
  task_type: string;
  blocked_reason: string | null;
  estimate_hours: number | null;
  spec_ref: string | null;
  total_deliverables: number;
  verified_deliverables: number;
  derived_status: string;
  pct: number;
}

interface Deliverable {
  id: string;
  task_id: string;
  kind: string;
  ref: string;
  verify_mode: string;
  sort_order: number;
  is_verified: boolean;
  verified_at: string | null;
  verify_error: string | null;
}

interface Event {
  id: string;
  actor: string;
  event: string;
  created_at: string;
}

const STATUS_CHIP: Record<string, string> = {
  draft:       'bg-slate-100 text-slate-600',
  active:      'bg-emerald-50 text-emerald-700',
  not_started: 'bg-slate-100 text-slate-500',
  in_progress: 'bg-blue-50 text-blue-700',
  verified:    'bg-emerald-50 text-emerald-700',
  blocked:     'bg-red-50 text-red-600',
};

const TASK_TYPE_CHIP: Record<string, string> = {
  screen:      'bg-violet-50 text-violet-700',
  api:         'bg-blue-50 text-blue-700',
  schema:      'bg-amber-50 text-amber-700',
  integration: 'bg-cyan-50 text-cyan-700',
  compliance:  'bg-red-50 text-red-600',
  infra:       'bg-slate-100 text-slate-600',
  docs:        'bg-emerald-50 text-emerald-700',
  general:     'bg-slate-100 text-slate-500',
};

const KIND_CHIP: Record<string, string> = {
  SCREEN:          'bg-violet-50 text-violet-700',
  MENU_NODE:       'bg-indigo-50 text-indigo-700',
  DB_TABLE:        'bg-amber-50 text-amber-700',
  RLS_POLICY:      'bg-red-50 text-red-600',
  API_ROUTE:       'bg-blue-50 text-blue-700',
  PERMISSION:      'bg-orange-50 text-orange-700',
  I18N_KEY:        'bg-emerald-50 text-emerald-700',
  HELP_DOC:        'bg-teal-50 text-teal-700',
  EMAIL_TEMPLATE:  'bg-pink-50 text-pink-700',
  TELEGRAM_ALERT:  'bg-sky-50 text-sky-700',
  TEST:            'bg-lime-50 text-lime-700',
  MIGRATION:       'bg-yellow-50 text-yellow-700',
  SMOKE_CHECK:     'bg-slate-100 text-slate-600',
  CUSTOM:          'bg-slate-100 text-slate-500',
};

const DELIVERABLE_KINDS = [
  'SCREEN', 'MENU_NODE', 'DB_TABLE', 'RLS_POLICY', 'API_ROUTE',
  'PERMISSION', 'I18N_KEY', 'HELP_DOC', 'EMAIL_TEMPLATE',
  'TELEGRAM_ALERT', 'TEST', 'MIGRATION', 'SMOKE_CHECK', 'CUSTOM',
] as const;

function t(obj: Record<string, string> | string | null | undefined): string {
  if (!obj) return '—';
  if (typeof obj === 'string') return obj;
  return obj.en || obj.nl || obj.de || Object.values(obj)[0] || '—';
}

function ProgressBar({ pct }: { pct: number }) {
  const color = pct === 100 ? 'bg-emerald-500' : pct > 50 ? 'bg-blue-500' : pct > 0 ? 'bg-amber-400' : 'bg-slate-200';
  return (
    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
      <div className={`h-2 rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function SY053Page() {
  const searchParams = useSearchParams();
  const taskId = searchParams.get('task_id');

  const [task, setTask] = useState<Task | null>(null);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [toast, setToast] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [formKind, setFormKind] = useState<string>('SCREEN');
  const [formRef, setFormRef] = useState('');
  const [formMode, setFormMode] = useState<'auto' | 'manual'>('auto');
  const [formSort, setFormSort] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const loadTask = useCallback(async () => {
    if (!taskId) return;
    const res = await fetch(`/api/bop/sys/impl?scope=tasks&task_id=${taskId}`);
    const data = await res.json();
    const tasks = data.tasks ?? [];
    if (tasks.length > 0) setTask(tasks[0]);
  }, [taskId]);

  const loadDeliverables = useCallback(async () => {
    if (!taskId) return;
    const res = await fetch(`/api/bop/sys/impl?scope=deliverables&task_id=${taskId}`);
    const { deliverables: data } = await res.json();
    setDeliverables(data ?? []);
  }, [taskId]);

  const loadEvents = useCallback(async () => {
    if (!taskId) return;
    const res = await fetch(`/api/bop/sys/impl?scope=events&task_id=${taskId}`);
    const { events: data } = await res.json();
    setEvents(data ?? []);
  }, [taskId]);

  useEffect(() => {
    if (!taskId) { setLoading(false); return; }
    setLoading(true);
    Promise.all([loadTask(), loadDeliverables(), loadEvents()]).finally(() => setLoading(false));
  }, [taskId, loadTask, loadDeliverables, loadEvents]);

  const verifyTask = async () => {
    if (!taskId) return;
    setVerifying(true);
    try {
      const res = await fetch('/api/bop/sys/impl/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: taskId }),
      });
      const { verified, total } = await res.json();
      showToast(`Verified: ${verified}/${total} deliverables`);
      await Promise.all([loadTask(), loadDeliverables(), loadEvents()]);
    } finally {
      setVerifying(false);
    }
  };

  const addDeliverable = async () => {
    if (!taskId || !formRef.trim()) return;
    setSubmitting(true);
    try {
      await fetch('/api/bop/sys/impl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upsert_deliverable',
          task_id: taskId,
          kind: formKind,
          ref: formRef.trim(),
          verify_mode: formMode,
          sort_order: formSort,
        }),
      });
      showToast('Deliverable added');
      setFormRef('');
      setFormSort(0);
      await Promise.all([loadDeliverables(), loadTask()]);
    } finally {
      setSubmitting(false);
    }
  };

  const deleteDeliverable = async (id: string) => {
    if (!confirm('Delete this deliverable?')) return;
    await fetch('/api/bop/sys/impl', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_deliverable', id }),
    });
    showToast('Deliverable deleted');
    await Promise.all([loadDeliverables(), loadTask()]);
  };

  if (!taskId) {
    return (
      <div className="space-y-6 p-6">
        <ScreenHeader title="Task Detail" description="View task details, deliverables and events — SY053" />
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
          No task_id provided.{' '}
          <Link href="/console/sys/impl" className="text-blue-500 hover:underline">Back to Implementation Cockpit</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <ScreenHeader title="Task Detail" description="View task details, deliverables and events — SY053" />

      {toast && (
        <div className="fixed top-4 right-4 z-50 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}

      {/* Back link */}
      <div>
        <Link href="/console/sys/impl" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 hover:underline">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to Implementation Cockpit
        </Link>
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">Loading...</div>
      ) : !task ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">Task not found.</div>
      ) : (
        <>
          {/* Task Header */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-700">Task Information</h2>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-base font-semibold text-slate-800">{t(task.title)}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${TASK_TYPE_CHIP[task.task_type] ?? TASK_TYPE_CHIP.general}`}>
                  {task.task_type}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_CHIP[task.derived_status] ?? STATUS_CHIP.not_started}`}>
                  {task.derived_status?.replace('_', ' ')}
                </span>
              </div>

              <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
                <span>Task ID: <span className="font-mono text-slate-600">{task.task_id}</span></span>
                {task.estimate_hours != null && (
                  <span>Estimate: <span className="font-semibold text-slate-600">{task.estimate_hours}h</span></span>
                )}
                {task.spec_ref && (
                  <span>Spec: <span className="font-mono text-slate-600">{task.spec_ref}</span></span>
                )}
                <span>Deliverables: <span className="font-semibold text-slate-600">{task.verified_deliverables}/{task.total_deliverables} verified</span></span>
              </div>

              {task.blocked_reason && (
                <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-600">
                  <span className="font-semibold">Blocked:</span> {task.blocked_reason}
                </div>
              )}

              <div className="flex items-center gap-3 max-w-xs">
                <ProgressBar pct={task.pct} />
                <span className="text-sm font-semibold text-slate-600">{task.pct}%</span>
              </div>
            </div>
          </div>

          {/* Deliverables Table */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-700">Deliverables</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">
                  {deliverables.filter(d => d.is_verified).length}/{deliverables.length} verified
                </span>
                <button
                  onClick={verifyTask}
                  disabled={verifying}
                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                >
                  {verifying ? 'Verifying...' : 'Re-verify'}
                </button>
              </div>
            </div>
            {deliverables.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-400">No deliverables defined for this task</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-400">
                  <tr>
                    <th className="px-4 py-2 text-left">Kind</th>
                    <th className="px-4 py-2 text-left">Reference</th>
                    <th className="px-4 py-2 text-center">Mode</th>
                    <th className="px-4 py-2 text-center">Status</th>
                    <th className="px-4 py-2 text-right">Verified At</th>
                    <th className="px-4 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {deliverables.map(d => (
                    <tr key={d.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${KIND_CHIP[d.kind] ?? KIND_CHIP.CUSTOM}`}>
                          {d.kind}
                        </span>
                      </td>
                      <td className="px-4 py-2 font-mono text-xs text-slate-700">{d.ref}</td>
                      <td className="px-4 py-2 text-center">
                        <span className={`text-[10px] font-medium ${d.verify_mode === 'auto' ? 'text-blue-500' : 'text-slate-400'}`}>
                          {d.verify_mode}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        {d.is_verified ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            Verified
                          </span>
                        ) : d.verify_error ? (
                          <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600" title={d.verify_error}>
                            Error
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right text-xs text-slate-400">
                        {d.verified_at ? new Date(d.verified_at).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => verifyTask()}
                            disabled={verifying}
                            className="rounded border border-slate-200 px-2 py-1 text-[10px] font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                          >
                            Verify
                          </button>
                          <button
                            onClick={() => deleteDeliverable(d.id)}
                            className="rounded border border-red-100 p-1 text-red-400 hover:bg-red-50 hover:text-red-600"
                            title="Delete deliverable"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Add Deliverable Form */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <button
              onClick={() => setFormOpen(!formOpen)}
              className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors"
            >
              <h2 className="text-sm font-semibold text-slate-700">Add Deliverable</h2>
              <svg
                className={`h-4 w-4 text-slate-400 transition-transform ${formOpen ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {formOpen && (
              <div className="border-t border-slate-100 p-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {/* Kind */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">Kind</label>
                    <select
                      value={formKind}
                      onChange={e => setFormKind(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-300"
                    >
                      {DELIVERABLE_KINDS.map(k => (
                        <option key={k} value={k}>{k}</option>
                      ))}
                    </select>
                  </div>

                  {/* Ref */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">Reference</label>
                    <input
                      type="text"
                      value={formRef}
                      onChange={e => setFormRef(e.target.value)}
                      placeholder="e.g. SY053, users, /api/bop/..."
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-300"
                    />
                  </div>

                  {/* Verify Mode */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">Verify Mode</label>
                    <div className="flex items-center gap-4 pt-2">
                      <label className="flex items-center gap-1.5 text-sm text-slate-600 cursor-pointer">
                        <input
                          type="radio"
                          name="verify_mode"
                          value="auto"
                          checked={formMode === 'auto'}
                          onChange={() => setFormMode('auto')}
                          className="text-blue-500"
                        />
                        Auto
                      </label>
                      <label className="flex items-center gap-1.5 text-sm text-slate-600 cursor-pointer">
                        <input
                          type="radio"
                          name="verify_mode"
                          value="manual"
                          checked={formMode === 'manual'}
                          onChange={() => setFormMode('manual')}
                          className="text-blue-500"
                        />
                        Manual
                      </label>
                    </div>
                  </div>

                  {/* Sort Order */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">Sort Order</label>
                    <input
                      type="number"
                      value={formSort}
                      onChange={e => setFormSort(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-300"
                    />
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    onClick={addDeliverable}
                    disabled={submitting || !formRef.trim()}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submitting ? 'Adding...' : 'Add Deliverable'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Event Log */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-700">Event Log</h2>
              <span className="text-xs text-slate-400">{events.length} events</span>
            </div>
            {events.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-400">No events recorded</div>
            ) : (
              <div className="divide-y divide-slate-50 max-h-80 overflow-y-auto">
                {events.map(ev => (
                  <div key={ev.id} className="flex items-start gap-3 px-4 py-2.5 hover:bg-slate-50">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">
                      {(ev.actor || '?')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-semibold text-slate-600">{ev.actor}</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(ev.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">{ev.event}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

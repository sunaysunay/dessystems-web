'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ScreenHeader } from '@/components/ScreenBadge';
import { useScope } from '@/lib/scope-context';

const STATUS_COLOR: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700', in_progress: 'bg-amber-100 text-amber-700',
  waiting_input: 'bg-purple-100 text-purple-700', waiting_approval: 'bg-indigo-100 text-indigo-700',
  blocked: 'bg-red-100 text-red-700', done: 'bg-emerald-100 text-emerald-700',
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

const VALID_TRANSITIONS: Record<string, string[]> = {
  open: ['in_progress', 'waiting_input', 'waiting_approval', 'blocked', 'cancelled'],
  in_progress: ['open', 'waiting_input', 'waiting_approval', 'blocked', 'done', 'cancelled'],
  waiting_input: ['open', 'in_progress', 'blocked', 'cancelled'],
  waiting_approval: ['in_progress', 'done', 'cancelled'],
  blocked: ['open', 'in_progress', 'cancelled'],
  done: ['open'],
  cancelled: ['open'],
};

const EVENT_ICON: Record<string, string> = {
  created: '🆕', status_changed: '🔄', assigned: '👤', priority_changed: '⚡',
  sla_warning: '⚠️', sla_breached: '🚨', escalated: '📢', commented: '💬',
  attachment_added: '📎', checklist_toggled: '✅', snoozed: '😴', closed: '🏁',
};

interface ChecklistItem { label: string; done: boolean }

function InlineEdit({ value, field, type, onSave, options }: {
  value: string; field: string; type?: 'text' | 'textarea' | 'date' | 'select';
  onSave: (field: string, val: unknown) => void;
  options?: { value: string | number; label: string }[];
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);

  function save() {
    const parsed = type === 'select' && options?.some(o => typeof o.value === 'number')
      ? parseInt(val, 10)
      : val || null;
    onSave(field, parsed);
    setEditing(false);
  }

  if (!editing) {
    return (
      <button onClick={() => { setVal(value); setEditing(true); }}
        className="text-xs text-slate-700 hover:text-blue-600 hover:underline text-right max-w-[180px] truncate" title="Click to edit">
        {value || '—'}
      </button>
    );
  }

  if (type === 'select' && options) {
    return (
      <select value={val} onChange={e => { setVal(e.target.value); }}
        onBlur={save} autoFocus
        className="rounded border border-blue-300 px-1.5 py-0.5 text-xs focus:outline-none">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    );
  }

  if (type === 'textarea') {
    return (
      <div className="w-full">
        <textarea value={val} onChange={e => setVal(e.target.value)} rows={3} autoFocus
          className="w-full rounded border border-blue-300 px-2 py-1 text-sm focus:outline-none"
          onKeyDown={e => { if (e.key === 'Escape') setEditing(false); }} />
        <div className="flex justify-end gap-1 mt-1">
          <button onClick={() => setEditing(false)} className="text-[10px] text-slate-400 hover:text-slate-600">Cancel</button>
          <button onClick={save} className="text-[10px] font-bold text-blue-600 hover:text-blue-800">Save</button>
        </div>
      </div>
    );
  }

  return (
    <input type={type ?? 'text'} value={val} onChange={e => setVal(e.target.value)}
      onBlur={save} autoFocus
      onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
      className="w-24 rounded border border-blue-300 px-1.5 py-0.5 text-xs text-right focus:outline-none" />
  );
}

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { unit } = useScope();
  const [task, setTask] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [deps, setDeps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [commentText, setCommentText] = useState('');
  const [editTitle, setEditTitle] = useState(false);
  const [editDesc, setEditDesc] = useState(false);
  const [titleVal, setTitleVal] = useState('');
  const [descVal, setDescVal] = useState('');
  const [showDepSearch, setShowDepSearch] = useState(false);
  const [depSearchQ, setDepSearchQ] = useState('');
  const [depResults, setDepResults] = useState<any[]>([]);
  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 2500); }

  async function searchDeps(q: string) {
    if (q.length < 2) { setDepResults([]); return; }
    const res = await fetch(`/api/bop/ops/tasks?search=${encodeURIComponent(q)}&tenant_id=${unit.id}&page_size=8`).then(r => r.json());
    const existing = new Set(deps.map((d: any) => d.depends_on_id));
    setDepResults((res.tasks ?? []).filter((t: any) => t.id !== id && !existing.has(t.id)));
  }

  const idRef = useRef(id);
  const unitRef = useRef(unit.id);
  idRef.current = id;
  unitRef.current = unit.id;

  async function load() {
    setLoading(true);
    const [taskRes, eventsRes, commentsRes, depsRes] = await Promise.all([
      fetch(`/api/bop/ops/tasks?id=${idRef.current}&tenant_id=${unitRef.current}`).then(r => r.json()),
      fetch(`/api/bop/ops/tasks/events?task_id=${idRef.current}`).then(r => r.json()).catch(() => ({ events: [] })),
      fetch(`/api/bop/ops/tasks/comments?task_id=${idRef.current}`).then(r => r.json()).catch(() => ({ comments: [] })),
      fetch(`/api/bop/ops/tasks/deps?task_id=${idRef.current}`).then(r => r.json()).catch(() => ({ deps: [] })),
    ]);
    setTask(taskRes.task ?? null);
    setEvents(eventsRes.events ?? []);
    setComments(commentsRes.comments ?? []);
    setDeps(depsRes.deps ?? []);
    setLoading(false);
  }

  useEffect(() => { void load(); }, [id, unit.id]);

  async function doTransition(toStatus: string) {
    setSaving(true);
    const res = await fetch('/api/bop/ops/tasks', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'transition', task_id: id, status: toStatus, tenant_id: unit.id }),
    }).then(r => r.json());
    if (res.error) showToast(`Error: ${res.error}`);
    else showToast(`Status → ${STATUS_LABEL[toStatus]}`);
    setSaving(false);
    void load();
  }

  async function savePatch(field: string, value: unknown) {
    setSaving(true);
    const res = await fetch('/api/bop/ops/tasks', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, [field]: value }),
    }).then(r => r.json());
    if (res.error) showToast(`Error: ${res.error}`);
    else { showToast('Updated'); }
    setSaving(false);
    void load();
  }

  async function toggleChecklist(idx: number) {
    if (!task) return;
    const cl = [...(task.checklist ?? [])];
    cl[idx] = { ...cl[idx], done: !cl[idx].done };
    await savePatch('checklist', cl);
  }

  async function addChecklistItem() {
    const label = prompt('Checklist item:');
    if (!label?.trim()) return;
    const cl = [...(task.checklist ?? []), { label: label.trim(), done: false }];
    await savePatch('checklist', cl);
  }

  async function addComment() {
    if (!commentText.trim()) return;
    setSaving(true);
    await fetch('/api/bop/ops/tasks/comments', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_id: id, body: commentText }),
    }).then(r => r.json()).catch(() => ({}));
    setCommentText('');
    setSaving(false);
    showToast('Comment added');
    void load();
  }

  if (loading) return <div className="flex h-64 items-center justify-center text-sm text-slate-400">Loading...</div>;
  if (!task) return <div className="p-8 text-slate-400">Task not found. <button onClick={() => router.back()} className="text-blue-600 underline">Go back</button></div>;

  const checklist: ChecklistItem[] = task.checklist ?? [];
  const checkDone = checklist.filter(c => c.done).length;
  const nextStatuses = VALID_TRANSITIONS[task.status] ?? [];

  return (
    <div className="space-y-6 p-6">
      {toast && <div className="fixed top-5 right-5 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-xl">{toast}</div>}

      {/* Header */}
      <div className="flex items-center justify-between">
        <ScreenHeader title={task.task_number ?? 'Task'} description={`OP001 — ${task.title}`} />
        <button onClick={() => router.push('/console/ops/tasks')}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 shadow-sm">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back
        </button>
      </div>

      {/* Status stepper */}
      <div className="flex items-center gap-2 flex-wrap">
        {Object.keys(STATUS_LABEL).map(s => (
          <div key={s} className={`rounded-full px-3 py-1 text-[10px] font-bold ${
            s === task.status ? STATUS_COLOR[s] + ' ring-2 ring-offset-1 ring-slate-300' : 'bg-slate-50 text-slate-300'
          }`}>
            {STATUS_LABEL[s]}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main content — 2 cols */}
        <div className="space-y-6 lg:col-span-2">
          {/* Title & description — editable */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            {editTitle ? (
              <div>
                <input value={titleVal} onChange={e => setTitleVal(e.target.value)} autoFocus
                  className="w-full rounded-lg border border-blue-300 px-3 py-2 text-lg font-bold text-slate-800 focus:outline-none"
                  onKeyDown={e => {
                    if (e.key === 'Enter') { void savePatch('title', titleVal.trim()); setEditTitle(false); }
                    if (e.key === 'Escape') setEditTitle(false);
                  }} />
                <div className="flex justify-end gap-2 mt-2">
                  <button onClick={() => setEditTitle(false)} className="text-xs text-slate-400">Cancel</button>
                  <button onClick={() => { void savePatch('title', titleVal.trim()); setEditTitle(false); }}
                    className="text-xs font-bold text-blue-600">Save</button>
                </div>
              </div>
            ) : (
              <h2 onClick={() => { setTitleVal(task.title); setEditTitle(true); }}
                className="text-lg font-bold text-slate-800 cursor-pointer hover:text-blue-700" title="Click to edit title">
                {task.title}
              </h2>
            )}

            {editDesc ? (
              <div className="mt-2">
                <textarea value={descVal} onChange={e => setDescVal(e.target.value)} rows={4} autoFocus
                  className="w-full rounded-lg border border-blue-300 px-3 py-2 text-sm text-slate-700 focus:outline-none" />
                <div className="flex justify-end gap-2 mt-2">
                  <button onClick={() => setEditDesc(false)} className="text-xs text-slate-400">Cancel</button>
                  <button onClick={() => { void savePatch('description', descVal.trim() || null); setEditDesc(false); }}
                    className="text-xs font-bold text-blue-600">Save</button>
                </div>
              </div>
            ) : (
              <p onClick={() => { setDescVal(task.description ?? ''); setEditDesc(true); }}
                className="mt-2 text-sm text-slate-600 whitespace-pre-wrap cursor-pointer hover:text-blue-600 min-h-[20px]" title="Click to edit description">
                {task.description || 'Click to add description...'}
              </p>
            )}
          </div>

          {/* Checklist */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Checklist</h3>
              <div className="flex items-center gap-2">
                {checklist.length > 0 && <span className="text-xs text-slate-400">{checkDone}/{checklist.length}</span>}
                <button onClick={() => void addChecklistItem()}
                  className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 hover:bg-slate-200">+ Add</button>
              </div>
            </div>
            {checklist.length > 0 && (
              <div className="h-1.5 rounded-full bg-slate-100 mb-3">
                <div className="h-1.5 rounded-full bg-emerald-500 transition-all" style={{ width: `${(checkDone / checklist.length) * 100}%` }} />
              </div>
            )}
            {checklist.length === 0 && <p className="text-xs text-slate-400">No checklist items</p>}
            <ul className="space-y-1.5">
              {checklist.map((item, i) => (
                <li key={i} className="flex items-center gap-2">
                  <button onClick={() => void toggleChecklist(i)} disabled={saving}
                    className={`h-4 w-4 rounded border flex-shrink-0 flex items-center justify-center text-[10px] ${
                      item.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300'
                    }`}>
                    {item.done && '✓'}
                  </button>
                  <span className={`text-sm ${item.done ? 'line-through text-slate-400' : 'text-slate-700'}`}>{item.label}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Comments */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Comments</h3>
            {comments.length === 0 && <p className="text-sm text-slate-400">No comments yet</p>}
            {comments.map((c: any) => (
              <div key={c.id} className="mb-3 rounded-lg bg-slate-50 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-slate-500">{c.author_id?.slice(0, 8) ?? 'System'}</span>
                  <span className="text-[10px] text-slate-400">{new Date(c.created_at).toLocaleString()}</span>
                </div>
                <p className="text-sm text-slate-700">{c.body}</p>
              </div>
            ))}
            <div className="mt-3 flex gap-2">
              <input type="text" value={commentText} onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && void addComment()}
                placeholder="Add a comment..."
                className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 placeholder-slate-400 focus:border-blue-400 focus:outline-none" />
              <button onClick={() => void addComment()} disabled={saving || !commentText.trim()}
                className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-40">
                Post
              </button>
            </div>
          </div>

          {/* Activity timeline */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Activity</h3>
            {events.length === 0 && <p className="text-sm text-slate-400">No activity yet</p>}
            <div className="space-y-2">
              {events.map((e: any) => (
                <div key={e.id} className="flex items-start gap-2 text-sm">
                  <span className="flex-shrink-0">{EVENT_ICON[e.event_type] ?? '•'}</span>
                  <div className="flex-1">
                    <span className="font-medium text-slate-700">{e.event_type.replace(/_/g, ' ')}</span>
                    {e.payload?.from && e.payload?.to && (
                      <span className="text-slate-400"> — {e.payload.from} → {e.payload.to}</span>
                    )}
                    {e.payload?.reason && (
                      <span className="text-slate-400"> ({e.payload.reason})</span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 flex-shrink-0">{new Date(e.created_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar — 1 col */}
        <div className="space-y-4">
          {/* Actions */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Actions</h3>
            <div className="flex flex-wrap gap-1.5">
              {nextStatuses.map(s => (
                <button key={s} onClick={() => void doTransition(s)} disabled={saving}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${STATUS_COLOR[s]} hover:opacity-80 disabled:opacity-40`}>
                  → {STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          </div>

          {/* Details card — all fields editable */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Details</h3>

            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Status</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_COLOR[task.status]}`}>{STATUS_LABEL[task.status]}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Priority</span>
              <InlineEdit value={String(task.priority)} field="priority" type="select"
                options={[{ value: 1, label: 'Low' }, { value: 2, label: 'Normal' }, { value: 3, label: 'High' }, { value: 4, label: 'Urgent' }]}
                onSave={(f, v) => void savePatch(f, v)} />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Due</span>
              <InlineEdit value={task.due_at ? task.due_at.slice(0, 10) : ''} field="due_at" type="date"
                onSave={(f, v) => void savePatch(f, v ? new Date(v as string).toISOString() : null)} />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">SLA Due</span>
              <span className="text-xs text-slate-700">{task.sla_due_at ? new Date(task.sla_due_at).toLocaleString() : '—'}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Escalation</span>
              <span className={`text-xs font-bold ${task.escalation_level > 0 ? 'text-red-600' : 'text-slate-400'}`}>L{task.escalation_level}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Assignee</span>
              <span className="text-xs text-slate-700 font-mono">{task.assignee_id?.slice(0, 8) ?? '—'}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Created</span>
              <span className="text-xs text-slate-700">{new Date(task.created_at).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Time tracking */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Time Tracking</h3>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Estimate</span>
              <InlineEdit value={task.estimated_hours != null ? String(task.estimated_hours) : ''} field="estimated_hours"
                onSave={(f, v) => void savePatch(f, v ? Number(v) : null)} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Actual</span>
              <span className="text-xs text-slate-700 tabular-nums">{task.actual_hours != null ? `${Number(task.actual_hours).toFixed(1)}h` : '0h'}</span>
            </div>
            {task.estimated_hours != null && task.actual_hours != null && task.estimated_hours > 0 && (
              <div>
                <div className="h-1.5 rounded-full bg-slate-100">
                  <div className={`h-1.5 rounded-full transition-all ${Number(task.actual_hours) > task.estimated_hours ? 'bg-red-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(100, (Number(task.actual_hours) / task.estimated_hours) * 100)}%` }} />
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 text-right">{Math.round((Number(task.actual_hours) / task.estimated_hours) * 100)}% of estimate</div>
              </div>
            )}
            {!['done', 'cancelled'].includes(task.status) && (
              <div>
                {task.timer_started_at ? (
                  <button onClick={async () => {
                    setSaving(true);
                    await fetch('/api/bop/ops/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ action: 'timer_stop', task_id: id }) }).then(r => r.json());
                    setSaving(false); showToast('Timer stopped'); void load();
                  }} disabled={saving}
                    className="w-full rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-40 flex items-center justify-center gap-1.5">
                    <span className="inline-block h-2 w-2 rounded-full bg-red-500 animate-pulse" /> Stop Timer
                  </button>
                ) : (
                  <button onClick={async () => {
                    setSaving(true);
                    await fetch('/api/bop/ops/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ action: 'timer_start', task_id: id }) }).then(r => r.json());
                    setSaving(false); showToast('Timer started'); void load();
                  }} disabled={saving}
                    className="w-full rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-40">
                    Start Timer
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Relation card */}
          {task.ref_object_type && (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Linked Object</h3>
              <div className="rounded-lg bg-slate-50 p-3">
                <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-500 uppercase">{task.ref_object_type}</span>
                <p className="mt-1 text-sm text-slate-700">{task.ref_object_label ?? task.ref_object_id}</p>
              </div>
            </div>
          )}

          {/* Dependencies */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Dependencies</h3>
              <button onClick={() => setShowDepSearch(true)}
                className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 hover:bg-slate-200">+ Add</button>
            </div>
            {deps.length === 0 && !showDepSearch && <p className="text-xs text-slate-400">No blockers</p>}
            <ul className="space-y-1.5">
              {deps.map((d: any) => (
                <li key={d.id} className="flex items-center gap-2 text-xs group">
                  <span className={`h-2 w-2 rounded-full flex-shrink-0 ${d.status === 'done' ? 'bg-emerald-500' : 'bg-red-400'}`} />
                  <span className="text-slate-700 flex-1 truncate" title={d.title}>{d.task_number ?? d.depends_on_id?.slice(0, 8)} — {d.title ?? ''}</span>
                  <button onClick={async () => {
                    await fetch('/api/bop/ops/tasks/deps', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: d.id }) });
                    showToast('Dependency removed'); void load();
                  }} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 text-[10px]" title="Remove">✕</button>
                </li>
              ))}
            </ul>
            {showDepSearch && (
              <div className="mt-2">
                <input type="text" placeholder="Search task number or title..." autoFocus
                  value={depSearchQ} onChange={e => { setDepSearchQ(e.target.value); void searchDeps(e.target.value); }}
                  onKeyDown={e => { if (e.key === 'Escape') { setShowDepSearch(false); setDepSearchQ(''); setDepResults([]); } }}
                  className="w-full rounded-lg border border-blue-300 px-2 py-1 text-xs focus:outline-none" />
                {depResults.length > 0 && (
                  <ul className="mt-1 max-h-32 overflow-y-auto rounded border border-slate-200 bg-white">
                    {depResults.map((t: any) => (
                      <li key={t.id}>
                        <button onClick={async () => {
                          await fetch('/api/bop/ops/tasks/deps', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ task_id: id, depends_on_id: t.id }) });
                          showToast(`Blocker added: ${t.task_number}`);
                          setShowDepSearch(false); setDepSearchQ(''); setDepResults([]);
                          void load();
                        }} className="w-full text-left px-2 py-1.5 text-xs hover:bg-blue-50 flex items-center gap-2">
                          <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${STATUS_COLOR[t.status]}`}>{STATUS_LABEL[t.status]}</span>
                          <span className="font-mono text-slate-500">{t.task_number}</span>
                          <span className="text-slate-700 truncate">{t.title}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

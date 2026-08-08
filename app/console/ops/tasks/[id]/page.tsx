'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ScreenHeader } from '@/components/ScreenBadge';
import { useScope } from '@/lib/scope-context';
import {
  STATUS_COLOR, STATUS_LABEL, PRIORITY_LABEL, PRIORITY_COLOR,
  VALID_TRANSITIONS, EVENT_ICON, type ChecklistItem,
} from '../ops-task-ui';

function DetailsCard({ task }: { task: any }) {
  const pairs: [string, React.ReactNode][] = [
    ['Status', <span key="s" className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_COLOR[task.status]}`}>{STATUS_LABEL[task.status]}</span>],
    ['Priority', <span key="p" className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${PRIORITY_COLOR[task.priority]}`}>{PRIORITY_LABEL[task.priority]}</span>],
    ['Due', task.due_at ? new Date(task.due_at).toLocaleDateString() : '—'],
    ['SLA Due', task.sla_due_at ? new Date(task.sla_due_at).toLocaleString() : '—'],
    ['Escalation', <span key="e" className={`font-bold ${task.escalation_level > 0 ? 'text-red-600' : 'text-slate-400'}`}>L{task.escalation_level}</span>],
    ['Assignee', task.assignee_id?.slice(0, 8) ?? '—'],
    ['Created', new Date(task.created_at).toLocaleDateString()],
  ];
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Details</h3>
      {pairs.map(([l, v]) => <div key={l} className="flex items-center justify-between"><span className="text-xs text-slate-500">{l}</span><span className="text-xs text-slate-700">{v}</span></div>)}
    </div>
  );
}

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { unit } = useScope();
  const [task, setTask] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [commentText, setCommentText] = useState('');
  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 2500); }

  const load = useCallback(async () => {
    setLoading(true);
    const [taskRes, eventsRes, commentsRes] = await Promise.all([
      fetch(`/api/bop/ops/tasks?search=${id}&tenant_id=${unit.id}`).then(r => r.json()),
      fetch(`/api/bop/ops/tasks/events?task_id=${id}`).then(r => r.json()).catch(() => ({ events: [] })),
      fetch(`/api/bop/ops/tasks/comments?task_id=${id}`).then(r => r.json()).catch(() => ({ comments: [] })),
    ]);
    setTask(taskRes.tasks?.find((t: any) => t.id === id) ?? null);
    setEvents(eventsRes.events ?? []);
    setComments(commentsRes.comments ?? []);
    setLoading(false);
  }, [id, unit.id]);

  useEffect(() => { void load(); }, [load]);

  async function doTransition(toStatus: string) {
    setSaving(true);
    const res = await fetch('/api/bop/ops/tasks', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'transition', task_id: id, status: toStatus, tenant_id: unit.id }),
    }).then(r => r.json());
    if (res.error) showToast(`Error: ${res.error}`);
    else showToast(`Status → ${STATUS_LABEL[toStatus]}`);
    setSaving(false); void load();
  }

  async function toggleChecklist(idx: number) {
    if (!task) return;
    const cl = [...(task.checklist ?? [])];
    cl[idx] = { ...cl[idx], done: !cl[idx].done };
    setSaving(true);
    await fetch('/api/bop/ops/tasks', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, checklist: cl }),
    });
    setSaving(false); showToast('Updated'); void load();
  }

  async function addComment() {
    if (!commentText.trim()) return;
    setSaving(true);
    await fetch('/api/bop/ops/tasks/comments', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_id: id, body: commentText }),
    }).catch(() => ({}));
    setCommentText(''); setSaving(false); showToast('Comment added'); void load();
  }

  if (loading) return <div className="flex h-64 items-center justify-center text-sm text-slate-400">Loading...</div>;
  if (!task) return <div className="p-8 text-slate-400">Task not found. <button onClick={() => router.back()} className="text-blue-600 underline">Go back</button></div>;

  const checklist: ChecklistItem[] = task.checklist ?? [];
  const checkDone = checklist.filter(c => c.done).length;
  const nextStatuses = VALID_TRANSITIONS[task.status] ?? [];

  return (
    <div className="space-y-6 p-6">
      {toast && <div className="fixed top-5 right-5 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-xl">{toast}</div>}

      <div className="flex items-center justify-between">
        <ScreenHeader title={task.task_number ?? 'Task'} description={`OP001 — ${task.title}`} />
        <button onClick={() => router.push('/console/ops/tasks')} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 shadow-sm">Back</button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {Object.keys(STATUS_LABEL).map(s => (
          <div key={s} className={`rounded-full px-3 py-1 text-[10px] font-bold ${s === task.status ? STATUS_COLOR[s] + ' ring-2 ring-offset-1 ring-slate-300' : 'bg-slate-50 text-slate-300'}`}>{STATUS_LABEL[s]}</div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-bold text-slate-800">{task.title}</h2>
            {task.description && <p className="mt-2 text-sm text-slate-600 whitespace-pre-wrap">{task.description}</p>}
          </div>

          {checklist.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Checklist</h3>
                <span className="text-xs text-slate-400">{checkDone}/{checklist.length}</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 mb-3">
                <div className="h-1.5 rounded-full bg-emerald-500 transition-all" style={{ width: `${checklist.length ? (checkDone / checklist.length) * 100 : 0}%` }} />
              </div>
              <ul className="space-y-1.5">
                {checklist.map((item, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <button onClick={() => void toggleChecklist(i)} disabled={saving}
                      className={`h-4 w-4 rounded border flex-shrink-0 flex items-center justify-center text-[10px] ${item.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300'}`}>
                      {item.done && '✓'}
                    </button>
                    <span className={`text-sm ${item.done ? 'line-through text-slate-400' : 'text-slate-700'}`}>{item.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

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
              <input type="text" value={commentText} onChange={e => setCommentText(e.target.value)} onKeyDown={e => e.key === 'Enter' && void addComment()}
                placeholder="Add a comment..." className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 placeholder-slate-400 focus:border-blue-400 focus:outline-none" />
              <button onClick={() => void addComment()} disabled={saving || !commentText.trim()} className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-40">Post</button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Activity</h3>
            {events.length === 0 && <p className="text-sm text-slate-400">No activity yet</p>}
            <div className="space-y-2">
              {events.map((e: any) => (
                <div key={e.id} className="flex items-start gap-2 text-sm">
                  <span className="flex-shrink-0">{EVENT_ICON[e.event_type] ?? '•'}</span>
                  <div className="flex-1">
                    <span className="font-medium text-slate-700">{e.event_type.replace(/_/g, ' ')}</span>
                    {e.payload?.from && e.payload?.to && <span className="text-slate-400"> — {e.payload.from} → {e.payload.to}</span>}
                    {e.payload?.reason && <span className="text-slate-400"> ({e.payload.reason})</span>}
                  </div>
                  <span className="text-[10px] text-slate-400 flex-shrink-0">{new Date(e.created_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Actions</h3>
            <div className="flex flex-wrap gap-1.5">
              {nextStatuses.map(s => (
                <button key={s} onClick={() => void doTransition(s)} disabled={saving}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${STATUS_COLOR[s]} hover:opacity-80 disabled:opacity-40`}>→ {STATUS_LABEL[s]}</button>
              ))}
            </div>
          </div>
          <DetailsCard task={task} />
          {task.ref_object_type && (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Linked Object</h3>
              <div className="rounded-lg bg-slate-50 p-3">
                <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-500 uppercase">{task.ref_object_type}</span>
                <p className="mt-1 text-sm text-slate-700">{task.ref_object_label ?? task.ref_object_id}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

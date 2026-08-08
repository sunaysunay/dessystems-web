'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ScreenHeader } from '@/components/ScreenBadge';
import { useScope } from '@/lib/scope-context';
import {
  STATUS_COLOR, STATUS_LABEL, PRIORITY_COLOR, PRIORITY_LABEL,
  type OpTask,
} from '../ops-task-ui';

const COLUMNS = ['open', 'in_progress', 'waiting_input', 'blocked', 'done'] as const;

export default function KanbanPage() {
  const { unit } = useScope();
  const router = useRouter();
  const [tasks, setTasks] = useState<OpTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  const fetchTasks = useCallback(async () => {
    if (!unit?.id) return;
    const res = await fetch(`/api/bop/ops/tasks?tenant_id=${unit.id}&page_size=200`);
    const d = await res.json();
    setTasks(d.tasks ?? []);
    setLoading(false);
  }, [unit?.id]);

  useEffect(() => { void fetchTasks(); }, [fetchTasks]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  async function handleDrop(taskId: string, toStatus: string) {
    setDragging(null);
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.status === toStatus) return;

    const res = await fetch('/api/bop/ops/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'transition', task_id: taskId, status: toStatus }),
    });
    const d = await res.json();
    if (d.error) { setToast(`Error: ${d.error}`); return; }
    setToast(`${task.task_number} → ${STATUS_LABEL[toStatus]}`);
    void fetchTasks();
  }

  const byStatus = (status: string) => tasks.filter(t => t.status === status);

  if (loading) return <div className="p-6 text-slate-400">Loading kanban...</div>;

  return (
    <div className="p-4 md:p-6">
      <ScreenHeader title="Kanban Board" description="OP001 — Drag-to-transition task columns" />

      <div className="flex gap-3 overflow-x-auto pb-4 mt-4">
        {COLUMNS.map(col => (
          <div
            key={col}
            className="flex-shrink-0 w-72 bg-slate-50/50 dark:bg-slate-900/30 rounded-lg"
            onDragOver={e => e.preventDefault()}
            onDrop={e => {
              e.preventDefault();
              const id = e.dataTransfer.getData('text/plain');
              if (id) void handleDrop(id, col);
            }}
          >
            <div className="p-3 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[col]}`}>
                {STATUS_LABEL[col]}
              </span>
              <span className="text-xs text-slate-400 ml-auto">{byStatus(col).length}</span>
            </div>

            <div className="p-2 space-y-2 min-h-[200px]">
              {byStatus(col).map(task => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={e => {
                    e.dataTransfer.setData('text/plain', task.id);
                    setDragging(task.id);
                  }}
                  onDragEnd={() => setDragging(null)}
                  onClick={() => router.push(`/console/ops/tasks/${task.id}`)}
                  className={`bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3 cursor-grab active:cursor-grabbing hover:shadow-sm transition-shadow ${
                    dragging === task.id ? 'opacity-40' : ''
                  }`}
                >
                  <div className="flex items-start gap-2 mb-1">
                    <span className="text-[10px] font-mono text-slate-400">{task.task_number}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${PRIORITY_COLOR[task.priority]}`}>
                      {PRIORITY_LABEL[task.priority]}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 line-clamp-2">
                    {task.title}
                  </p>
                  {task.due_at && (
                    <p className={`text-[11px] mt-1 ${
                      new Date(task.due_at) < new Date() ? 'text-red-500 font-medium' : 'text-slate-400'
                    }`}>
                      Due {new Date(task.due_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 bg-slate-800 text-white text-sm px-4 py-2 rounded-lg shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
}

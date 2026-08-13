'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import { useScope } from '@/lib/scope-context';
import {
  type OpTask,
  STATUS_COLOR,
  STATUS_LABEL,
  PRIORITY_COLOR,
  PRIORITY_LABEL,
  VALID_TRANSITIONS,
  urgencyBand,
  URGENCY_BG,
} from '../ops-task-ui';

const COLUMNS = [
  'open',
  'in_progress',
  'waiting_input',
  'waiting_approval',
  'blocked',
  'done',
  'cancelled',
] as const;

type Col = (typeof COLUMNS)[number];

export default function KanbanPage() {
  const { unit } = useScope();
  const [tasks, setTasks] = useState<OpTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const dragItem = useRef<OpTask | null>(null);
  const [dragOver, setDragOver] = useState<Col | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(
      `/api/bop/ops/tasks?tenant_id=${unit.id}&page_size=500`,
    );
    if (res.ok) {
      const data = await res.json();
      setTasks(data.tasks ?? data.rows ?? []);
    }
    setLoading(false);
  }, [unit.id]);

  useEffect(() => { load(); }, [load]);

  const byCol = Object.fromEntries(
    COLUMNS.map((c) => [c, [] as OpTask[]]),
  ) as Record<Col, OpTask[]>;
  for (const t of tasks) {
    const col = COLUMNS.includes(t.status as Col) ? (t.status as Col) : 'open';
    byCol[col].push(t);
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }

  async function transition(task: OpTask, newStatus: Col) {
    const allowed = VALID_TRANSITIONS[task.status];
    if (!allowed?.includes(newStatus)) {
      showToast(`Cannot move from ${STATUS_LABEL[task.status]} to ${STATUS_LABEL[newStatus]}`);
      return;
    }
    const prev = tasks;
    setTasks((ts) =>
      ts.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t)),
    );
    const res = await fetch('/api/bop/ops/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'transition',
        task_id: task.id,
        status: newStatus,
        tenant_id: unit.id,
      }),
    });
    if (!res.ok) {
      setTasks(prev);
      showToast('Transition failed');
    }
  }

  function onDragStart(t: OpTask) {
    dragItem.current = t;
  }

  function onDrop(col: Col) {
    const t = dragItem.current;
    dragItem.current = null;
    setDragOver(null);
    if (t && t.status !== col) transition(t, col);
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <ScreenHeader title="Kanban Board" description="OP010 — Drag-and-drop task board" />
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <ScreenHeader title="Kanban Board" description="OP010 — Drag-and-drop task board" />

      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-800 text-white text-sm px-4 py-2 rounded shadow">
          {toast}
        </div>
      )}

      <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: 'calc(100vh - 220px)' }}>
        {COLUMNS.map((col) => (
          <div
            key={col}
            className={`flex-shrink-0 w-64 rounded-lg border flex flex-col ${
              dragOver === col ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-gray-50'
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(col); }}
            onDragLeave={() => setDragOver(null)}
            onDrop={() => onDrop(col)}
          >
            <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200">
              <span className={`w-2 h-2 rounded-full ${STATUS_COLOR[col]}`} />
              <span className="text-sm font-medium">{STATUS_LABEL[col]}</span>
              <span className="ml-auto text-xs text-gray-400">{byCol[col].length}</span>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {byCol[col].map((t) => (
                <div
                  key={t.id}
                  draggable
                  onDragStart={() => onDragStart(t)}
                  className={`rounded border border-gray-200 bg-white p-2 shadow-sm cursor-grab active:cursor-grabbing text-sm ${URGENCY_BG[urgencyBand(t)] ?? ''}`}
                >
                  <div className="flex items-center gap-1 mb-1">
                    <span className="text-xs text-gray-400 font-mono">{t.task_number}</span>
                    <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded ${PRIORITY_COLOR[t.priority]}`}>
                      {PRIORITY_LABEL[t.priority]}
                    </span>
                  </div>
                  <p className="font-medium leading-tight line-clamp-2">{t.title}</p>
                  {t.due_at && (
                    <p className="text-xs text-gray-400 mt-1">
                      Due {new Date(t.due_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

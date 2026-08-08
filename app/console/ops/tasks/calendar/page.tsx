'use client';
import { useState, useEffect, useCallback } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import { useScope } from '@/lib/scope-context';
import type { OpTask } from '../ops-task-ui';
import { MonthGrid } from './month-grid';
import { WeekGrid } from './week-grid';
import { formatDate } from './cal-utils';

type ViewMode = 'month' | 'week';

export default function CalendarPage() {
  const { unit } = useScope();
  const [tasks, setTasks] = useState<OpTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<ViewMode>('month');
  const [current, setCurrent] = useState(new Date());

  const fetchTasks = useCallback(async () => {
    if (!unit?.id) return;
    const res = await fetch(`/api/bop/ops/tasks?tenant_id=${unit.id}&page_size=200`);
    const d = await res.json();
    setTasks((d.tasks ?? []).filter((t: OpTask) => t.due_at && !['done', 'cancelled'].includes(t.status)));
    setLoading(false);
  }, [unit?.id]);

  useEffect(() => { void fetchTasks(); }, [fetchTasks]);

  const tasksByDate: Record<string, OpTask[]> = {};
  for (const t of tasks) {
    if (!t.due_at) continue;
    const key = formatDate(new Date(t.due_at));
    (tasksByDate[key] ??= []).push(t);
  }

  const today = formatDate(new Date());
  const y = current.getFullYear();
  const m = current.getMonth();

  function navigate(dir: number) {
    if (mode === 'month') {
      setCurrent(new Date(y, m + dir, 1));
    } else {
      const d = new Date(current);
      d.setDate(d.getDate() + dir * 7);
      setCurrent(d);
    }
  }

  if (loading) return <div className="p-6 text-slate-400">Loading calendar...</div>;

  const monthLabel = current.toLocaleDateString('en', { month: 'long', year: 'numeric' });

  return (
    <div className="p-4 md:p-6">
      <ScreenHeader title="Calendar View" description="OP001 — Tasks by due date" />
      <div className="flex items-center justify-between mt-4 mb-4">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="px-2 py-1 text-sm rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800">←</button>
          <h2 className="text-lg font-semibold">{monthLabel}</h2>
          <button onClick={() => navigate(1)} className="px-2 py-1 text-sm rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800">→</button>
          <button onClick={() => setCurrent(new Date())} className="ml-2 px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800">Today</button>
        </div>
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded p-0.5">
          {(['month', 'week'] as const).map(v => (
            <button key={v} onClick={() => setMode(v)}
              className={`px-3 py-1 text-xs rounded ${mode === v ? 'bg-white dark:bg-slate-700 shadow-sm font-medium' : 'text-slate-500'}`}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>
      {mode === 'month'
        ? <MonthGrid tasksByDate={tasksByDate} today={today} year={y} month={m} />
        : <WeekGrid tasksByDate={tasksByDate} today={today} current={current} />}
    </div>
  );
}

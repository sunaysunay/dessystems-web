'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import { useScope } from '@/lib/scope-context';
import { type OpTask } from '../ops-task-ui';
import { formatDate } from './cal-utils';
import { MonthGrid } from './month-grid';
import { WeekGrid } from './week-grid';

type View = 'month' | 'week';

export default function CalendarPage() {
  const { unit } = useScope();
  const [tasks, setTasks] = useState<OpTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('month');
  const [current, setCurrent] = useState(() => new Date());

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

  const today = formatDate(new Date());

  const tasksByDate = useMemo(() => {
    const map: Record<string, OpTask[]> = {};
    for (const t of tasks) {
      const key = t.due_at ? formatDate(new Date(t.due_at)) : null;
      if (key) {
        (map[key] ??= []).push(t);
      }
    }
    return map;
  }, [tasks]);

  function stepMonth(dir: number) {
    setCurrent((d) => new Date(d.getFullYear(), d.getMonth() + dir, 1));
  }

  function stepWeek(dir: number) {
    setCurrent((d) => {
      const n = new Date(d);
      n.setDate(n.getDate() + dir * 7);
      return n;
    });
  }

  const monthLabel = current.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="p-6 space-y-4">
      <ScreenHeader title="Calendar" description="OP011 — Task calendar view" />

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex rounded border border-gray-200 text-sm overflow-hidden">
          <button
            className={`px-3 py-1 ${view === 'month' ? 'bg-blue-600 text-white' : 'bg-white'}`}
            onClick={() => setView('month')}
          >
            Month
          </button>
          <button
            className={`px-3 py-1 ${view === 'week' ? 'bg-blue-600 text-white' : 'bg-white'}`}
            onClick={() => setView('week')}
          >
            Week
          </button>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <button
            className="px-2 py-1 rounded border border-gray-200 hover:bg-gray-100"
            onClick={() => (view === 'month' ? stepMonth(-1) : stepWeek(-1))}
          >
            &larr;
          </button>
          <span className="font-medium min-w-[160px] text-center">{monthLabel}</span>
          <button
            className="px-2 py-1 rounded border border-gray-200 hover:bg-gray-100"
            onClick={() => (view === 'month' ? stepMonth(1) : stepWeek(1))}
          >
            &rarr;
          </button>
        </div>

        <button
          className="text-sm text-blue-600 hover:underline"
          onClick={() => setCurrent(new Date())}
        >
          Today
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : view === 'month' ? (
        <MonthGrid
          tasksByDate={tasksByDate}
          today={today}
          year={current.getFullYear()}
          month={current.getMonth()}
        />
      ) : (
        <WeekGrid tasksByDate={tasksByDate} today={today} current={current} />
      )}
    </div>
  );
}

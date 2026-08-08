'use client';
import { useRouter } from 'next/navigation';
import { PRIORITY_COLOR, PRIORITY_LABEL, type OpTask } from '../ops-task-ui';
import { formatDate } from './cal-utils';

function startOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

interface Props {
  tasksByDate: Record<string, OpTask[]>;
  today: string;
  current: Date;
}

export function WeekGrid({ tasksByDate, today, current }: Props) {
  const router = useRouter();
  const week = startOfWeek(current);
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(week);
    d.setDate(week.getDate() + i);
    days.push(d);
  }

  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map(d => {
        const key = formatDate(d);
        const dayTasks = tasksByDate[key] ?? [];
        const isToday = key === today;
        return (
          <div key={key} className="min-h-[200px]">
            <div className={`text-center text-xs mb-2 ${isToday ? 'font-bold text-blue-600' : 'text-slate-400'}`}>
              {d.toLocaleDateString('en', { weekday: 'short', day: 'numeric' })}
            </div>
            <div className="space-y-1">
              {dayTasks.map(t => (
                <div key={t.id} onClick={() => router.push(`/console/ops/tasks/${t.id}`)}
                  className="text-xs p-2 rounded border border-slate-200 dark:border-slate-700 cursor-pointer hover:shadow-sm bg-white dark:bg-slate-800">
                  <span className="font-mono text-[10px] text-slate-400">{t.task_number}</span>
                  <p className="truncate mt-0.5">{t.title}</p>
                  <span className={`text-[10px] px-1 py-0.5 rounded ${PRIORITY_COLOR[t.priority]}`}>{PRIORITY_LABEL[t.priority]}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

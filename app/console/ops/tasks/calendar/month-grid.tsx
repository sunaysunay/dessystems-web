'use client';
import { useRouter } from 'next/navigation';
import { PRIORITY_COLOR, type OpTask } from '../ops-task-ui';
import { formatDate } from './cal-utils';

function daysInMonth(y: number, m: number): number {
  return new Date(y, m + 1, 0).getDate();
}

interface Props {
  tasksByDate: Record<string, OpTask[]>;
  today: string;
  year: number;
  month: number;
}

export function MonthGrid({ tasksByDate, today, year, month }: Props) {
  const router = useRouter();
  const dim = daysInMonth(year, month);
  const firstDay = new Date(year, month, 1).getDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1;
  const cells: { date: string; day: number; inMonth: boolean }[] = [];

  for (let i = 0; i < offset; i++) {
    const d = new Date(year, month, -offset + i + 1);
    cells.push({ date: formatDate(d), day: d.getDate(), inMonth: false });
  }
  for (let d = 1; d <= dim; d++) {
    cells.push({ date: formatDate(new Date(year, month, d)), day: d, inMonth: true });
  }
  const remaining = 7 - (cells.length % 7);
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      cells.push({ date: formatDate(d), day: d.getDate(), inMonth: false });
    }
  }

  return (
    <div className="grid grid-cols-7 border-t border-l border-slate-200 dark:border-slate-700">
      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
        <div key={d} className="p-2 text-center text-xs font-medium text-slate-400 border-b border-r border-slate-200 dark:border-slate-700">{d}</div>
      ))}
      {cells.map(cell => {
        const dayTasks = tasksByDate[cell.date] ?? [];
        const isToday = cell.date === today;
        return (
          <div key={cell.date} className={`min-h-[90px] p-1 border-b border-r border-slate-200 dark:border-slate-700 ${cell.inMonth ? '' : 'bg-slate-50/50 dark:bg-slate-900/30'}`}>
            <div className={`text-xs mb-1 ${isToday ? 'bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center' : 'text-slate-400'}`}>{cell.day}</div>
            {dayTasks.slice(0, 3).map(t => (
              <div key={t.id} onClick={() => router.push(`/console/ops/tasks/${t.id}`)}
                className={`text-[10px] px-1 py-0.5 mb-0.5 rounded truncate cursor-pointer hover:opacity-80 ${PRIORITY_COLOR[t.priority]}`}
                title={`${t.task_number} — ${t.title}`}>{t.title}</div>
            ))}
            {dayTasks.length > 3 && <div className="text-[10px] text-slate-400 px-1">+{dayTasks.length - 3} more</div>}
          </div>
        );
      })}
    </div>
  );
}

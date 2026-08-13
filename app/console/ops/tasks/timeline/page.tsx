'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useScope } from '@/lib/scope-context';
import { ScreenHeader } from '@/components/ScreenBadge';

const STATUS_COLOR_HEX: Record<string, string> = {
  open: '#3b82f6', in_progress: '#f59e0b', waiting_input: '#a855f7',
  waiting_approval: '#6366f1', blocked: '#ef4444', done: '#10b981', cancelled: '#94a3b8',
};

const PRIORITY_STRIPE: Record<number, string> = {
  1: '#94a3b8', 2: '#3b82f6', 3: '#f97316', 4: '#ef4444',
};

interface Task {
  id: string;
  task_number: string;
  title: string;
  status: string;
  priority: number;
  due_at: string | null;
  created_at: string;
  sla_due_at: string | null;
  assignee_id: string | null;
}

interface Dep {
  task_id: string;
  depends_on_id: string;
}

const DAY_MS = 86400000;
const COL_W = 32;
const ROW_H = 36;
const LABEL_W = 240;

export default function TimelinePage() {
  const { unit } = useScope();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [deps, setDeps] = useState<Dep[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [taskRes, depRes] = await Promise.all([
      fetch(`/api/bop/ops/tasks?tenant_id=${unit.id}&page_size=200&sort=due_at&sort_dir=asc`).then(r => r.json()),
      fetch(`/api/bop/ops/tasks/deps?task_id=__all&tenant_id=${unit.id}`).then(r => r.json()).catch(() => ({ deps: [] })),
    ]);
    setTasks((taskRes.tasks ?? []).filter((t: Task) => t.due_at));
    setDeps(depRes.deps ?? []);
    setLoading(false);
  }, [unit.id]);

  useEffect(() => { void load(); }, [load]);

  if (loading) return <div className="flex h-64 items-center justify-center text-sm text-slate-400">Loading timeline...</div>;
  if (!tasks.length) return (
    <div className="p-6 space-y-4">
      <ScreenHeader title="Timeline" description="OP014 — Gantt-style task timeline" />
      <div className="flex h-40 items-center justify-center text-sm text-slate-400">No tasks with due dates found</div>
    </div>
  );

  const dates = tasks.map(t => new Date(t.due_at!).getTime());
  const createdDates = tasks.map(t => new Date(t.created_at).getTime());
  const minDate = Math.min(...dates, ...createdDates) - DAY_MS * 2;
  const maxDate = Math.max(...dates) + DAY_MS * 7;
  const totalDays = Math.ceil((maxDate - minDate) / DAY_MS);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayOffset = (today.getTime() - minDate) / DAY_MS;

  const dayLabels: { date: Date; x: number }[] = [];
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(minDate + i * DAY_MS);
    if (d.getDate() === 1 || i === 0) dayLabels.push({ date: d, x: i });
  }

  const taskIdMap = new Map(tasks.map((t, i) => [t.id, i]));

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <ScreenHeader title="Timeline" description="OP014 — Gantt-style task timeline with dependencies" />
        <div className="flex gap-2">
          <button onClick={() => router.push('/console/ops/tasks')}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">List View</button>
          <button onClick={() => void load()}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">Refresh</button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div ref={scrollRef} className="overflow-x-auto overflow-y-auto max-h-[70vh]">
          <div style={{ width: LABEL_W + totalDays * COL_W, minHeight: tasks.length * ROW_H + 60 }} className="relative">
            {/* Header months */}
            <div className="sticky top-0 z-10 flex h-8 border-b border-slate-100 bg-slate-50">
              <div style={{ width: LABEL_W }} className="flex-shrink-0 border-r border-slate-100 px-3 py-1.5 text-[10px] font-bold uppercase text-slate-400">Task</div>
              <div className="relative flex-1">
                {dayLabels.map(dl => (
                  <div key={dl.x} className="absolute top-0 h-full border-l border-slate-100 px-1.5 py-1.5 text-[10px] font-medium text-slate-400"
                    style={{ left: dl.x * COL_W }}>
                    {dl.date.toLocaleDateString('en', { month: 'short', year: '2-digit' })}
                  </div>
                ))}
              </div>
            </div>

            {/* Today line */}
            <div className="absolute top-8 bottom-0 w-px bg-red-400 z-[5] opacity-60"
              style={{ left: LABEL_W + todayOffset * COL_W }} />

            {/* Rows */}
            {tasks.map((t, i) => {
              const start = (new Date(t.created_at).getTime() - minDate) / DAY_MS;
              const end = (new Date(t.due_at!).getTime() - minDate) / DAY_MS;
              const barLeft = Math.max(0, start) * COL_W;
              const barWidth = Math.max(COL_W, (end - Math.max(0, start)) * COL_W);
              return (
                <div key={t.id} className="flex" style={{ height: ROW_H }}>
                  {/* Label */}
                  <div style={{ width: LABEL_W }} className="flex-shrink-0 border-r border-b border-slate-50 flex items-center gap-2 px-3 overflow-hidden">
                    <div className="h-3 w-1 rounded-full flex-shrink-0" style={{ backgroundColor: PRIORITY_STRIPE[t.priority] }} />
                    <button onClick={() => router.push(`/console/ops/tasks/${t.id}`)}
                      className="truncate text-xs text-slate-700 hover:text-blue-600 hover:underline text-left">
                      <span className="font-mono text-[10px] text-slate-400 mr-1">{t.task_number}</span>
                      {t.title}
                    </button>
                  </div>

                  {/* Bar area */}
                  <div className="relative flex-1 border-b border-slate-50">
                    <div className="absolute top-1.5 rounded-full h-5 cursor-pointer hover:opacity-80 transition-opacity flex items-center px-2"
                      style={{
                        left: barLeft,
                        width: barWidth,
                        backgroundColor: STATUS_COLOR_HEX[t.status] ?? '#94a3b8',
                        opacity: t.status === 'done' ? 0.5 : 0.85,
                      }}
                      onClick={() => router.push(`/console/ops/tasks/${t.id}`)}>
                      <span className="text-[9px] font-bold text-white truncate">{t.task_number}</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Dependency arrows (SVG overlay) */}
            <svg className="absolute top-8 left-0 pointer-events-none" style={{ width: LABEL_W + totalDays * COL_W, height: tasks.length * ROW_H }}
              fill="none" stroke="#ef4444" strokeWidth={1.5} strokeOpacity={0.5}>
              <defs><marker id="arrow" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto"><path d="M0,0 L6,2 L0,4" fill="#ef4444" fillOpacity={0.5} /></marker></defs>
              {deps.map((d, di) => {
                const fromIdx = taskIdMap.get(d.depends_on_id);
                const toIdx = taskIdMap.get(d.task_id);
                if (fromIdx === undefined || toIdx === undefined) return null;
                const fromTask = tasks[fromIdx];
                const toTask = tasks[toIdx];
                const fromX = LABEL_W + ((new Date(fromTask.due_at!).getTime() - minDate) / DAY_MS) * COL_W;
                const fromY = fromIdx * ROW_H + ROW_H / 2;
                const toX = LABEL_W + ((new Date(toTask.created_at).getTime() - minDate) / DAY_MS) * COL_W;
                const toY = toIdx * ROW_H + ROW_H / 2;
                return <path key={di} d={`M${fromX},${fromY} C${fromX + 30},${fromY} ${toX - 30},${toY} ${toX},${toY}`} markerEnd="url(#arrow)" />;
              })}
            </svg>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-slate-400 flex-wrap">
        {Object.entries(STATUS_COLOR_HEX).map(([s, c]) => (
          <span key={s} className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-6 rounded-full" style={{ backgroundColor: c }} />
            {s.replace(/_/g, ' ')}
          </span>
        ))}
        <span className="flex items-center gap-1"><span className="inline-block h-4 w-px bg-red-400" /> Today</span>
      </div>
    </div>
  );
}

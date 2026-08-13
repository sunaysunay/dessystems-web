'use client';
import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ScreenHeader } from '@/components/ScreenBadge';
import { QuickAddTaskModal } from './quick-add';

const VIEWS = [
  { path: '/console/ops/tasks', label: 'Cockpit', exact: true },
  { path: '/console/ops/tasks/grid', label: 'Grid' },
  { path: '/console/ops/tasks/kanban', label: 'Kanban' },
  { path: '/console/ops/tasks/calendar', label: 'Calendar' },
  { path: '/console/ops/tasks/timeline', label: 'Timeline' },
  { path: '/console/ops/tasks/analytics', label: 'Analytics' },
] as const;

export default function OpsTasksLayout({ children }: { children: React.ReactNode }) {
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (v: typeof VIEWS[number]) =>
    'exact' in v && v.exact ? pathname === v.path : pathname.startsWith(v.path);

  const showNav = VIEWS.some(v => isActive(v));

  return (
    <>
      {showNav && (
        <div className="px-4 md:px-6 pt-4 pb-0">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={() => router.back()} title="Go back"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 shadow-sm">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <ScreenHeader title="Tasks" description="OP001 — Task management & SLA monitoring" />
          </div>
          <div className="border-b border-slate-200 dark:border-slate-700">
            <div className="flex gap-1">
              {VIEWS.map(v => (
                <button
                  key={v.path}
                  onClick={() => router.push(v.path)}
                  className={`px-3 py-2 text-sm rounded-t transition-colors ${
                    isActive(v)
                      ? 'bg-white dark:bg-slate-800 border border-b-0 border-slate-200 dark:border-slate-700 font-medium -mb-px'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {children}
      <button onClick={() => setShowQuickAdd(true)}
        title="Quick Add Task"
        className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 text-white shadow-xl hover:bg-slate-700 transition-colors text-xl font-bold">
        +
      </button>
      {showQuickAdd && (
        <QuickAddTaskModal
          onClose={() => setShowQuickAdd(false)}
          onCreated={() => router.refresh()}
          currentPath={pathname}
        />
      )}
    </>
  );
}

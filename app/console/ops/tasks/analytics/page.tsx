'use client';
import { useState, useEffect, useCallback } from 'react';
import { useScope } from '@/lib/scope-context';
import { ScreenHeader } from '@/components/ScreenBadge';
import { Spark, Kpi, Bars, RangePicker } from '@/components/CockpitKit';

const STATUS_LABEL: Record<string, string> = {
  open: 'Open', in_progress: 'In Progress', waiting_input: 'Waiting Input',
  waiting_approval: 'Waiting Approval', blocked: 'Blocked', done: 'Done', cancelled: 'Cancelled',
};
const STATUS_BAR_COLOR: Record<string, string> = {
  open: 'bg-blue-400', in_progress: 'bg-amber-400', waiting_input: 'bg-purple-400',
  waiting_approval: 'bg-indigo-400', blocked: 'bg-red-400', done: 'bg-emerald-400', cancelled: 'bg-slate-300',
};
const PRIORITY_LABEL: Record<number, string> = { 1: 'Low', 2: 'Normal', 3: 'High', 4: 'Urgent' };

interface Analytics {
  period_days: number;
  total_tasks: number;
  open_tasks: number;
  overdue_count: number;
  avg_age_days: number;
  sla_compliance_pct: number;
  sla_total: number;
  sla_breached: number;
  escalation_counts: { l0: number; l1: number; l2: number; l3: number };
  status_distribution: Record<string, number>;
  priority_distribution: Record<number, number>;
  completed_per_week: { week: string; count: number }[];
  created_per_week: { week: string; count: number }[];
  workload_by_assignee: Record<string, { open: number; done: number; total: number }>;
  workload_by_department: Record<string, { open: number; done: number; total: number }>;
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div className="h-3 flex-1 rounded bg-slate-100">
      <div className={`h-full rounded ${color}`} style={{ width: `${max > 0 ? (value / max) * 100 : 0}%` }} />
    </div>
  );
}

function WeeklyChart({ completed, created }: { completed: { week: string; count: number }[]; created: { week: string; count: number }[] }) {
  const allWeeks = [...new Set([...completed.map(c => c.week), ...created.map(c => c.week)])].sort();
  if (!allWeeks.length) return <div className="text-sm text-slate-400 text-center py-8">No data yet</div>;

  const compMap = Object.fromEntries(completed.map(c => [c.week, c.count]));
  const creatMap = Object.fromEntries(created.map(c => [c.week, c.count]));
  const maxVal = Math.max(...allWeeks.map(w => Math.max(compMap[w] ?? 0, creatMap[w] ?? 0)), 1);

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-4 mb-2 text-[10px] font-medium text-slate-400">
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-6 rounded bg-emerald-400" /> Completed</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-6 rounded bg-blue-400" /> Created</span>
      </div>
      {allWeeks.slice(-12).map(w => {
        const comp = compMap[w] ?? 0;
        const creat = creatMap[w] ?? 0;
        return (
          <div key={w} className="flex items-center gap-2 text-[11px]">
            <span className="w-20 text-slate-400 tabular-nums">{w.slice(5)}</span>
            <div className="flex-1 flex gap-0.5">
              <div className="h-3.5 rounded bg-emerald-400" style={{ width: `${(comp / maxVal) * 100}%` }} />
              <div className="h-3.5 rounded bg-blue-300" style={{ width: `${(creat / maxVal) * 100}%` }} />
            </div>
            <span className="w-10 text-right tabular-nums text-slate-600 font-medium">{comp}/{creat}</span>
          </div>
        );
      })}
    </div>
  );
}

function SlaGauge({ pct, total, breached }: { pct: number; total: number; breached: number }) {
  const color = pct >= 90 ? '#10b981' : pct >= 70 ? '#f59e0b' : '#ef4444';
  const r = 50, stroke = 10, circ = Math.PI * r;
  const offset = circ - (Math.min(100, pct) / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={120} height={70} viewBox="0 0 120 70">
        <path d={`M 10 65 A ${r} ${r} 0 0 1 110 65`} fill="none" stroke="#e2e8f0" strokeWidth={stroke} strokeLinecap="round" />
        <path d={`M 10 65 A ${r} ${r} 0 0 1 110 65`} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} className="transition-all duration-700" />
        <text x="60" y="55" textAnchor="middle" className="text-lg font-bold" fill={color}>{pct}%</text>
      </svg>
      <div className="text-[10px] text-slate-400 text-center">
        {total} with SLA · {breached} breached
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { unit } = useScope();
  const [data, setData] = useState<Analytics | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/bop/ops/tasks/analytics?tenant_id=${unit.id}&days=${days}`).then(r => r.json());
    if (!res.error) setData(res);
    setLoading(false);
  }, [unit.id, days]);

  useEffect(() => { void load(); }, [load]);

  if (loading) return <div className="flex h-64 items-center justify-center text-sm text-slate-400">Loading analytics...</div>;
  if (!data) return <div className="flex h-64 items-center justify-center text-sm text-slate-400">Failed to load</div>;

  const statusRows = Object.entries(data.status_distribution)
    .sort(([, a], [, b]) => b - a)
    .map(([s, v]) => ({ label: STATUS_LABEL[s] ?? s, value: v }));
  const statusMax = Math.max(...statusRows.map(r => r.value), 1);

  const priorityRows = Object.entries(data.priority_distribution)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([p, v]) => ({ label: PRIORITY_LABEL[Number(p)] ?? `P${p}`, value: v }));
  const priorityMax = Math.max(...priorityRows.map(r => r.value), 1);

  const assigneeRows = Object.entries(data.workload_by_assignee)
    .sort(([, a], [, b]) => b.total - a.total)
    .slice(0, 10);

  const deptRows = Object.entries(data.workload_by_department)
    .sort(([, a], [, b]) => b.total - a.total)
    .slice(0, 10);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <ScreenHeader title="Task Analytics" description="OP013 — Completion trends, SLA compliance, workload distribution" />
        <div className="flex items-center gap-3">
          <RangePicker value={days} onChange={setDays} />
          <button onClick={() => void load()}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
            Refresh
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-3 lg:grid-cols-6">
        <Kpi label="Total Tasks" value={data.total_tasks} />
        <Kpi label="Open" value={data.open_tasks} />
        <Kpi label="Overdue" value={data.overdue_count} />
        <Kpi label="Avg Age (days)" value={data.avg_age_days} />
        <Kpi label="SLA Compliance" value={`${data.sla_compliance_pct}%`} />
        <Kpi label="Escalated (L2+)" value={data.escalation_counts.l2 + data.escalation_counts.l3} />
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Completed vs Created per week */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Completed vs Created / Week</div>
          <WeeklyChart completed={data.completed_per_week} created={data.created_per_week} />
        </div>

        {/* SLA gauge + escalation */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">SLA Compliance</div>
          <div className="flex items-start gap-6">
            <SlaGauge pct={data.sla_compliance_pct} total={data.sla_total} breached={data.sla_breached} />
            <div className="flex-1 space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Escalation Levels</div>
              {(['l0', 'l1', 'l2', 'l3'] as const).map((lv, i) => (
                <div key={lv} className="flex items-center gap-2 text-[11px]">
                  <span className="w-8 text-slate-500">L{i}</span>
                  <div className="h-3 flex-1 rounded bg-slate-100">
                    <div className={`h-full rounded ${i === 0 ? 'bg-slate-300' : i === 1 ? 'bg-amber-400' : i === 2 ? 'bg-orange-500' : 'bg-red-600'}`}
                      style={{ width: `${data.total_tasks > 0 ? (data.escalation_counts[lv] / data.total_tasks) * 100 : 0}%` }} />
                  </div>
                  <span className="w-8 text-right tabular-nums font-medium text-slate-600">{data.escalation_counts[lv]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Distribution row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Status distribution */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Status Distribution</div>
          <div className="space-y-1.5">
            {statusRows.map(r => (
              <div key={r.label} className="flex items-center gap-2 text-[11px]">
                <span className="w-32 truncate text-slate-600">{r.label}</span>
                <MiniBar value={r.value} max={statusMax}
                  color={STATUS_BAR_COLOR[Object.entries(STATUS_LABEL).find(([, v]) => v === r.label)?.[0] ?? ''] ?? 'bg-slate-400'} />
                <span className="w-8 text-right tabular-nums font-semibold text-slate-700">{r.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Priority distribution */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Priority Distribution</div>
          <div className="space-y-1.5">
            {priorityRows.map(r => (
              <div key={r.label} className="flex items-center gap-2 text-[11px]">
                <span className="w-32 truncate text-slate-600">{r.label}</span>
                <MiniBar value={r.value} max={priorityMax}
                  color={r.label === 'Urgent' ? 'bg-red-400' : r.label === 'High' ? 'bg-orange-400' : r.label === 'Normal' ? 'bg-blue-400' : 'bg-slate-300'} />
                <span className="w-8 text-right tabular-nums font-semibold text-slate-700">{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Workload row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* By assignee */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Workload by Assignee</div>
          {assigneeRows.length === 0 ? (
            <div className="text-sm text-slate-400 text-center py-4">No data</div>
          ) : (
            <div className="space-y-1.5">
              {assigneeRows.map(([aid, w]) => (
                <div key={aid} className="flex items-center gap-2 text-[11px]">
                  <span className="w-32 truncate text-slate-600 font-mono text-[10px]">{aid === 'unassigned' ? 'Unassigned' : aid.slice(0, 8)}</span>
                  <div className="flex-1 flex h-3.5 rounded overflow-hidden bg-slate-100">
                    <div className="h-full bg-amber-400" style={{ width: `${(w.open / Math.max(w.total, 1)) * 100}%` }} />
                    <div className="h-full bg-emerald-400" style={{ width: `${(w.done / Math.max(w.total, 1)) * 100}%` }} />
                  </div>
                  <span className="w-14 text-right tabular-nums text-slate-600">{w.open}o / {w.done}d</span>
                </div>
              ))}
              <div className="flex items-center gap-4 mt-2 text-[10px] text-slate-400">
                <span className="flex items-center gap-1"><span className="inline-block h-2 w-4 rounded bg-amber-400" /> Open</span>
                <span className="flex items-center gap-1"><span className="inline-block h-2 w-4 rounded bg-emerald-400" /> Done</span>
              </div>
            </div>
          )}
        </div>

        {/* By department */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Workload by Department</div>
          {deptRows.length === 0 ? (
            <div className="text-sm text-slate-400 text-center py-4">No data</div>
          ) : (
            <div className="space-y-1.5">
              {deptRows.map(([did, w]) => (
                <div key={did} className="flex items-center gap-2 text-[11px]">
                  <span className="w-32 truncate text-slate-600">{did === 'unassigned' ? 'Unassigned' : did.slice(0, 12)}</span>
                  <div className="flex-1 flex h-3.5 rounded overflow-hidden bg-slate-100">
                    <div className="h-full bg-amber-400" style={{ width: `${(w.open / Math.max(w.total, 1)) * 100}%` }} />
                    <div className="h-full bg-emerald-400" style={{ width: `${(w.done / Math.max(w.total, 1)) * 100}%` }} />
                  </div>
                  <span className="w-14 text-right tabular-nums text-slate-600">{w.open}o / {w.done}d</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

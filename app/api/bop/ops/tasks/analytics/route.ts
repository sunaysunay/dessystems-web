import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenant_id') ?? '';
  const days = Math.min(parseInt(searchParams.get('days') ?? '30', 10), 365);

  if (!tenantId) return NextResponse.json({ error: 'tenant_id required' }, { status: 400 });

  const cutoff = new Date(Date.now() - days * 86400000).toISOString();

  const [tasksRes, eventsRes, allTasksRes] = await Promise.all([
    supabase
      .from('op_tasks')
      .select('id, status, priority, assignee_id, department_id, sla_due_at, escalation_level, due_at, created_at, updated_at')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null),
    supabase
      .from('op_task_events')
      .select('task_id, event_type, created_at, payload')
      .in('event_type', ['created', 'status_changed', 'sla_breached', 'escalated'])
      .gte('created_at', cutoff)
      .order('created_at', { ascending: true }),
    supabase
      .from('op_tasks')
      .select('id, status, created_at, updated_at, sla_due_at, escalation_level')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .gte('created_at', cutoff),
  ]);

  if (tasksRes.error) return NextResponse.json({ error: tasksRes.error.message }, { status: 500 });
  if (eventsRes.error) return NextResponse.json({ error: eventsRes.error.message }, { status: 500 });

  const tasks = tasksRes.data ?? [];
  const taskIds = new Set(tasks.map(t => t.id));
  const events = (eventsRes.data ?? []).filter(e => taskIds.has(e.task_id));
  const periodTasks = allTasksRes.data ?? [];

  // --- Completion per week ---
  const completionEvents = events.filter(
    e => e.event_type === 'status_changed' && (e.payload as Record<string, string>)?.to === 'done'
  );
  const weekMap: Record<string, number> = {};
  for (const e of completionEvents) {
    const d = new Date(e.created_at);
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const key = monday.toISOString().slice(0, 10);
    weekMap[key] = (weekMap[key] ?? 0) + 1;
  }
  const completedPerWeek = Object.entries(weekMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, count]) => ({ week, count }));

  // --- Created per week ---
  const createdEvents = events.filter(e => e.event_type === 'created');
  const createdWeekMap: Record<string, number> = {};
  for (const e of createdEvents) {
    const d = new Date(e.created_at);
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const key = monday.toISOString().slice(0, 10);
    createdWeekMap[key] = (createdWeekMap[key] ?? 0) + 1;
  }
  const createdPerWeek = Object.entries(createdWeekMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, count]) => ({ week, count }));

  // --- SLA compliance ---
  const withSla = periodTasks.filter(t => t.sla_due_at);
  const slaBreach = withSla.filter(t => t.escalation_level >= 2);
  const slaCompliancePct = withSla.length > 0
    ? Math.round(((withSla.length - slaBreach.length) / withSla.length) * 100)
    : 100;

  // --- Status distribution ---
  const statusDist: Record<string, number> = {};
  for (const t of tasks) statusDist[t.status] = (statusDist[t.status] ?? 0) + 1;

  // --- Priority distribution ---
  const priorityDist: Record<number, number> = {};
  for (const t of tasks) priorityDist[t.priority] = (priorityDist[t.priority] ?? 0) + 1;

  // --- Workload by assignee ---
  const workload: Record<string, { open: number; done: number; total: number }> = {};
  for (const t of tasks) {
    const a = t.assignee_id ?? 'unassigned';
    if (!workload[a]) workload[a] = { open: 0, done: 0, total: 0 };
    workload[a].total++;
    if (t.status === 'done' || t.status === 'cancelled') workload[a].done++;
    else workload[a].open++;
  }

  // --- Workload by department ---
  const deptLoad: Record<string, { open: number; done: number; total: number }> = {};
  for (const t of tasks) {
    const d = t.department_id ?? 'unassigned';
    if (!deptLoad[d]) deptLoad[d] = { open: 0, done: 0, total: 0 };
    deptLoad[d].total++;
    if (t.status === 'done' || t.status === 'cancelled') deptLoad[d].done++;
    else deptLoad[d].open++;
  }

  // --- Average task age (open tasks) ---
  const openTasks = tasks.filter(t => !['done', 'cancelled'].includes(t.status));
  const now = Date.now();
  const avgAgeDays = openTasks.length > 0
    ? Math.round(openTasks.reduce((s, t) => s + (now - new Date(t.created_at).getTime()) / 86400000, 0) / openTasks.length * 10) / 10
    : 0;

  // --- Escalation counts ---
  const escalationCounts = { l0: 0, l1: 0, l2: 0, l3: 0 };
  for (const t of tasks) {
    if (t.escalation_level === 0) escalationCounts.l0++;
    else if (t.escalation_level === 1) escalationCounts.l1++;
    else if (t.escalation_level === 2) escalationCounts.l2++;
    else if (t.escalation_level === 3) escalationCounts.l3++;
  }

  // --- Overdue count ---
  const overdueCount = openTasks.filter(t => t.due_at && new Date(t.due_at) < new Date()).length;

  return NextResponse.json({
    period_days: days,
    total_tasks: tasks.length,
    open_tasks: openTasks.length,
    overdue_count: overdueCount,
    avg_age_days: avgAgeDays,
    sla_compliance_pct: slaCompliancePct,
    sla_total: withSla.length,
    sla_breached: slaBreach.length,
    escalation_counts: escalationCounts,
    status_distribution: statusDist,
    priority_distribution: priorityDist,
    completed_per_week: completedPerWeek,
    created_per_week: createdPerWeek,
    workload_by_assignee: workload,
    workload_by_department: deptLoad,
  });
}

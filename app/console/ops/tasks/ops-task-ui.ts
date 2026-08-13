export const STATUS_COLOR: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  waiting_input: 'bg-purple-100 text-purple-700',
  waiting_approval: 'bg-indigo-100 text-indigo-700',
  blocked: 'bg-red-100 text-red-700',
  done: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-slate-200 text-slate-500',
};

export const STATUS_LABEL: Record<string, string> = {
  open: 'Open', in_progress: 'In Progress', waiting_input: 'Waiting Input',
  waiting_approval: 'Waiting Approval', blocked: 'Blocked', done: 'Done', cancelled: 'Cancelled',
};

export const PRIORITY_LABEL: Record<number, string> = { 1: 'Low', 2: 'Normal', 3: 'High', 4: 'Urgent' };
export const PRIORITY_COLOR: Record<number, string> = {
  1: 'bg-slate-100 text-slate-500', 2: 'bg-blue-50 text-blue-600',
  3: 'bg-orange-100 text-orange-700', 4: 'bg-red-100 text-red-700',
};

export const ESCALATION_COLOR: Record<number, string> = {
  0: '', 1: 'border-l-4 border-l-amber-400', 2: 'border-l-4 border-l-orange-500', 3: 'border-l-4 border-l-red-600',
};

export const VALID_TRANSITIONS: Record<string, string[]> = {
  open: ['in_progress', 'waiting_input', 'waiting_approval', 'blocked', 'cancelled'],
  in_progress: ['open', 'waiting_input', 'waiting_approval', 'blocked', 'done', 'cancelled'],
  waiting_input: ['open', 'in_progress', 'blocked', 'cancelled'],
  waiting_approval: ['in_progress', 'done', 'cancelled'],
  blocked: ['open', 'in_progress', 'cancelled'],
  done: ['open'],
  cancelled: ['open'],
};

export const EVENT_ICON: Record<string, string> = {
  created: '🆕', status_changed: '🔄', assigned: '👤', priority_changed: '⚡',
  sla_warning: '⚠️', sla_breached: '🚨', escalated: '📢', commented: '💬',
  attachment_added: '📎', checklist_toggled: '✅', snoozed: '😴', closed: '🏁',
};

export interface OpTask {
  id: string;
  task_number: string;
  title: string;
  description: string | null;
  status: string;
  priority: number;
  assignee_id: string | null;
  department_id: string | null;
  due_at: string | null;
  sla_due_at: string | null;
  escalation_level: number;
  ref_object_type: string | null;
  ref_object_id: string | null;
  ref_object_label: string | null;
  checklist: ChecklistItem[];
  created_at: string;
}

export interface ChecklistItem { label: string; done: boolean }

export interface CockpitSummary {
  open: number;
  due_today: number;
  overdue: number;
  waiting_input: number;
  waiting_approval: number;
  blocked: number;
  completed_today: number;
  sla_at_risk: number;
}

export function urgencyBand(task: { due_at: string | null }): 'overdue' | 'today' | 'upcoming' | 'normal' {
  if (!task.due_at) return 'normal';
  const d = new Date(task.due_at);
  const now = new Date();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const tomorrowEnd = new Date(todayEnd.getTime() + 86400000);
  if (d < now) return 'overdue';
  if (d < todayEnd) return 'today';
  if (d < tomorrowEnd) return 'upcoming';
  return 'normal';
}

export const URGENCY_BG: Record<string, string> = {
  overdue: 'bg-red-50/50', today: 'bg-amber-50/30', upcoming: '', normal: '',
};

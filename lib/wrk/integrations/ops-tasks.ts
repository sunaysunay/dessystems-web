import { SupabaseClient } from '@supabase/supabase-js';

export async function createWOTask(supabase: SupabaseClient, opts: {
  tenantId: number;
  trigger: 'parts_ordered' | 'ready_pickup' | 'approval_needed' | 'overdue';
  woId: string;
  woNumber: string;
  description?: string;
}) {
  const TITLES: Record<string, string> = {
    parts_ordered: `Onderdelen besteld — ${opts.woNumber}`,
    ready_pickup: `Voertuig klaar voor ophalen — ${opts.woNumber}`,
    approval_needed: `Goedkeuring nodig — ${opts.woNumber}`,
    overdue: `Werkorder achterstallig — ${opts.woNumber}`,
  };

  const PRIORITIES: Record<string, number> = {
    parts_ordered: 2,
    ready_pickup: 3,
    approval_needed: 3,
    overdue: 4,
  };

  await supabase.rpc('op_task_create', {
    p_tenant_id: opts.tenantId,
    p_title: TITLES[opts.trigger] ?? `WRK: ${opts.woNumber}`,
    p_description: opts.description ?? null,
    p_priority: PRIORITIES[opts.trigger] ?? 2,
    p_assignee_id: null,
    p_department_id: null,
    p_due_at: null,
    p_sla_due_at: null,
    p_ref_object_type: 'work_order',
    p_ref_object_id: opts.woId,
    p_ref_object_label: opts.woNumber,
    p_parent_task_id: null,
    p_checklist: [],
    p_actor: null,
  });
}

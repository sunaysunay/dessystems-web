import type { SupabaseClient } from '@supabase/supabase-js';
import { notifyTaskCreated } from './notify';

interface TriggerResult {
  trigger_id: string;
  tasks_created: string[];
}

interface TriggerRow {
  id: string;
  template_id: string;
  condition_jsonb: Record<string, unknown>;
  cooldown_hours: number;
}

function offsetIso(hours: number | null): string | null {
  if (!hours) return null;
  return new Date(Date.now() + hours * 3600_000).toISOString();
}

async function isIdempotent(supabase: SupabaseClient, triggerId: string, key: string): Promise<boolean> {
  const { data } = await supabase.from('op_task_trigger_events')
    .select('id').eq('trigger_id', triggerId).eq('idempotency_key', key).maybeSingle();
  return !!data;
}

async function isCoolingDown(supabase: SupabaseClient, triggerId: string, hours: number): Promise<boolean> {
  if (hours <= 0) return false;
  const cutoff = new Date(Date.now() - hours * 3600_000).toISOString();
  const { data } = await supabase.from('op_task_trigger_events')
    .select('id').eq('trigger_id', triggerId).gt('created_at', cutoff).limit(1);
  return !!data?.length;
}

async function createStepTask(
  supabase: SupabaseClient, step: Record<string, unknown>,
  tenantId: string, sourceObjectType: string, sourceObjectId: string,
  template: Record<string, unknown> | null, actorId: string | null,
  prevTaskId: string | null,
): Promise<string | null> {
  const { data: task, error } = await supabase.rpc('op_task_create', {
    p_tenant_id: tenantId, p_title: step.title, p_description: null,
    p_priority: step.default_priority ?? template?.default_priority ?? 2,
    p_assignee_id: null, p_department_id: step.department_id ?? null,
    p_due_at: offsetIso(step.due_offset_hours as number | null),
    p_sla_due_at: offsetIso(step.sla_offset_hours as number | null),
    p_ref_object_type: template?.ref_object_type ?? sourceObjectType,
    p_ref_object_id: sourceObjectId, p_ref_object_label: null,
    p_parent_task_id: null, p_checklist: [], p_actor: actorId ?? null,
  });
  if (error || !task) return null;
  const taskId = typeof task === 'object' ? (task as Record<string, string>).id : String(task);
  if (step.depends_on_prev && prevTaskId) {
    await supabase.from('op_task_dependencies').insert({ task_id: taskId, depends_on_task_id: prevTaskId });
  }
  void notifyTaskCreated((task as Record<string, string>).task_number ?? '?', step.title as string, null);
  return taskId;
}

async function processTrigger(
  supabase: SupabaseClient, trigger: TriggerRow,
  sourceObjectType: string, sourceObjectId: string,
  tenantId: string, actorId: string | null,
): Promise<TriggerResult | null> {
  const idempotencyKey = `${trigger.id}:${sourceObjectId}`;
  if (await isIdempotent(supabase, trigger.id, idempotencyKey)) return null;
  if (await isCoolingDown(supabase, trigger.id, trigger.cooldown_hours)) return null;

  const { data: steps, error: se } = await supabase.from('op_task_template_steps')
    .select('*').eq('template_id', trigger.template_id).order('step_order', { ascending: true });
  if (se || !steps?.length) return null;

  const { data: template } = await supabase.from('op_task_templates')
    .select('default_priority, ref_object_type').eq('id', trigger.template_id).single();

  const createdTaskIds: string[] = [];
  let prevTaskId: string | null = null;
  for (const step of steps) {
    const taskId = await createStepTask(supabase, step, tenantId, sourceObjectType, sourceObjectId, template, actorId, prevTaskId);
    if (taskId) { createdTaskIds.push(taskId); prevTaskId = taskId; }
  }

  if (!createdTaskIds.length) return null;
  await supabase.from('op_task_trigger_events').insert({
    trigger_id: trigger.id, source_object_type: sourceObjectType,
    source_object_id: sourceObjectId, tasks_created: createdTaskIds, idempotency_key: idempotencyKey,
  });
  return { trigger_id: trigger.id, tasks_created: createdTaskIds };
}

export async function fireTaskTriggers(
  supabase: SupabaseClient, eventType: string, sourceObjectType: string,
  sourceObjectId: string, tenantId: string, actorId?: string | null,
): Promise<TriggerResult[]> {
  const { data: triggers, error: te } = await supabase.from('op_task_triggers')
    .select('id, template_id, condition_jsonb, cooldown_hours')
    .eq('tenant_id', tenantId).eq('event_type', eventType).eq('enabled', true).is('deleted_at', null);
  if (te || !triggers?.length) return [];

  const results: TriggerResult[] = [];
  for (const trigger of triggers) {
    const result = await processTrigger(supabase, trigger as TriggerRow, sourceObjectType, sourceObjectId, tenantId, actorId ?? null);
    if (result) results.push(result);
  }
  return results;
}

import type { SupabaseClient } from '@supabase/supabase-js';

export async function fireTaskTriggers(
  supabase: SupabaseClient,
  eventType: string,
  entityType: string,
  entityId: string,
  tenantId: string,
): Promise<void> {
  const { data: triggers } = await supabase
    .from('op_task_triggers')
    .select('id, template_id')
    .eq('event_type', eventType)
    .eq('is_active', true);

  if (!triggers?.length) return;

  for (const trigger of triggers) {
    const { data: tpl } = await supabase
      .from('op_task_templates')
      .select('*')
      .eq('id', trigger.template_id)
      .single();

    if (!tpl) continue;

    await supabase.from('op_tasks').insert({
      tenant_id: tenantId,
      title: tpl.title,
      description: tpl.description,
      priority: tpl.priority ?? 'medium',
      category: tpl.category ?? 'general',
      source_type: entityType,
      source_id: entityId,
      trigger_id: trigger.id,
      sla_hours: tpl.sla_hours,
      sla_due_at: tpl.sla_hours ? new Date(Date.now() + tpl.sla_hours * 3600_000).toISOString() : null,
    });
  }
}

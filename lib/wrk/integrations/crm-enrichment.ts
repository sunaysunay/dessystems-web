import { SupabaseClient } from '@supabase/supabase-js';

export async function enrichCRMFromWO(supabase: SupabaseClient, workOrder: {
  id: string;
  customer_id?: string;
  wo_number?: string;
  type: string;
  status: string;
  tenant_id: number;
  vehicle_id?: string;
  completed_at?: string;
}) {
  if (workOrder.status !== 'completed' || !workOrder.customer_id) return;

  // Find the CRM lead/customer linked to this business partner
  const { data: lead } = await supabase
    .from('crm_leads')
    .select('id')
    .eq('customer_id', workOrder.customer_id)
    .limit(1)
    .maybeSingle();

  const leadId = lead?.id;

  // Create activity record
  await supabase.from('crm_activities').insert({
    tenant_id: workOrder.tenant_id,
    lead_id: leadId ?? null,
    customer_id: workOrder.customer_id,
    type: 'workshop_visit',
    title: `Werkplaatsbezoek ${workOrder.wo_number ?? ''}`,
    description: `Type: ${workOrder.type}. Afgerond op ${workOrder.completed_at ?? new Date().toISOString().split('T')[0]}`,
    status: 'completed',
    ref_object_type: 'work_order',
    ref_object_id: workOrder.id,
  });
}

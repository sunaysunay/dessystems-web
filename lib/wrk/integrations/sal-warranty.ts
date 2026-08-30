import { SupabaseClient } from '@supabase/supabase-js';

export async function createWarrantyClaimFromWO(supabase: SupabaseClient, workOrder: {
  id: string;
  vehicle_id?: string;
  customer_id?: string;
  wo_number?: string;
  type: string;
  status: string;
  tenant_id: number;
  notes?: string;
  actual_hours?: number;
}) {
  if (workOrder.type !== 'warranty_repair' || workOrder.status !== 'completed') return;
  if (!workOrder.vehicle_id) return;

  // Find active warranty for this vehicle
  const { data: warranty } = await supabase
    .from('sal_warranties')
    .select('id, warranty_type')
    .eq('vehicle_id', workOrder.vehicle_id)
    .eq('status', 'active')
    .order('end_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!warranty) return; // no active warranty

  // Get WO line totals for claim amount
  const { data: lines } = await supabase
    .from('wrk_order_lines')
    .select('total')
    .eq('order_id', workOrder.id);

  const totalAmount = (lines ?? []).reduce((sum: number, l: any) => sum + (parseFloat(l.total) || 0), 0);

  // Create warranty claim
  await supabase.from('sal_warranty_claims').insert({
    warranty_id: warranty.id,
    tenant_id: workOrder.tenant_id,
    description: `Garantiereparatie ${workOrder.wo_number ?? ''} — ${workOrder.notes ?? 'Geen beschrijving'}`,
    status: 'submitted',
    amount: totalAmount,
  });
}

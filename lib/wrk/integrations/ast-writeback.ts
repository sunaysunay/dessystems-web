import { SupabaseClient } from '@supabase/supabase-js';

export async function updateAssetFromWO(supabase: SupabaseClient, workOrder: {
  vehicle_id?: string;
  mileage_at_intake?: number;
  status: string;
  wo_number?: string;
  type?: string;
}) {
  if (!workOrder.vehicle_id) return;

  const updates: Record<string, any> = {};

  // Update mileage if higher than current
  if (workOrder.mileage_at_intake) {
    const { data: asset } = await supabase
      .from('ast_assets')
      .select('mileage')
      .eq('id', workOrder.vehicle_id)
      .single();

    if (!asset || !asset.mileage || workOrder.mileage_at_intake > asset.mileage) {
      updates.mileage = workOrder.mileage_at_intake;
    }
  }

  // On WO completion, stamp last workshop visit
  if (workOrder.status === 'completed') {
    updates.last_service_date = new Date().toISOString();
  }

  if (Object.keys(updates).length > 0) {
    await supabase
      .from('ast_assets')
      .update(updates)
      .eq('id', workOrder.vehicle_id);
  }
}

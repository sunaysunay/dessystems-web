import { SupabaseClient } from '@supabase/supabase-js';
import { createWarrantyClaimFromWO } from '@/lib/wrk/integrations/sal-warranty';
import { enrichCRMFromWO } from '@/lib/wrk/integrations/crm-enrichment';

export async function runWOIntegrations(supabase: SupabaseClient, workOrder: any, prevStatus?: string) {
  const promises: Promise<void>[] = [];

  if (workOrder.status === 'completed' && workOrder.type === 'warranty_repair') {
    promises.push(createWarrantyClaimFromWO(supabase, workOrder).catch(() => {}));
  }

  if (workOrder.status === 'completed' && workOrder.customer_id) {
    promises.push(enrichCRMFromWO(supabase, workOrder).catch(() => {}));
  }

  await Promise.allSettled(promises);
}

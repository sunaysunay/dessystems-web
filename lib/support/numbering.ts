import { getServerClient } from '@/lib/supabase-server';

export async function nextCaseNumber(tenantId: number): Promise<string> {
  const supabase = getServerClient();
  const { data, error } = await supabase.rpc('sup_next_number', {
    p_tenant_id: tenantId,
    p_kind: 'case',
  });
  if (error) throw new Error(`Failed to generate case number: ${error.message}`);
  return data as string;
}

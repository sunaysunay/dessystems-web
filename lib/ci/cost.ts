import { getServerClient } from '@/lib/supabase-server';

export interface LandedCost {
  variant_id: string;
  valid_from: string;
  purchase_price_net: number;
  inbound_freight: number;
  customs_duty: number;
  fx_adjustment: number;
  supplier_fee: number;
  landed_unit_cost: number;
  source: string;
}

export async function getLandedCost(
  variantId: string,
  atDate: string = new Date().toISOString().slice(0, 10),
): Promise<LandedCost | null> {
  const supabase = getServerClient();
  const { data, error } = await supabase
    .from('shop_product_cost')
    .select('variant_id, valid_from, purchase_price_net, inbound_freight, customs_duty, fx_adjustment, supplier_fee, landed_unit_cost, source')
    .eq('variant_id', variantId)
    .lte('valid_from', atDate)
    .order('valid_from', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`getLandedCost: ${error.message}`);
  return data;
}

export async function getParam(
  key: string,
  atDate: string = new Date().toISOString().slice(0, 10),
): Promise<number | null> {
  const supabase = getServerClient();
  const { data, error } = await supabase
    .from('shop_cost_parameter')
    .select('numeric_value')
    .eq('param_key', key)
    .lte('valid_from', atDate)
    .order('valid_from', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`getParam(${key}): ${error.message}`);
  return data?.numeric_value ?? null;
}

export async function getAllParams(
  atDate: string = new Date().toISOString().slice(0, 10),
): Promise<Record<string, number>> {
  const supabase = getServerClient();
  const { data, error } = await supabase
    .from('shop_cost_parameter')
    .select('param_key, numeric_value, valid_from')
    .lte('valid_from', atDate)
    .order('valid_from', { ascending: false });

  if (error) throw new Error(`getAllParams: ${error.message}`);

  const result: Record<string, number> = {};
  for (const row of data ?? []) {
    if (!(row.param_key in result)) {
      result[row.param_key] = row.numeric_value;
    }
  }
  return result;
}

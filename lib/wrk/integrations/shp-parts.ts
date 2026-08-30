import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Look up SHP product catalog for parts used in a work order.
 * Enriches WO order lines with SHP product data (stock, pricing).
 *
 * Placeholder — requires shp_products table (SHP module Phase 2).
 * When SHP is ready, this function queries shp_products by part_id
 * from wrk_order_lines and returns stock availability + catalog price.
 */
export async function lookupSHPParts(supabase: SupabaseClient, orderId: string): Promise<{
  part_id: string;
  description: string;
  in_stock: boolean;
  catalog_price: number;
}[]> {
  // Check if shp_products table exists
  const { data, error } = await supabase
    .from('wrk_order_lines')
    .select('part_id, description, unit_price')
    .eq('order_id', orderId)
    .eq('line_type', 'parts')
    .not('part_id', 'is', null);

  if (error || !data?.length) return [];

  // TODO: When SHP module is live, join with shp_products:
  // const partIds = data.map(d => d.part_id);
  // const { data: products } = await supabase
  //   .from('shp_products').select('id, stock_qty, price')
  //   .in('id', partIds);

  return data.map((line: any) => ({
    part_id: line.part_id,
    description: line.description,
    in_stock: true, // placeholder
    catalog_price: parseFloat(line.unit_price) || 0,
  }));
}

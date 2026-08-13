import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const { product_ids, updates } = await req.json() as {
    product_ids: string[];
    updates: { status?: string; brand_id?: string; tax_class_id?: string };
  };

  const { data, error } = await supabase
    .from('shop_products')
    .update(updates)
    .in('id', product_ids)
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ updated: data });
}

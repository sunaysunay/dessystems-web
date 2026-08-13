import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export async function GET() {
  const supabase = getServerClient();

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .gte('code', '3000')
    .lte('code', '3799')
    .order('code');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ categories: data });
}

export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const { product_id, category_codes, primary_code } = await req.json() as {
    product_id: string;
    category_codes: string[];
    primary_code?: string;
  };

  // Remove existing links for this product
  const { error: delError } = await supabase
    .from('shop_product_categories')
    .delete()
    .eq('product_id', product_id);

  if (delError) return NextResponse.json({ error: delError.message }, { status: 500 });

  // Insert new links
  const rows = category_codes.map((code) => ({
    product_id,
    category_code: code,
    is_primary: code === primary_code,
  }));

  const { data, error } = await supabase
    .from('shop_product_categories')
    .insert(rows)
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ product_categories: data });
}

export async function DELETE(req: NextRequest) {
  const supabase = getServerClient();
  const id = req.nextUrl.searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const { error } = await supabase
    .from('shop_product_categories')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

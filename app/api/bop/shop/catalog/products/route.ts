import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const page = Math.max(1, Number(sp.get('page') ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(sp.get('page_size') ?? 25)));
  const search = sp.get('search')?.trim();
  const status = sp.get('status');
  const brandId = sp.get('brand_id');
  const categoryId = sp.get('category_id');
  const supabase = getServerClient();

  let query = supabase
    .from('shop_products')
    .select('*, brand:shop_brands(id, slug, name)', { count: 'exact' });

  if (search) query = query.ilike('slug', `%${search}%`);
  if (status) query = query.eq('status', status);
  if (brandId) query = query.eq('brand_id', brandId);
  if (categoryId) query = query.eq('category_id', categoryId);

  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1).order('created_at', { ascending: false });

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ products: data, total: count ?? 0 });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { slug, title, brand_id, description, status, tax_class_id, is_published } = body;

  if (!slug || !title) {
    return NextResponse.json({ error: 'slug and title are required' }, { status: 400 });
  }

  const supabase = getServerClient();
  const { data, error } = await supabase
    .from('shop_products')
    .insert({
      slug,
      title,
      brand_id: brand_id ?? null,
      description: description ?? null,
      status: status ?? 'draft',
      tax_class_id: tax_class_id ?? null,
      is_published: is_published ?? false,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ product: data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, ...fields } = body;

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const supabase = getServerClient();
  const { data, error } = await supabase
    .from('shop_products')
    .update(fields)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ product: data });
}

export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const supabase = getServerClient();
  const { error } = await supabase
    .from('shop_products')
    .update({ status: 'archived' })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

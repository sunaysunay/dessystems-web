import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const slug = sp.get('slug');
  const limit = Math.min(100, Math.max(1, Number(sp.get('limit') ?? 50)));
  const offset = Math.max(0, Number(sp.get('offset') ?? 0));

  const supabase = getServerClient();
  let query = supabase.from('shop_pages').select('*', { count: 'exact' });

  if (slug) query = query.eq('slug', slug);

  query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

  const { data: pages, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ pages, total: count ?? 0 });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { slug, title, content, page_type, seo_title, seo_description } = body;

  if (!slug || !title) {
    return NextResponse.json({ error: 'slug and title are required' }, { status: 400 });
  }

  const supabase = getServerClient();
  const { data, error } = await supabase
    .from('shop_pages')
    .insert({
      slug,
      title,
      content: content ?? null,
      page_type: page_type ?? null,
      seo_title: seo_title ?? null,
      seo_description: seo_description ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ page: data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, ...fields } = body;

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const allowed = ['title', 'content', 'status', 'seo_title', 'seo_description'];
  const updates: Record<string, any> = {};
  for (const key of allowed) {
    if (key in fields) updates[key] = fields[key];
  }

  const supabase = getServerClient();
  const { data, error } = await supabase
    .from('shop_pages')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ page: data });
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const productId = searchParams.get('product_id');
  if (!productId) return NextResponse.json({ error: 'product_id required' }, { status: 400 });

  const supabase = getServerClient();
  const { data, error } = await supabase
    .from('shop_product_media')
    .select('id, position, role, variant_id, media:shop_media(*)')
    .eq('product_id', productId)
    .order('position');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const supabase = getServerClient();

  // --- link media to product ---
  if (body.action === 'link') {
    const { product_id, media_id, position, role, variant_id } = body;
    const { data, error } = await supabase
      .from('shop_product_media')
      .insert({ product_id, media_id, position: position ?? 0, role: role ?? 'gallery', variant_id })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  }

  // --- unlink media from product ---
  if (body.action === 'unlink') {
    const { id } = body;
    const { error } = await supabase.from('shop_product_media').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // --- reorder product media ---
  if (body.action === 'reorder') {
    const items: { id: string; position: number }[] = body.items;
    for (const item of items) {
      const { error } = await supabase
        .from('shop_product_media')
        .update({ position: item.position })
        .eq('id', item.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  // --- default: create media record ---
  const { storage_key, blurhash, width, height, alt, checksum, product_id } = body;
  const { data: media, error: mediaErr } = await supabase
    .from('shop_media')
    .insert({ storage_key, blurhash, width, height, alt, checksum })
    .select()
    .single();
  if (mediaErr) return NextResponse.json({ error: mediaErr.message }, { status: 500 });

  // optionally link to product
  if (product_id) {
    const { error: linkErr } = await supabase
      .from('shop_product_media')
      .insert({ product_id, media_id: media.id, position: body.position ?? 0, role: body.role ?? 'gallery' });
    if (linkErr) return NextResponse.json({ error: linkErr.message }, { status: 500 });
  }

  return NextResponse.json(media, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const supabase = getServerClient();
  const { error } = await supabase.from('shop_media').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

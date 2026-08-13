import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import sharp from 'sharp';
import { encode as encodeBlurhash } from 'blurhash';
import { createHash } from 'crypto';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const BUCKET = 'products';
const MASTER_MAX_EDGE = 2560;
const JPEG_QUALITY = 82;

async function processImage(input: Buffer) {
  const master = await sharp(input)
    .rotate()
    .resize(MASTER_MAX_EDGE, MASTER_MAX_EDGE, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });

  const { data: raw, info } = await sharp(master.data)
    .resize(32, 32, { fit: 'inside' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const blurhash = encodeBlurhash(new Uint8ClampedArray(raw), info.width, info.height, 4, 3);
  const checksum = createHash('sha256').update(master.data).digest('hex').slice(0, 16);

  return {
    buf: master.data,
    width: master.info.width,
    height: master.info.height,
    bytes: master.info.size,
    blurhash,
    checksum,
  };
}

// POST /api/bop/shop/catalog/media/upload
// multipart: file, product_id?, role? (hero|gallery|swatch|document)
export async function POST(req: NextRequest) {
  const supabase = getServerClient();

  let form: FormData;
  try { form = await req.formData(); }
  catch { return NextResponse.json({ error: 'invalid multipart body' }, { status: 400 }); }

  const file = form.get('file') as File | null;
  const productId = form.get('product_id') as string | null;
  const role = (form.get('role') as string) || 'gallery';
  const position = Number(form.get('position') ?? 0);

  if (!file) return NextResponse.json({ error: 'file required' }, { status: 400 });
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: 'max 10 MB' }, { status: 413 });

  const input = Buffer.from(await file.arrayBuffer());
  let processed;
  try {
    processed = await processImage(input);
  } catch {
    return NextResponse.json({ error: 'file could not be processed as an image' }, { status: 400 });
  }

  const safeName = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60) || 'img';
  const prefix = productId ? `products/${productId}` : 'products/unlinked';
  const path = `${prefix}/${Date.now()}-${safeName}.jpg`;

  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, processed.buf, {
    contentType: 'image/jpeg',
    upsert: false,
  });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);

  const { data: media, error: mediaErr } = await supabase
    .from('shop_media')
    .insert({
      storage_key: path,
      blurhash: processed.blurhash,
      width: processed.width,
      height: processed.height,
      alt: safeName.replace(/_/g, ' '),
      checksum: processed.checksum,
    })
    .select()
    .single();

  if (mediaErr) return NextResponse.json({ error: mediaErr.message }, { status: 500 });

  if (productId) {
    const { error: linkErr } = await supabase
      .from('shop_product_media')
      .insert({ product_id: productId, media_id: media.id, position, role });
    if (linkErr) return NextResponse.json({ error: linkErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    media: { ...media, public_url: pub.publicUrl },
  }, { status: 201 });
}

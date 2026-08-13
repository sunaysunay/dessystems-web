import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import sharp from 'sharp';
import { encode as encodeBlurhash } from 'blurhash';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const BUCKET = 'bop-listings';
const MAX_VIDEOS = 2;
const MAX_PHOTOS = 100;
const MASTER_MAX_EDGE = 2560; // AutoScout24-style zoom rung; nothing bigger is ever served
const JPEG_QUALITY = 82;

// Ingest processing: EXIF auto-rotate, strip ALL metadata (GPS from phone
// photos would otherwise leak addresses), re-encode to a JPEG master capped
// at 2560px, measure dimensions, compute a blurhash placeholder string.
async function processPhoto(input: Buffer) {
  const master = await sharp(input)
    .rotate() // apply EXIF orientation, then discard it
    .resize(MASTER_MAX_EDGE, MASTER_MAX_EDGE, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });
  const { data: raw, info } = await sharp(master.data)
    .resize(32, 32, { fit: 'inside' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const blurhash = encodeBlurhash(new Uint8ClampedArray(raw), info.width, info.height, 4, 3);
  return { buf: master.data, width: master.info.width, height: master.info.height, bytes: master.info.size, blurhash };
}

// POST multipart/form-data: file, listing_id, kind ('cover'|'gallery'|'tour_360'), locale? (cover only)
export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const form = await req.formData();
  const listingId = form.get('listing_id') as string;
  const kind = form.get('kind') as string;
  const locale = (form.get('locale') as string) || null;

  if (!listingId || !kind) return NextResponse.json({ error: 'listing_id and kind are required' }, { status: 400 });

  // tour_360: no file — just a pasted embed URL
  if (kind === 'tour_360') {
    const url = form.get('url') as string;
    if (!url) return NextResponse.json({ error: 'url is required for tour_360' }, { status: 400 });
    // must be a real absolute http(s) URL — garbage here crashes storefront <Image>/embeds
    try { const p = new URL(url); if (!/^https?:$/.test(p.protocol)) throw new Error(); }
    catch { return NextResponse.json({ error: 'tour URL must be a valid http(s) address' }, { status: 400 }); }
    await supabase.from('bop_listing_media').delete().eq('listing_id', listingId).eq('media_type', 'tour_360');
    const { data, error } = await supabase.from('bop_listing_media').insert({
      listing_id: listingId, media_type: 'tour_360', url, is_cover: false, sort_order: 0,
    }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ media: data });
  }

  const file = form.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'file is required' }, { status: 400 });

  const isVideo = file.type.startsWith('video/');
  if (kind === 'gallery' && isVideo) {
    const { count } = await supabase.from('bop_listing_media').select('*', { count: 'exact', head: true })
      .eq('listing_id', listingId).eq('media_type', 'video');
    if ((count ?? 0) >= MAX_VIDEOS) return NextResponse.json({ error: `max ${MAX_VIDEOS} videos reached` }, { status: 400 });
  }
  if (kind === 'gallery' && !isVideo) {
    const { count } = await supabase.from('bop_listing_media').select('*', { count: 'exact', head: true })
      .eq('listing_id', listingId).eq('media_type', 'photo').eq('is_cover', false);
    if ((count ?? 0) >= MAX_PHOTOS) return NextResponse.json({ error: `max ${MAX_PHOTOS} photos reached` }, { status: 400 });
  }

  // keep a sanitized version of the ORIGINAL filename in the storage path so the UI
  // can show a meaningful label (matches descamper's behavior) instead of a random string.
  const rawName = file.name.replace(/\.[^.]+$/, '');
  const safeName = rawName.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60) || 'file';

  let buf = Buffer.from(await file.arrayBuffer());
  let ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  let contentType = file.type;
  let meta: { width: number | null; height: number | null; bytes: number | null; blurhash: string | null } =
    { width: null, height: null, bytes: null, blurhash: null };

  if (!isVideo) {
    // photos always become JPEG masters — PNG/HEIC/etc. are normalized at ingest
    try {
      const p = await processPhoto(buf);
      buf = p.buf as Buffer<ArrayBuffer>; ext = 'jpg'; contentType = 'image/jpeg';
      meta = { width: p.width, height: p.height, bytes: p.bytes, blurhash: p.blurhash };
    } catch {
      return NextResponse.json({ error: 'file could not be processed as an image' }, { status: 400 });
    }
  }

  const path = `${listingId}/${kind}-${Date.now()}-${safeName}.${ext}`;
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, buf, { contentType, upsert: false });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const url = pub.publicUrl;

  if (kind === 'cover') {
    // replace any existing cover for this (listing, locale) — one cover per locale slot.
    // NOTE: supabase-js .eq('col', null) does NOT match SQL NULL rows — must use .is() for null.
    let delQuery = supabase.from('bop_listing_media').delete().eq('listing_id', listingId).eq('is_cover', true);
    delQuery = locale ? delQuery.eq('locale', locale) : delQuery.is('locale', null);
    await delQuery;
    // EN is now the primary cover slot (the old locale=NULL "Primary" slot is retired) —
    // also clear any legacy NULL-locale cover so old listings migrate cleanly onto EN.
    if (locale === 'en') {
      await supabase.from('bop_listing_media').delete().eq('listing_id', listingId).eq('is_cover', true).is('locale', null);
    }
    const { data, error } = await supabase.from('bop_listing_media').insert({
      listing_id: listingId, media_type: 'photo', url, is_cover: true, locale, sort_order: 0, label: locale ? `cover_${locale}` : 'cover',
      width: meta.width, height: meta.height, bytes: meta.bytes, blurhash: meta.blurhash,
    }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ media: data });
  }

  // gallery (photo or video, mixed order)
  const { data: maxRow } = await supabase.from('bop_listing_media').select('sort_order').eq('listing_id', listingId)
    .order('sort_order', { ascending: false }).limit(1).maybeSingle();
  const nextSort = (maxRow?.sort_order ?? -1) + 1;
  const { data, error } = await supabase.from('bop_listing_media').insert({
    listing_id: listingId, media_type: isVideo ? 'video' : 'photo', url, is_cover: false, sort_order: nextSort,
    width: meta.width, height: meta.height, bytes: meta.bytes, blurhash: meta.blurhash,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ media: data });
}

// One-off: re-ingest existing bop_listing_media photos through the sharp
// pipeline (EXIF rotate, strip, JPEG ≤2560 q82) and fill width/height/
// blurhash/bytes. Skips videos, tour_360, and rows already processed.
// Run from /opt/dessystems-console-dev:  node scripts/backfill-media-ingest.mjs
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { encode } from 'blurhash';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const get = (k) => (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim();
const supabase = createClient(get('NEXT_PUBLIC_SUPABASE_URL'), get('SUPABASE_SERVICE_ROLE_KEY') || get('SUPABASE_SERVICE_KEY'));
const BUCKET = 'bop-listings';

const { data: rows, error } = await supabase.from('bop_listing_media')
  .select('id, listing_id, url, media_type, blurhash').eq('media_type', 'photo').is('blurhash', null);
if (error) throw error;
console.log(rows.length + ' photos to process');

for (const r of rows) {
  try {
    const res = await fetch(r.url);
    if (!res.ok) { console.log('SKIP ' + r.id + ' fetch ' + res.status); continue; }
    const input = Buffer.from(await res.arrayBuffer());
    const master = await sharp(input).rotate()
      .resize(2560, 2560, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true }).toBuffer({ resolveWithObject: true });
    const { data: raw, info } = await sharp(master.data).resize(32, 32, { fit: 'inside' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const blurhash = encode(new Uint8ClampedArray(raw), info.width, info.height, 4, 3);

    const oldPath = decodeURIComponent(r.url.split('/' + BUCKET + '/')[1]);
    const newPath = oldPath.replace(/\.[^.]+$/, '') + '.jpg';
    const up = await supabase.storage.from(BUCKET).upload(newPath, master.data, { contentType: 'image/jpeg', upsert: true });
    if (up.error) { console.log('SKIP ' + r.id + ' upload: ' + up.error.message); continue; }
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(newPath);

    const upd = await supabase.from('bop_listing_media').update({
      url: pub.publicUrl, width: master.info.width, height: master.info.height,
      bytes: master.info.size, blurhash,
    }).eq('id', r.id);
    if (upd.error) { console.log('SKIP ' + r.id + ' db: ' + upd.error.message); continue; }
    if (newPath !== oldPath) await supabase.storage.from(BUCKET).remove([oldPath]);
    console.log('OK ' + r.id + ' ' + oldPath + ' -> ' + newPath + ' ' + master.info.width + 'x' + master.info.height + ' ' + Math.round(master.info.size / 1024) + 'KB');
  } catch (e) { console.log('SKIP ' + r.id + ' ' + e.message); }
}
console.log('done');

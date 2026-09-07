export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import {
  PORTAL_BUCKET, MAX_OFFER_ATTACHMENT_BYTES,
  ensurePortalBucket, listOfferFiles, sanitizeFileName,
} from '@/lib/portal/storage';

// GET ?offer_id= → list attachments with used/remaining capacity
export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const { searchParams } = new URL(req.url);
  const offerId = searchParams.get('offer_id') ?? '';
  if (!offerId) return NextResponse.json({ error: 'offer_id required' }, { status: 400 });

  const { files, error } = await listOfferFiles(supabase, offerId);
  if (error) return NextResponse.json({ error }, { status: 500 });
  const used = files.reduce((s, f) => s + f.size, 0);
  return NextResponse.json({ files, used_bytes: used, max_bytes: MAX_OFFER_ATTACHMENT_BYTES });
}

// POST multipart/form-data { offer_id, file } → upload one attachment (20 MB total per offer)
export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  let form: FormData;
  try { form = await req.formData(); } catch { return NextResponse.json({ error: 'multipart form-data expected' }, { status: 400 }); }

  const offerId = String(form.get('offer_id') || '');
  const file = form.get('file');
  if (!offerId || !(file instanceof File)) {
    return NextResponse.json({ error: 'offer_id and file required' }, { status: 400 });
  }

  const { data: offer } = await supabase.from('portal_offers').select('id').eq('id', offerId).single();
  if (!offer) return NextResponse.json({ error: 'offer not found' }, { status: 404 });

  await ensurePortalBucket(supabase);
  const { files } = await listOfferFiles(supabase, offerId);
  const used = files.reduce((s, f) => s + f.size, 0);
  if (used + file.size > MAX_OFFER_ATTACHMENT_BYTES) {
    const freeMb = Math.max(0, (MAX_OFFER_ATTACHMENT_BYTES - used) / 1048576).toFixed(1);
    return NextResponse.json({ error: `20 MB per offer exceeded — ${freeMb} MB free` }, { status: 413 });
  }

  const name = sanitizeFileName(file.name);
  const { error } = await supabase.storage
    .from(PORTAL_BUCKET)
    .upload(`offers/${offerId}/${name}`, Buffer.from(await file.arrayBuffer()), {
      contentType: file.type || 'application/octet-stream',
      upsert: true,
    });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, name, size: file.size });
}

// DELETE ?offer_id=&name= → remove one attachment
export async function DELETE(req: NextRequest) {
  const supabase = getServerClient();
  const { searchParams } = new URL(req.url);
  const offerId = searchParams.get('offer_id') ?? '';
  const name = searchParams.get('name') ?? '';
  if (!offerId || !name) return NextResponse.json({ error: 'offer_id and name required' }, { status: 400 });

  const { error } = await supabase.storage.from(PORTAL_BUCKET).remove([`offers/${offerId}/${sanitizeFileName(name)}`]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

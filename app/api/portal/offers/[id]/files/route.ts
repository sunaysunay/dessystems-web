export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { getPortalClient, logPortalEvent, requestMeta } from '@/lib/portal/auth';
import { PORTAL_BUCKET, listOfferFiles, sanitizeFileName } from '@/lib/portal/storage';

// GET            → list this offer's attachments (name, size)
// GET ?name=...  → redirect to a 1-hour signed URL for that file, logging the download
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const client = await getPortalClient(req);
  if (!client) return NextResponse.json({ ok: false }, { status: 401 });
  const { id } = await params;

  const supabase = getServerClient();
  const { data: offer } = await supabase
    .from('portal_offers')
    .select('id, title, status')
    .eq('id', id)
    .eq('client_id', client.id)
    .single();
  if (!offer || offer.status === 'draft') {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const name = searchParams.get('name');

  if (name) {
    const clean = sanitizeFileName(name);
    const { data: signed, error } = await supabase.storage
      .from(PORTAL_BUCKET)
      .createSignedUrl(`offers/${offer.id}/${clean}`, 3600);
    if (error || !signed?.signedUrl) {
      return NextResponse.json({ ok: false, error: 'file_unavailable' }, { status: 404 });
    }
    const { ip, user_agent } = requestMeta(req);
    await logPortalEvent({ clientId: client.id, type: 'view_document', refId: offer.id, detail: `${offer.title} · ${clean}`, ip, userAgent: user_agent });
    return NextResponse.redirect(signed.signedUrl, { status: 302 });
  }

  const { files, error } = await listOfferFiles(supabase, offer.id);
  if (error) return NextResponse.json({ ok: false, error }, { status: 500 });
  return NextResponse.json({ ok: true, files: files.map(f => ({ name: f.name, size: f.size })) });
}

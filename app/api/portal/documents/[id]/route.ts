export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { getPortalClient, logPortalEvent, requestMeta } from '@/lib/portal/auth';

// GET → redirect to the document (signed storage URL or external file_url), logging the view.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const client = await getPortalClient(req);
  if (!client) return NextResponse.json({ ok: false }, { status: 401 });
  const { id } = await params;

  const supabase = getServerClient();
  const { data: doc } = await supabase
    .from('portal_documents')
    .select('id, title, file_url, storage_path, status')
    .eq('id', id)
    .eq('client_id', client.id)
    .single();

  if (!doc || doc.status !== 'active') {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }

  const { ip, user_agent } = requestMeta(req);
  await logPortalEvent({ clientId: client.id, type: 'view_document', refId: doc.id, detail: doc.title, ip, userAgent: user_agent });

  if (doc.storage_path) {
    const { data: signed, error } = await supabase.storage
      .from('portal-docs')
      .createSignedUrl(doc.storage_path, 3600);
    if (error || !signed?.signedUrl) {
      return NextResponse.json({ ok: false, error: 'file_unavailable' }, { status: 502 });
    }
    return NextResponse.redirect(signed.signedUrl, { status: 302 });
  }

  if (doc.file_url) return NextResponse.redirect(doc.file_url, { status: 302 });

  return NextResponse.json({ ok: false, error: 'no_file' }, { status: 404 });
}

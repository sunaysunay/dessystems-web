export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { getPortalClient } from '@/lib/portal/auth';

// GET → dashboard payload: client, offers (with latest version totals), documents
export async function GET(req: NextRequest) {
  const client = await getPortalClient(req);
  if (!client) return NextResponse.json({ ok: false }, { status: 401 });

  const supabase = getServerClient();

  const [{ data: offers }, { data: documents }] = await Promise.all([
    supabase
      .from('portal_offers')
      .select('id, offer_no, title, summary, status, current_version, currency, valid_until, decided_at, updated_at, portal_offer_versions(version_no, total)')
      .eq('client_id', client.id)
      .neq('status', 'draft')
      .order('updated_at', { ascending: false }),
    supabase
      .from('portal_documents')
      .select('id, title, note, category, mime_type, size_bytes, version, is_primary, updated_at')
      .eq('client_id', client.id)
      .eq('status', 'active')
      .order('sort_order', { ascending: true }),
  ]);

  const shaped = (offers ?? []).map((o: any) => {
    const versions = Array.isArray(o.portal_offer_versions) ? o.portal_offer_versions : [];
    const current = versions.find((v: any) => v.version_no === o.current_version);
    const { portal_offer_versions: _drop, ...rest } = o;
    return { ...rest, total: current?.total ?? null };
  });

  return NextResponse.json({
    ok: true,
    client: { slug: client.slug, name: client.name, contact_name: client.contact_name, locale: client.locale },
    offers: shaped,
    documents: documents ?? [],
  });
}

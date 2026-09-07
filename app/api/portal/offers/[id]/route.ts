export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { getPortalClient, logPortalEvent, requestMeta } from '@/lib/portal/auth';

// GET → full offer: versions (desc) + client responses. Marks 'sent' offers as 'viewed'.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const client = await getPortalClient(req);
  if (!client) return NextResponse.json({ ok: false }, { status: 401 });
  const { id } = await params;

  const supabase = getServerClient();
  const { data: offer } = await supabase
    .from('portal_offers')
    .select('*, portal_offer_versions(*), portal_offer_responses(*)')
    .eq('id', id)
    .eq('client_id', client.id)
    .single();

  if (!offer || offer.status === 'draft') {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }

  const { ip, user_agent } = requestMeta(req);
  if (offer.status === 'sent') {
    await supabase.from('portal_offers').update({ status: 'viewed', updated_at: new Date().toISOString() }).eq('id', offer.id);
    offer.status = 'viewed';
  }
  await logPortalEvent({ clientId: client.id, type: 'view_offer', refId: offer.id, detail: offer.title, ip, userAgent: user_agent });

  const versions = (offer.portal_offer_versions ?? []).sort((a: any, b: any) => b.version_no - a.version_no);
  const responses = (offer.portal_offer_responses ?? []).sort(
    (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  const { portal_offer_versions: _v, portal_offer_responses: _r, ...rest } = offer;

  return NextResponse.json({ ok: true, offer: rest, versions, responses, locale: client.locale });
}

// POST { action: 'approved'|'declined'|'changes_requested'|'comment', comment?, signer_name? }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const client = await getPortalClient(req);
  if (!client) return NextResponse.json({ ok: false }, { status: 401 });
  const { id } = await params;

  let body: { action?: string; comment?: string; signer_name?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 }); }

  const action = String(body.action || '');
  if (!['approved', 'declined', 'changes_requested', 'comment'].includes(action)) {
    return NextResponse.json({ ok: false, error: 'bad_action' }, { status: 400 });
  }
  const comment = String(body.comment || '').trim().slice(0, 4000) || null;
  const signer = String(body.signer_name || '').trim().slice(0, 120) || null;

  if ((action === 'approved' || action === 'declined') && !signer) {
    return NextResponse.json({ ok: false, error: 'signer_required' }, { status: 400 });
  }
  if ((action === 'changes_requested' || action === 'comment') && !comment) {
    return NextResponse.json({ ok: false, error: 'comment_required' }, { status: 400 });
  }

  const supabase = getServerClient();
  const { data: offer } = await supabase
    .from('portal_offers')
    .select('id, title, status, current_version, valid_until')
    .eq('id', id)
    .eq('client_id', client.id)
    .single();

  if (!offer || offer.status === 'draft') return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  if (['approved', 'declined', 'withdrawn'].includes(offer.status) && action !== 'comment') {
    return NextResponse.json({ ok: false, error: 'already_decided' }, { status: 409 });
  }
  if (offer.valid_until && new Date(offer.valid_until) < new Date() && action === 'approved') {
    return NextResponse.json({ ok: false, error: 'offer_expired' }, { status: 409 });
  }

  const { ip, user_agent } = requestMeta(req);
  const { error: insErr } = await supabase.from('portal_offer_responses').insert({
    offer_id: offer.id,
    version_no: offer.current_version,
    action,
    comment,
    signer_name: signer,
    ip,
    user_agent,
  });
  if (insErr) return NextResponse.json({ ok: false, error: insErr.message }, { status: 500 });

  if (action !== 'comment') {
    const decided = action === 'approved' || action === 'declined';
    await supabase
      .from('portal_offers')
      .update({
        status: action,
        decided_at: decided ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', offer.id);
  }

  await logPortalEvent({ clientId: client.id, type: action, refId: offer.id, detail: comment ?? offer.title, ip, userAgent: user_agent });

  return NextResponse.json({ ok: true, status: action === 'comment' ? offer.status : action });
}

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { notifyOfferByEmail } from '@/lib/portal/mail';

type LineItemIn = { description?: string; quantity?: number; unit_price?: number; optional?: boolean };

function computeTotals(items: LineItemIn[], vatRate: number) {
  const line_items = (items ?? [])
    .filter(i => String(i.description || '').trim())
    .map(i => {
      const quantity = Number(i.quantity ?? 1) || 1;
      const unit_price = Number(i.unit_price ?? 0) || 0;
      return {
        description: String(i.description).trim(),
        quantity,
        unit_price,
        total: Math.round(quantity * unit_price * 100) / 100,
        optional: !!i.optional,
      };
    });
  const subtotal = Math.round(line_items.reduce((s, i) => s + i.total, 0) * 100) / 100;
  const vat_amount = Math.round(subtotal * (vatRate / 100) * 100) / 100;
  const total = Math.round((subtotal + vat_amount) * 100) / 100;
  return { line_items, subtotal, vat_amount, total };
}

async function nextOfferNo(supabase: ReturnType<typeof getServerClient>) {
  const year = new Date().getFullYear();
  const { count } = await supabase
    .from('portal_offers')
    .select('id', { count: 'exact', head: true })
    .like('offer_no', `OFF-${year}-%`);
  return `OFF-${year}-${String((count ?? 0) + 1).padStart(3, '0')}`;
}

// GET ?client_id= → offers with versions and responses
export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get('client_id') ?? '';

  let q = supabase
    .from('portal_offers')
    .select('*, portal_clients(name, slug), portal_offer_versions(*), portal_offer_responses(*)')
    .order('updated_at', { ascending: false })
    .limit(200);
  if (clientId) q = q.eq('client_id', clientId);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const offers = (data ?? []).map((o: any) => ({
    ...o,
    portal_offer_versions: (o.portal_offer_versions ?? []).sort((a: any, b: any) => b.version_no - a.version_no),
    portal_offer_responses: (o.portal_offer_responses ?? []).sort(
      (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    ),
  }));
  return NextResponse.json({ offers });
}

// POST { client_id, title, summary?, valid_until?, currency?, vat_rate?, line_items, change_note?, send? }
export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const body = await req.json();

  const clientId = String(body.client_id || '');
  const title = String(body.title || '').trim();
  if (!clientId || !title) return NextResponse.json({ error: 'client_id and title required' }, { status: 400 });

  const vatRate = Number(body.vat_rate ?? 21);
  const { line_items, subtotal, vat_amount, total } = computeTotals(body.line_items ?? [], vatRate);
  // A draft may start empty — items can be added before sending. Sending requires items.
  if (body.send && line_items.length === 0) {
    return NextResponse.json({ error: 'at least one line item required to send' }, { status: 400 });
  }

  const { data: offer, error: offerErr } = await supabase
    .from('portal_offers')
    .insert({
      client_id: clientId,
      offer_no: await nextOfferNo(supabase),
      title,
      summary: body.summary || null,
      status: body.send ? 'sent' : 'draft',
      current_version: 1,
      currency: body.currency || 'EUR',
      valid_until: body.valid_until || null,
    })
    .select()
    .single();
  if (offerErr) return NextResponse.json({ error: offerErr.message }, { status: 500 });

  const { error: verErr } = await supabase.from('portal_offer_versions').insert({
    offer_id: offer.id,
    version_no: 1,
    change_note: body.change_note || null,
    line_items,
    subtotal,
    vat_rate: vatRate,
    vat_amount,
    total,
    file_url: body.file_url || null,
    created_by: body.created_by || null,
  });
  if (verErr) {
    await supabase.from('portal_offers').delete().eq('id', offer.id);
    return NextResponse.json({ error: verErr.message }, { status: 500 });
  }
  if (body.send) {
    await notifyOfferByEmail({ clientId: clientId, offerId: offer.id, offerTitle: offer.title, kind: 'offer_sent' });
  }
  return NextResponse.json({ offer });
}

// DELETE ?id= → permanently remove an offer with its versions and responses (FK cascade)
export async function DELETE(req: NextRequest) {
  const supabase = getServerClient();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id') ?? '';
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { error } = await supabase.from('portal_offers').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// PATCH { id, action: 'send' | 'withdraw' | 'update' | 'new_version', ... }
export async function PATCH(req: NextRequest) {
  const supabase = getServerClient();
  const body = await req.json();
  const id = String(body.id || '');
  const action = String(body.action || 'update');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { data: offer } = await supabase.from('portal_offers').select('*').eq('id', id).single();
  if (!offer) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const now = new Date().toISOString();

  if (action === 'send') {
    if (!['draft', 'changes_requested'].includes(offer.status)) {
      return NextResponse.json({ error: `cannot send from status ${offer.status}` }, { status: 409 });
    }
    const { data: cur } = await supabase
      .from('portal_offer_versions')
      .select('line_items')
      .eq('offer_id', id)
      .eq('version_no', offer.current_version)
      .single();
    if (!Array.isArray(cur?.line_items) || cur.line_items.length === 0) {
      return NextResponse.json({ error: 'add line items before sending (use Edit items)' }, { status: 400 });
    }
    const { error } = await supabase.from('portal_offers').update({ status: 'sent', updated_at: now }).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await notifyOfferByEmail({ clientId: offer.client_id, offerId: offer.id, offerTitle: offer.title, kind: 'offer_sent' });
    return NextResponse.json({ ok: true, status: 'sent' });
  }

  // Record a decision received outside the portal (phone, e-mail, on paper)
  if (action === 'mark_approved' || action === 'mark_declined') {
    if (offer.status === 'draft') return NextResponse.json({ error: 'send the offer first' }, { status: 409 });
    if (['approved', 'declined', 'withdrawn'].includes(offer.status)) {
      return NextResponse.json({ error: `offer already ${offer.status}` }, { status: 409 });
    }
    const decision = action === 'mark_approved' ? 'approved' : 'declined';
    const { error: respErr } = await supabase.from('portal_offer_responses').insert({
      offer_id: id,
      version_no: offer.current_version,
      action: decision,
      comment: body.comment || `Recorded manually by DES (outside the portal)`,
      signer_name: body.signer_name || null,
    });
    if (respErr) return NextResponse.json({ error: respErr.message }, { status: 500 });
    const { error } = await supabase
      .from('portal_offers')
      .update({ status: decision, decided_at: now, updated_at: now })
      .eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, status: decision });
  }

  if (action === 'withdraw') {
    const { error } = await supabase.from('portal_offers').update({ status: 'withdrawn', updated_at: now }).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, status: 'withdrawn' });
  }

  if (action === 'new_version') {
    // A new version answers a change request (or revises a live offer) and re-opens it for response.
    if (['approved', 'declined'].includes(offer.status)) {
      return NextResponse.json({ error: 'offer already decided' }, { status: 409 });
    }
    const vatRate = Number(body.vat_rate ?? 21);
    const { line_items, subtotal, vat_amount, total } = computeTotals(body.line_items ?? [], vatRate);
    // Items are only mandatory when this creates a version the client will see;
    // a draft may be saved incomplete (items without a description are dropped).
    if (line_items.length === 0 && offer.status !== 'draft') {
      return NextResponse.json({ error: 'at least one line item required' }, { status: 400 });
    }

    // On a draft, edits replace the current version in place and it stays a draft
    if (offer.status === 'draft') {
      const { error: updErr } = await supabase
        .from('portal_offer_versions')
        .update({ line_items, subtotal, vat_rate: vatRate, vat_amount, total, change_note: body.change_note || null, file_url: body.file_url || null })
        .eq('offer_id', id)
        .eq('version_no', offer.current_version);
      if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
      await supabase.from('portal_offers').update({ updated_at: now }).eq('id', id);
      return NextResponse.json({ ok: true, version_no: offer.current_version, status: 'draft' });
    }

    const versionNo = offer.current_version + 1;
    const { error: verErr } = await supabase.from('portal_offer_versions').insert({
      offer_id: id,
      version_no: versionNo,
      change_note: body.change_note || null,
      line_items,
      subtotal,
      vat_rate: vatRate,
      vat_amount,
      total,
      file_url: body.file_url || null,
      created_by: body.created_by || null,
    });
    if (verErr) return NextResponse.json({ error: verErr.message }, { status: 500 });

    const { error } = await supabase
      .from('portal_offers')
      .update({ current_version: versionNo, status: 'sent', decided_at: null, updated_at: now })
      .eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await notifyOfferByEmail({ clientId: offer.client_id, offerId: offer.id, offerTitle: offer.title, kind: 'offer_updated' });
    return NextResponse.json({ ok: true, version_no: versionNo, status: 'sent' });
  }

  // action === 'update' → offer metadata only
  const patch: Record<string, any> = { updated_at: now };
  for (const k of ['title', 'summary', 'valid_until', 'currency'] as const) {
    if (k in body) patch[k] = body[k] || null;
  }
  const { data, error } = await supabase.from('portal_offers').update(patch).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ offer: data });
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { callerUid } from "@/lib/api-guard";
import { send } from '@/lib/comm/send';

export const dynamic = 'force-dynamic';

// Valid status transitions (application-layer state machine, per spec §4)
const TRANSITIONS: Record<string, string[]> = {
  new:        ['reviewing', 'declined_by_us', 'expired', 'lost'],
  reviewing:  ['offer_sent', 'declined_by_us', 'expired', 'lost'],
  offer_sent: ['negotiating', 'accepted', 'rejected_by_seller', 'expired', 'lost'],
  negotiating:['accepted', 'rejected_by_seller', 'declined_by_us', 'expired', 'lost'],
  accepted:   ['purchased', 'lost'],
  purchased: [], declined_by_us: [], rejected_by_seller: [], expired: [], lost: [],
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getServerClient();

  const { data: lead, error } = await supabase.from('sell_leads').select('*').eq('id', id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });

  const { data: images } = await supabase.from('sell_lead_images')
    .select('id, storage_path, width, height, sort_order').eq('lead_id', id).order('sort_order');
  const withUrls = [];
  for (const img of images ?? []) {
    const { data: signed } = await supabase.storage.from('sell-leads').createSignedUrl(img.storage_path, 3600);
    withUrls.push({ ...img, url: signed?.signedUrl ?? null });
  }

  const { data: events } = await supabase.from('sell_lead_events')
    .select('*').eq('lead_id', id).order('created_at', { ascending: false }).limit(100);

  return NextResponse.json({ lead, images: withUrls, events: events ?? [] });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getServerClient();
  const actor = await callerUid() || "console";
  const b = await req.json();

  const { data: lead, error: le } = await supabase.from('sell_leads').select('*').eq('id', id).single();
  if (le) return NextResponse.json({ error: le.message }, { status: 404 });

  const patch: Record<string, unknown> = {};
  const events: any[] = [];

  // status transition — validated against the state machine
  if (b.status && b.status !== lead.status) {
    if (!TRANSITIONS[lead.status]?.includes(b.status)) {
      return NextResponse.json({ error: `invalid transition ${lead.status} → ${b.status}` }, { status: 400 });
    }
    patch.status = b.status;
    events.push({ lead_id: id, event: 'status_changed', actor, payload: { from: lead.status, to: b.status } });
  }

  for (const k of ['valuation_low_eur', 'valuation_high_eur', 'our_offer_eur', 'vehicle_type'] as const) {
    if (b[k] !== undefined && b[k] !== lead[k]) patch[k] = b[k];
  }

  if (b.appendNote?.trim()) {
    const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
    patch.internal_notes = `${lead.internal_notes ? lead.internal_notes + '\n' : ''}[${stamp} ${actor}] ${b.appendNote.trim()}`;
    events.push({ lead_id: id, event: 'note_added', actor, payload: { note: b.appendNote.trim() } });
  }

  // send offer email via Comm Center (requires our_offer_eur)
  if (b.action === 'send_offer') {
    const offer = Number(b.our_offer_eur ?? lead.our_offer_eur);
    if (!offer) return NextResponse.json({ error: 'our_offer_eur required before sending the offer' }, { status: 400 });
    patch.our_offer_eur = offer;
    // persist offer amount before sending so the template resolver picks it up
    await supabase.from('sell_leads').update({ our_offer_eur: offer }).eq('id', id);
    try {
      await send({
        contextType: 'sell_lead', recordId: id, tenantId: lead.tenant_id ?? 300,
        category: 'sell_lead.offer', locale: lead.locale ?? 'en',
      });
      if (TRANSITIONS[lead.status]?.includes('offer_sent')) patch.status = 'offer_sent';
      events.push({ lead_id: id, event: 'offer_sent', actor, payload: { offer_eur: offer, to: lead.seller_email } });
      events.push({ lead_id: id, event: 'email_sent', actor, payload: { template: 'sell_lead.offer', locale: lead.locale } });
    } catch (e: any) {
      return NextResponse.json({ error: `send failed: ${e.message}` }, { status: 500 });
    }
  }

  if (Object.keys(patch).length) {
    const { error } = await supabase.from('sell_leads').update(patch).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (events.length) await supabase.from('sell_lead_events').insert(events);

  const { data: fresh } = await supabase.from('sell_leads').select('*').eq('id', id).single();
  return NextResponse.json({ ok: true, lead: fresh });
}

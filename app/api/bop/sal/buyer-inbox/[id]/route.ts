import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { callerUid } from '@/lib/api-guard';
import { sendBopMail, smtpConfigured } from '@/lib/bop-mailer';

export const dynamic = 'force-dynamic';

// bop_listings has no flat brand/model/price/slug — joins + computed slug
function flatListing(l: any) {
  if (!l) return null;
  const brand = l.bop_brands?.name ?? '';
  const model = l.bop_models?.name ?? '';
  const pricing = Array.isArray(l.bop_listing_pricing) ? l.bop_listing_pricing[0] : l.bop_listing_pricing;
  const base = [brand, model, l.year].filter(Boolean).join(' ').toLowerCase()
    .normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return {
    ref_no: l.ref_no, year: l.year, brand, model,
    price: pricing?.asking_price ?? 0,
    slug: l.ref_no ? `${l.ref_no}-${base}` : null,
  };
}

// GET — thread with messages + buyer contact; opening clears des_unread
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getServerClient();

  const { data: convRaw, error } = await supabase.from('dm_conversations')
    .select('*, bop_listings(id, ref_no, year, bop_brands(name), bop_models(name), bop_listing_pricing(asking_price))')
    .eq('id', id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  const conv = { ...convRaw, bop_listings: flatListing(convRaw.bop_listings) };

  const { data: msgs } = await supabase.from('dm_messages')
    .select('*').eq('conversation_id', id).order('created_at').limit(500);
  const { data: profile } = await supabase.from('dm_profiles')
    .select('display_name, phone, account_type, company_name, company_vat, dealer_verified').eq('id', conv.buyer_id).maybeSingle();
  const { data: userRow } = await supabase.auth.admin.getUserById(conv.buyer_id);

  await supabase.from('dm_conversations').update({ des_unread: 0 }).eq('id', id);

  return NextResponse.json({
    conversation: conv, messages: msgs ?? [],
    buyer: { ...(profile ?? {}), email: userRow?.user?.email ?? null },
  });
}

// POST { body } — DES reply; notifies the buyer by email (deep link only)
// PATCH { status } — close/block/reopen
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getServerClient();
  const actor = await callerUid() || 'console';
  const b = await req.json();
  const body = String(b.body ?? '').slice(0, 4000);
  if (!body) return NextResponse.json({ error: 'empty' }, { status: 400 });

  const { data: convRaw, error: ce } = await supabase.from('dm_conversations')
    .select('*, bop_listings(ref_no, year, bop_brands(name), bop_models(name), bop_listing_pricing(asking_price))')
    .eq('id', id).single();
  if (ce) return NextResponse.json({ error: ce.message }, { status: 404 });
  const conv = { ...convRaw, bop_listings: flatListing(convRaw.bop_listings) };

  const { data: msg, error } = await supabase.from('dm_messages').insert({
    conversation_id: id, sender: 'des', sender_id: null, kind: 'text', body,
  }).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('dm_conversations').update({
    last_message_at: new Date().toISOString(),
    buyer_unread: (conv.buyer_unread ?? 0) + 1,
    status: 'open',
  }).eq('id', id);

  // buyer email notification — link back to the platform, content stays on-platform
  if (smtpConfigured()) {
    try {
      const { data: userRow } = await supabase.auth.admin.getUserById(conv.buyer_id);
      const email = userRow?.user?.email;
      if (email) {
        const l = conv.bop_listings;
        const url = `https://desmobil.com/nl/account/messages?c=${id}`;
        await sendBopMail(email,
          `New reply about ${l?.brand ?? ''} ${l?.model ?? ''} — DESMOBIL`,
          `<div style="font-family:Arial;font-size:13px;max-width:520px">
             <p>You have a new reply from DESMOBIL about <b>${l?.brand ?? ''} ${l?.model ?? ''}</b>.</p>
             <p><a href="${url}" style="background:#ea580c;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">Read &amp; reply</a></p>
           </div>`);
      }
    } catch { /* notify is best-effort */ }
  }

  return NextResponse.json({ ok: true, message: msg, actor });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getServerClient();
  const b = await req.json();

  // console-side dealer verification toggle (KVK/VAT checked manually by DES)
  if (typeof b.dealerVerified === 'boolean') {
    const { data: conv, error: ce } = await supabase.from('dm_conversations')
      .select('buyer_id').eq('id', id).single();
    if (ce) return NextResponse.json({ error: ce.message }, { status: 404 });
    const { error } = await supabase.from('dm_profiles')
      .update({ dealer_verified: b.dealerVerified }).eq('id', conv.buyer_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, dealer_verified: b.dealerVerified });
  }

  if (!['open', 'closed', 'blocked'].includes(b.status)) {
    return NextResponse.json({ error: 'bad status' }, { status: 400 });
  }
  const { error } = await supabase.from('dm_conversations').update({ status: b.status }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

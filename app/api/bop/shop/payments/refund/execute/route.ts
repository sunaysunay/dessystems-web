import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { id, executed_by, mollie_refund_id, credit_note_id } = body;

  if (!id || !executed_by) {
    return NextResponse.json({ error: 'id and executed_by are required' }, { status: 400 });
  }

  const supabase = getServerClient();

  const { data: existing, error: fetchErr } = await supabase
    .from('shop_refund_requests')
    .select('status')
    .eq('id', id)
    .single();

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: 'refund request not found' }, { status: 404 });
  if (existing.status !== 'approved') {
    return NextResponse.json({ error: `cannot execute a request with status '${existing.status}'` }, { status: 409 });
  }

  // Auto-generate credit note if not already provided
  let resolvedCreditNoteId = credit_note_id ?? null;
  if (!resolvedCreditNoteId) {
    const { data: refundReq } = await supabase.from('shop_refund_requests').select('order_id, amount_cents, reason, currency').eq('id', id).single();
    if (refundReq) {
      const { data: inv } = await supabase.from('shop_invoices').select('id').eq('order_id', refundReq.order_id).order('created_at', { ascending: false }).limit(1).maybeSingle();
      const { data: cn } = await supabase.from('shop_credit_notes').insert({
        order_id: refundReq.order_id,
        invoice_id: inv?.id ?? null,
        refund_request_id: id,
        reason: refundReq.reason ?? 'Refund executed',
        currency: refundReq.currency ?? 'EUR',
        subtotal: (refundReq.amount_cents ?? 0) / 100,
        tax: 0,
        total: (refundReq.amount_cents ?? 0) / 100,
        status: 'issued',
        issued_at: new Date().toISOString(),
      }).select('id').single();
      if (cn) resolvedCreditNoteId = cn.id;
    }
  }

  const { data, error } = await supabase
    .from('shop_refund_requests')
    .update({
      status: 'executed',
      executed_by,
      executed_at: new Date().toISOString(),
      mollie_refund_id: mollie_refund_id ?? null,
      credit_note_id: resolvedCreditNoteId,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ refund_request: data, credit_note_id: resolvedCreditNoteId });
}

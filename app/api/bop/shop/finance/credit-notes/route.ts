import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const limit = Math.min(100, Math.max(1, Number(sp.get('limit') ?? 50)));
  const offset = Math.max(0, Number(sp.get('offset') ?? 0));
  const status = sp.get('status');
  const orderId = sp.get('order_id');
  const invoiceId = sp.get('invoice_id');

  const supabase = getServerClient();
  let query = supabase
    .from('shop_credit_notes')
    .select('*', { count: 'exact' });

  if (status) query = query.eq('status', status);
  if (orderId) query = query.eq('order_id', orderId);
  if (invoiceId) query = query.eq('invoice_id', invoiceId);

  query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ credit_notes: data, total: count ?? 0 });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { order_id, invoice_id, refund_request_id, reason, currency, lines } = body;

  if (!order_id) {
    return NextResponse.json({ error: 'order_id is required' }, { status: 400 });
  }

  const supabase = getServerClient();
  const { data: creditNote, error } = await supabase
    .from('shop_credit_notes')
    .insert({
      order_id,
      invoice_id: invoice_id ?? null,
      refund_request_id: refund_request_id ?? null,
      reason: reason ?? null,
      currency: currency ?? 'EUR',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (lines?.length) {
    const rows = lines.map((l: { variant_id?: string; description?: string; qty?: number; unit_price?: number; tax_rate?: number }) => ({
      credit_note_id: creditNote.id,
      variant_id: l.variant_id ?? null,
      description: l.description ?? null,
      qty: l.qty ?? 1,
      unit_price: l.unit_price ?? 0,
      tax_rate: l.tax_rate ?? 0,
    }));

    const { error: linesError } = await supabase
      .from('shop_credit_note_lines')
      .insert(rows);

    if (linesError) return NextResponse.json({ error: linesError.message }, { status: 500 });

    const subtotal = rows.reduce((sum: number, r: { qty: number; unit_price: number }) => sum + r.qty * r.unit_price, 0);
    const tax = rows.reduce((sum: number, r: { qty: number; unit_price: number; tax_rate: number }) => sum + r.qty * r.unit_price * r.tax_rate, 0);

    const { error: updateErr } = await supabase
      .from('shop_credit_notes')
      .update({ subtotal, tax, total: subtotal + tax })
      .eq('id', creditNote.id);

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

    creditNote.subtotal = subtotal;
    creditNote.tax = tax;
    creditNote.total = subtotal + tax;
  }

  return NextResponse.json({ credit_note: creditNote }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, status, reason, pdf_storage_key } = body;

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (status !== undefined) updates.status = status;
  if (reason !== undefined) updates.reason = reason;
  if (pdf_storage_key !== undefined) updates.pdf_storage_key = pdf_storage_key;

  if (status === 'issued') {
    updates.issued_at = new Date().toISOString();
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'no fields to update' }, { status: 400 });
  }

  const supabase = getServerClient();
  const { data, error } = await supabase
    .from('shop_credit_notes')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ credit_note: data });
}

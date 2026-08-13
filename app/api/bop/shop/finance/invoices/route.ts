import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const status = sp.get('status');
  const orderId = sp.get('order_id');
  const customerId = sp.get('customer_id');
  const from = sp.get('from');
  const to = sp.get('to');
  const limit = Math.min(100, Math.max(1, Number(sp.get('limit') ?? 50)));
  const offset = Math.max(0, Number(sp.get('offset') ?? 0));
  const include = sp.get('include');

  const supabase = getServerClient();
  let query = supabase.from('shop_invoices').select('*', { count: 'exact' });

  if (status) query = query.eq('status', status);
  if (orderId) query = query.eq('order_id', orderId);
  if (customerId) query = query.eq('customer_id', customerId);
  if (from) query = query.gte('created_at', from);
  if (to) query = query.lte('created_at', to);

  query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

  const { data: invoices, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (include === 'lines' && invoices?.length) {
    const ids = invoices.map((inv) => inv.id);
    const { data: lines, error: linesErr } = await supabase
      .from('shop_invoice_lines')
      .select('*')
      .in('invoice_id', ids);
    if (linesErr) return NextResponse.json({ error: linesErr.message }, { status: 500 });

    const linesByInvoice = new Map<string, typeof lines>();
    for (const line of lines ?? []) {
      const arr = linesByInvoice.get(line.invoice_id) ?? [];
      arr.push(line);
      linesByInvoice.set(line.invoice_id, arr);
    }
    for (const inv of invoices) {
      (inv as any).lines = linesByInvoice.get(inv.id) ?? [];
    }
  }

  return NextResponse.json({ invoices, total: count ?? 0 });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { order_id, btw_regime, locale, notes, billing_name, billing_address, due_date, lines } = body;

  if (!order_id) {
    return NextResponse.json({ error: 'order_id is required' }, { status: 400 });
  }

  let subtotal_cents = 0;
  let tax_cents = 0;
  let total_cents = 0;
  if (lines?.length) {
    for (const l of lines) {
      subtotal_cents += l.subtotal_cents ?? 0;
      tax_cents += l.tax_cents ?? 0;
      total_cents += l.total_cents ?? 0;
    }
  }

  const supabase = getServerClient();
  const { data: invoice, error } = await supabase
    .from('shop_invoices')
    .insert({
      order_id,
      btw_regime: btw_regime ?? null,
      locale: locale ?? null,
      notes: notes ?? null,
      billing_name: billing_name ?? null,
      billing_address: billing_address ?? null,
      due_date: due_date ?? null,
      subtotal_cents,
      tax_cents,
      total_cents,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (lines?.length) {
    const rows = lines.map((l: any) => ({ ...l, invoice_id: invoice.id }));
    const { error: linesErr } = await supabase.from('shop_invoice_lines').insert(rows);
    if (linesErr) return NextResponse.json({ error: linesErr.message }, { status: 500 });
  }

  return NextResponse.json({ invoice }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, ...fields } = body;

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const allowed = ['status', 'notes', 'due_date', 'billing_name', 'billing_address', 'btw_regime', 'locale'];
  const updates: Record<string, any> = {};
  for (const key of allowed) {
    if (key in fields) updates[key] = fields[key];
  }

  if (updates.status === 'issued') updates.issued_at = new Date().toISOString();
  if (updates.status === 'paid') updates.paid_at = new Date().toISOString();

  const supabase = getServerClient();
  const { data, error } = await supabase
    .from('shop_invoices')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ invoice: data });
}

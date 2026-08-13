import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const body = await req.json();

  const { data: payment, error } = await supabase
    .from('fin_payments')
    .insert(body)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Check total paid vs invoice gross → mark paid or partial
  const { data: inv } = await supabase
    .from('fin_invoices')
    .select('gross, fin_payments(amount)')
    .eq('id', body.invoice_id)
    .single();

  if (inv) {
    const totalPaid = (inv.fin_payments ?? []).reduce((s: number, p: any) => s + (p.amount ?? 0), 0);
    const newStatus = totalPaid >= inv.gross ? 'paid' : 'partial';
    await supabase.from('fin_invoices')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', body.invoice_id);
  }

  return NextResponse.json({ payment });
}

export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const { searchParams } = new URL(req.url);
  const invoice_id = searchParams.get('invoice_id') ?? '';
  let q = supabase
    .from('fin_payments')
    .select('*, fin_invoices(id, invoice_number)')
    .order('created_at', { ascending: false })
    .limit(500);
  if (invoice_id) q = q.eq('invoice_id', invoice_id);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ payments: data ?? [] });
}

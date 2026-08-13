import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const { searchParams } = new URL(req.url);
  const status     = searchParams.get('status') ?? '';
  const partner_id = searchParams.get('partner_id') ?? '';

  let q = supabase
    .from('fin_invoices')
    .select(`*, mdm_business_partners(id, name, company_name), sal_quotations(id, quote_number), sal_orders(id, order_number)`)
    .order('created_at', { ascending: false })
    .limit(200);

  if (status)     q = q.eq('status', status);
  if (partner_id) q = q.eq('partner_id', partner_id);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Auto-mark overdue
  const now = new Date().toISOString().split('T')[0];
  const updated = (data ?? []).map((inv: any) => {
    if (['sent', 'partial'].includes(inv.status) && inv.due_date && inv.due_date < now) {
      return { ...inv, status: 'overdue' };
    }
    return inv;
  });

  return NextResponse.json({ invoices: updated });
}

export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const body = await req.json();

  const now = new Date();
  const prefix = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const { count } = await supabase
    .from('fin_invoices')
    .select('*', { count: 'exact', head: true })
    .like('invoice_number', `${prefix}%`);
  const seq = String((count ?? 0) + 1).padStart(4, '0');
  const invoice_number = `${prefix}-${seq}`;

  const { data, error } = await supabase
    .from('fin_invoices')
    .insert({ ...body, invoice_number, status: 'draft' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ invoice: data });
}

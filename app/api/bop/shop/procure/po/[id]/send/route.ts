import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getServerClient();

  const { data: po, error: poErr } = await supabase
    .from('shop_purchase_orders')
    .select('*, supplier:shop_suppliers(id, name, contact_email), lines:shop_po_lines(*)')
    .eq('id', id)
    .single();

  if (poErr || !po) return NextResponse.json({ error: 'PO not found' }, { status: 404 });
  if (po.status !== 'approved') return NextResponse.json({ error: 'PO must be in approved status to send' }, { status: 400 });

  const supplierEmail = po.supplier?.contact_email;
  if (!supplierEmail) return NextResponse.json({ error: 'Supplier has no contact email' }, { status: 400 });

  await supabase.from('shop_purchase_orders').update({
    status: 'sent',
    sent_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', id);

  return NextResponse.json({
    sent: true,
    po_number: po.po_number,
    supplier_email: supplierEmail,
    lines_count: po.lines?.length ?? 0,
    message: `PO ${po.po_number} marked as sent to ${supplierEmail}`,
  });
}

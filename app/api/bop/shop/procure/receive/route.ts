import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = await getServerClient();
    const body = await request.json();

    const { po_id, received_by, discrepancy_note, lines } = body;

    if (!po_id || !lines || !Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json(
        { error: 'po_id and at least one line are required' },
        { status: 400 }
      );
    }

    // Verify PO exists and is in a receivable status
    const { data: po, error: poErr } = await supabase
      .from('shop_purchase_orders')
      .select('id, status')
      .eq('id', po_id)
      .single();

    if (poErr || !po) {
      return NextResponse.json({ error: 'PO not found' }, { status: 404 });
    }

    if (!['sent', 'partial'].includes(po.status)) {
      return NextResponse.json(
        { error: `Cannot receive against PO with status '${po.status}'` },
        { status: 400 }
      );
    }

    // Create receipt record
    const { data: receipt, error: receiptErr } = await supabase
      .from('shop_po_receipts')
      .insert({
        po_id,
        received_by,
        received_at: new Date().toISOString(),
        discrepancy_note,
      })
      .select()
      .single();

    if (receiptErr) {
      return NextResponse.json({ error: receiptErr.message }, { status: 500 });
    }

    // Update qty_received on each PO line
    for (const line of lines) {
      const { po_line_id, qty_received } = line;

      if (!po_line_id || qty_received == null) continue;

      const { data: poLine, error: lineErr } = await supabase
        .from('shop_po_lines')
        .select('qty_received, qty')
        .eq('id', po_line_id)
        .eq('po_id', po_id)
        .single();

      if (lineErr || !poLine) continue;

      const newQtyReceived = (poLine.qty_received || 0) + qty_received;

      await supabase
        .from('shop_po_lines')
        .update({
          qty_received: newQtyReceived,
          updated_at: new Date().toISOString(),
        })
        .eq('id', po_line_id);
    }

    // Determine if PO is fully or partially received
    const { data: allLines, error: allLinesErr } = await supabase
      .from('shop_po_lines')
      .select('qty, qty_received')
      .eq('po_id', po_id);

    if (!allLinesErr && allLines) {
      const allReceived = allLines.every(
        (l: any) => (l.qty_received || 0) >= (l.qty || 0)
      );
      const anyReceived = allLines.some((l: any) => (l.qty_received || 0) > 0);

      let newStatus = po.status;
      if (allReceived) {
        newStatus = 'received';
      } else if (anyReceived) {
        newStatus = 'partial';
      }

      if (newStatus !== po.status) {
        await supabase
          .from('shop_purchase_orders')
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq('id', po_id);
      }
    }

    return NextResponse.json({ data: receipt }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

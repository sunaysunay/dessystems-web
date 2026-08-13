import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = await getServerClient();
    const body = await request.json();

    const { po_id, tracking_number, carrier } = body;

    if (!po_id) {
      return NextResponse.json({ error: 'po_id is required' }, { status: 400 });
    }

    // Fetch current PO
    const { data: po, error: poErr } = await supabase
      .from('shop_purchase_orders')
      .select('id, notes, status')
      .eq('id', po_id)
      .single();

    if (poErr || !po) {
      return NextResponse.json({ error: 'PO not found' }, { status: 404 });
    }

    // Append tracking info to notes
    const trackingInfo = [
      `\n--- Dropship Dispatch ${new Date().toISOString()} ---`,
      carrier ? `Carrier: ${carrier}` : null,
      tracking_number ? `Tracking: ${tracking_number}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    const updatedNotes = (po.notes || '') + trackingInfo;

    const { data, error } = await supabase
      .from('shop_purchase_orders')
      .update({
        notes: updatedNotes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', po_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

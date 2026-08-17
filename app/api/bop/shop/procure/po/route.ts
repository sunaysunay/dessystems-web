import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { requirePermission } from '@/lib/permission-guard';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const guard = await requirePermission('shop.procurement.read');
    if (!guard.ok) return guard.response;

    const supabase = await getServerClient();
    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status');
    const supplier_id = searchParams.get('supplier_id');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');
    const offset = (page - 1) * limit;

    let query = supabase
      .from('shop_purchase_orders')
      .select('*, supplier:shop_suppliers(id, name, supplier_code)', { count: 'exact' });

    if (status) {
      query = query.eq('status', status);
    }

    if (supplier_id) {
      query = query.eq('supplier_id', supplier_id);
    }

    query = query.order('created_at', { ascending: false });
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data, count, page, limit });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requirePermission('shop.po.create');
    if (!guard.ok) return guard.response;

    const supabase = await getServerClient();
    const body = await request.json();

    const { supplier_id, currency, notes, lines } = body;

    if (!supplier_id || !lines || !Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json(
        { error: 'supplier_id and at least one line are required' },
        { status: 400 }
      );
    }

    // Generate PO number using counter
    const { data: counter, error: counterErr } = await supabase.rpc('bop_next_counter', {
      p_counter_key: 'shop_po',
    });

    if (counterErr) {
      return NextResponse.json({ error: counterErr.message }, { status: 500 });
    }

    const po_number = `PO-${String(counter).padStart(6, '0')}`;

    // Calculate totals from lines
    let subtotal = 0;
    let tax_total = 0;

    const processedLines = lines.map((line: any) => {
      const line_subtotal = (line.qty || 0) * (line.unit_cost || 0);
      const line_tax = line_subtotal * ((line.tax_rate || 0) / 100);
      subtotal += line_subtotal;
      tax_total += line_tax;
      return {
        ...line,
        line_total: line_subtotal,
        tax_amount: line_tax,
      };
    });

    const total = subtotal + tax_total;

    // Insert PO header
    const { data: po, error: poErr } = await supabase
      .from('shop_purchase_orders')
      .insert({
        po_number,
        supplier_id,
        status: 'draft',
        currency: currency || 'EUR',
        subtotal,
        tax_total,
        total,
        notes,
      })
      .select()
      .single();

    if (poErr) {
      return NextResponse.json({ error: poErr.message }, { status: 500 });
    }

    // Insert PO lines
    const lineInserts = processedLines.map((line: any, idx: number) => ({
      po_id: po.id,
      line_number: idx + 1,
      variant_id: line.variant_id,
      sku: line.sku,
      description: line.description,
      qty: line.qty,
      unit_cost: line.unit_cost,
      tax_rate: line.tax_rate || 0,
      tax_amount: line.tax_amount,
      line_total: line.line_total,
      qty_received: 0,
    }));

    const { data: insertedLines, error: linesErr } = await supabase
      .from('shop_po_lines')
      .insert(lineInserts)
      .select();

    if (linesErr) {
      return NextResponse.json({ error: linesErr.message }, { status: 500 });
    }

    return NextResponse.json({ data: { ...po, lines: insertedLines } }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await getServerClient();
    const body = await request.json();
    const { id, status, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    // The PO state machine is driven by `status`, so guard the transition being
    // requested rather than the method: approving is a distinct privilege from
    // ordinary PO edits.
    const guard = await requirePermission(
      status === 'approved' ? 'shop.po.approve' : 'shop.procurement.write'
    );
    if (!guard.ok) return guard.response;

    // Fetch current PO
    const { data: current, error: fetchErr } = await supabase
      .from('shop_purchase_orders')
      .select('status')
      .eq('id', id)
      .single();

    if (fetchErr || !current) {
      return NextResponse.json({ error: 'PO not found' }, { status: 404 });
    }

    const validTransitions: Record<string, string[]> = {
      draft: ['approved'],
      approved: ['sent'],
      sent: ['received', 'closed'],
      received: ['closed'],
      partial: ['received', 'closed'],
    };

    if (status && status !== current.status) {
      const allowed = validTransitions[current.status] || [];
      if (!allowed.includes(status)) {
        return NextResponse.json(
          { error: `Cannot transition from '${current.status}' to '${status}'` },
          { status: 400 }
        );
      }
    }

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };

    if (status) updates.status = status;
    if (notes !== undefined) updates.notes = notes;

    // Set timestamps based on status transition
    if (status === 'approved') {
      updates.approved_at = new Date().toISOString();
      // Trust the guarded caller, not a client-supplied approver id.
      updates.approved_by = guard.uid;
    } else if (status === 'sent') {
      updates.sent_at = new Date().toISOString();
    } else if (status === 'closed') {
      updates.closed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('shop_purchase_orders')
      .update(updates)
      .eq('id', id)
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

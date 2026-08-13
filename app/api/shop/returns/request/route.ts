import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { order_id, lines } = body;

  if (!order_id) {
    return NextResponse.json({ error: 'order_id is required' }, { status: 400 });
  }

  if (!Array.isArray(lines) || lines.length === 0) {
    return NextResponse.json({ error: 'at least one return line is required' }, { status: 400 });
  }

  const rmaNumber = `RMA-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  const supabase = getServerClient();

  const { data: ret, error: retErr } = await supabase
    .from('shop_returns')
    .insert({
      rma_number: rmaNumber,
      order_id,
      status: 'requested',
      requested_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (retErr) return NextResponse.json({ error: retErr.message }, { status: 500 });

  const lineRows = lines.map((l: Record<string, unknown>) => ({
    return_id: ret.id,
    order_line_id: l.order_line_id ?? null,
    quantity: l.quantity ?? 1,
    reason_code: l.reason_code ?? null,
    reason_text: l.reason_text ?? null,
  }));

  const { error: linesErr } = await supabase
    .from('shop_return_lines')
    .insert(lineRows);

  if (linesErr) return NextResponse.json({ error: linesErr.message }, { status: 500 });

  return NextResponse.json({ rma_number: ret.rma_number, return_id: ret.id }, { status: 201 });
}

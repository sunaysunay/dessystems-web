import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { notifyUnmatchedPayment } from '@/lib/shop/notify';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const status = sp.get('status');
  const provider = sp.get('provider');
  const from = sp.get('from');
  const to = sp.get('to');
  const limit = Math.min(200, Math.max(1, Number(sp.get('limit') ?? 50)));
  const offset = Math.max(0, Number(sp.get('offset') ?? 0));

  const supabase = getServerClient();
  let query = supabase
    .from('shop_settlements')
    .select('*', { count: 'exact' });

  if (status) query = query.eq('status', status);
  if (provider) query = query.eq('provider', provider);
  if (from) query = query.gte('settlement_date', from);
  if (to) query = query.lte('settlement_date', to);

  query = query.order('settlement_date', { ascending: false, nullsFirst: false }).range(offset, offset + limit - 1);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ settlements: data, total: count ?? 0 });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { provider, external_id, reference, settlement_date, gross_cents, fee_cents, net_cents, notes, lines } = body;

  const supabase = getServerClient();
  const { data, error } = await supabase
    .from('shop_settlements')
    .insert({
      provider: provider ?? 'mollie',
      external_id: external_id ?? null,
      reference: reference ?? null,
      settlement_date: settlement_date ?? null,
      gross_cents: gross_cents ?? null,
      fee_cents: fee_cents ?? null,
      net_cents: net_cents ?? null,
      notes: notes ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (lines?.length) {
    const rows = lines.map((line: Record<string, unknown>) => ({ ...line, settlement_id: data.id }));
    const { error: linesError } = await supabase
      .from('shop_settlement_lines')
      .insert(rows);

    if (linesError) return NextResponse.json({ error: linesError.message }, { status: 500 });
  }

  return NextResponse.json({ settlement: data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, ...fields } = body;

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const allowed = ['status', 'matched_order_count', 'unmatched_count', 'notes'];
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in fields) update[key] = fields[key];
  }

  const supabase = getServerClient();
  const { data, error } = await supabase
    .from('shop_settlements')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (data && Number(data.unmatched_count ?? 0) > 0) {
    void notifyUnmatchedPayment(data.external_id ?? data.id, data.net_cents ?? 0, data.provider ?? 'mollie');
  }

  return NextResponse.json({ settlement: data });
}

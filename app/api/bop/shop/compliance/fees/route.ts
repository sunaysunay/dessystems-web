import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const category = sp.get('category');
  const feeType = sp.get('fee_type');
  const limit = Math.min(100, Math.max(1, Number(sp.get('limit') ?? 50)));
  const offset = Math.max(0, Number(sp.get('offset') ?? 0));

  const supabase = getServerClient();
  let query = supabase.from('shop_producer_fees').select('*', { count: 'exact' });

  if (category) query = query.eq('category', category);
  if (feeType) query = query.eq('fee_type', feeType);

  query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

  const { data: fees, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ fees, total: count ?? 0 });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { category, fee_type, rate_cents, unit, authority, effective_from, effective_until } = body;

  if (!category || !fee_type || rate_cents == null) {
    return NextResponse.json(
      { error: 'category, fee_type, and rate_cents are required' },
      { status: 400 },
    );
  }

  const supabase = getServerClient();
  const { data, error } = await supabase
    .from('shop_producer_fees')
    .insert({
      category,
      fee_type,
      rate_cents,
      unit: unit ?? null,
      authority: authority ?? null,
      effective_from: effective_from ?? null,
      effective_until: effective_until ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ fee: data }, { status: 201 });
}

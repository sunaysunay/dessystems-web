import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { notifyOssThreshold } from '@/lib/shop/notify';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const status = sp.get('status');
  const year = sp.get('year');
  const limit = Math.min(200, Math.max(1, Number(sp.get('limit') ?? 50)));
  const offset = Math.max(0, Number(sp.get('offset') ?? 0));

  const supabase = getServerClient();
  let query = supabase
    .from('shop_vat_periods')
    .select('*', { count: 'exact' });

  if (status) query = query.eq('status', status);
  if (year) query = query.gte('period_start', `${year}-01-01`).lt('period_start', `${Number(year) + 1}-01-01`);

  query = query.order('period_start', { ascending: false }).range(offset, offset + limit - 1);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ vat_periods: data, total: count ?? 0 });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { period_label, period_start, period_end, notes } = body;

  if (!period_label || !period_start || !period_end) {
    return NextResponse.json({ error: 'period_label, period_start, and period_end are required' }, { status: 400 });
  }

  const supabase = getServerClient();
  const { data, error } = await supabase
    .from('shop_vat_periods')
    .insert({
      period_label,
      period_start,
      period_end,
      notes: notes ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ vat_period: data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, ...fields } = body;

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const allowed = ['status', 'total_output_vat_cents', 'total_input_vat_cents', 'net_vat_cents', 'notes', 'filed_by'];
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in fields) update[key] = fields[key];
  }

  if (update.status === 'filed') {
    update.filed_at = new Date().toISOString();
  }

  const supabase = getServerClient();
  const { data, error } = await supabase
    .from('shop_vat_periods')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Check OSS threshold after filing
  if (data) {
    const year = new Date(data.period_start).getFullYear();
    const { data: yearPeriods } = await supabase
      .from('shop_vat_periods')
      .select('total_output_vat_cents')
      .gte('period_start', `${year}-01-01`)
      .lt('period_start', `${year + 1}-01-01`);
    const yearTotal = (yearPeriods ?? []).reduce((s: number, p: any) => s + Number(p.total_output_vat_cents ?? 0), 0);
    const thresholdCents = 1_000_000; // €10,000 OSS threshold
    const pct = Math.round((yearTotal / thresholdCents) * 100);
    if (pct >= 75) {
      void notifyOssThreshold(pct, thresholdCents / 100, yearTotal / 100);
    }
  }

  return NextResponse.json({ vat_period: data });
}

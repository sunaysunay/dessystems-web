import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const { searchParams } = new URL(req.url);
  const channel  = searchParams.get('channel') ?? '';
  const status   = searchParams.get('status') ?? '';
  const asset_id = searchParams.get('asset_id') ?? '';

  let q = supabase
    .from('mkp_listings')
    .select(`
      *,
      ast_assets ( id, make, model, year, vehicle_type, asking_price, status, vin )
    `)
    .order('created_at', { ascending: false })
    .limit(200);

  if (channel)  q = q.eq('channel', channel);
  if (status)   q = q.eq('status', status);
  if (asset_id) q = q.eq('asset_id', asset_id);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ listings: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const body = await req.json();
  const { channels, ...base } = body;

  // Support creating one listing per channel at once
  const rows = (channels ?? [base.channel]).map((ch: string) => ({
    ...base,
    channel: ch,
    status: 'draft',
  }));

  const { data, error } = await supabase
    .from('mkp_listings')
    .insert(rows)
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ listings: data });
}

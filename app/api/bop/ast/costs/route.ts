import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const { searchParams } = new URL(req.url);
  const asset_id = searchParams.get('asset_id') ?? '';
  let q = supabase.from('ast_cost_items').select('*, ast_assets(id,make,model,year)').order('created_at', { ascending: false }).limit(500);
  if (asset_id) q = q.eq('asset_id', asset_id);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ costs: data ?? [] });
}
export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const body = await req.json();
  const { data, error } = await supabase.from('ast_cost_items').insert(body).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ cost: data });
}

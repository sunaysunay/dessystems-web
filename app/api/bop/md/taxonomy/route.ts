import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') ?? '';
  let q = supabase.from('mdm_vehicle_taxonomy').select('*').order('category').order('make').order('model');
  if (search) q = q.or(`make.ilike.%${search}%,model.ilike.%${search}%,category.ilike.%${search}%`);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ taxonomy: data ?? [] });
}
export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const body = await req.json();
  const { data, error } = await supabase.from('mdm_vehicle_taxonomy').insert(body).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entry: data });
}

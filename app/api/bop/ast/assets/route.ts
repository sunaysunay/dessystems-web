import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const { searchParams } = new URL(req.url);
  const search       = searchParams.get('search') ?? '';
  const status       = searchParams.get('status') ?? '';
  const vehicle_type = searchParams.get('type') ?? '';
  const limit        = parseInt(searchParams.get('limit') ?? '100');

  let q = supabase
    .from('ast_assets')
    .select(`*, mdm_business_partners ( id, name, company_name )`)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (search)       q = q.or(`make.ilike.%${search}%,model.ilike.%${search}%,vin.ilike.%${search}%`);
  if (status)       q = q.eq('status', status);
  if (vehicle_type) q = q.eq('vehicle_type', vehicle_type);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ assets: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const body = await req.json();
  const actorEmail = req.headers.get('x-actor-email') ?? '';

  const { data, error } = await supabase
    .from('ast_assets')
    .insert(body)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Log initial lifecycle event
  await supabase.from('ast_lifecycle_events').insert({
    asset_id: data.id,
    from_status: null,
    to_status: data.status ?? 'purchased',
    note: 'Asset created',
    actor_email: actorEmail,
  });

  return NextResponse.json({ asset: data });
}

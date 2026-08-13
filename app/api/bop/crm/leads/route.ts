import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const { searchParams } = new URL(req.url);
  const search    = searchParams.get('search') ?? '';
  const stage     = searchParams.get('stage') ?? '';
  const source    = searchParams.get('source') ?? '';
  const direction = searchParams.get('direction') ?? '';
  const channel   = searchParams.get('channel') ?? '';

  let q = supabase
    .from('crm_leads')
    .select(`
      *,
      mdm_business_partners ( id, name, company_name, email, phone ),
      ast_assets ( id, make, model, year, vehicle_type, asking_price )
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(200);

  if (stage)     q = q.eq('stage', stage);
  if (source)    q = q.eq('source', source);
  if (direction) q = q.eq('direction', direction);
  if (channel)   q = q.eq('channel', channel);
  if (search)    q = q.or(`title.ilike.%${search}%,ref_code.ilike.%${search}%`);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ leads: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const body = await req.json();

  const { data, error } = await supabase
    .from('crm_leads')
    .insert(body)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ lead: data });
}

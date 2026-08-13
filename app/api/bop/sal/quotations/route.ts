import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const { searchParams } = new URL(req.url);
  const status     = searchParams.get('status') ?? '';
  const partner_id = searchParams.get('partner_id') ?? '';

  let q = supabase
    .from('sal_quotations')
    .select(`*, mdm_business_partners(id, name, company_name), ast_assets(id, make, model, year)`)
    .order('created_at', { ascending: false })
    .limit(200);

  if (status)     q = q.eq('status', status);
  if (partner_id) q = q.eq('partner_id', partner_id);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ quotations: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const body = await req.json();

  // Generate quote number: Q-YYYYMM-XXXX
  const now = new Date();
  const prefix = `Q-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const { count } = await supabase
    .from('sal_quotations')
    .select('*', { count: 'exact', head: true })
    .like('quote_number', `${prefix}%`);
  const seq = String((count ?? 0) + 1).padStart(4, '0');
  const quote_number = `${prefix}-${seq}`;

  const { data, error } = await supabase
    .from('sal_quotations')
    .insert({ ...body, quote_number, status: 'draft' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ quotation: data });
}

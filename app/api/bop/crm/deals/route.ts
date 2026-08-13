import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenant_id');
  const stage = searchParams.get('stage') ?? '';
  const search = searchParams.get('q') ?? '';

  let q = supabase
    .from('crm_deals')
    .select('*, crm_leads(id, ref_code, title)')
    .order('created_at', { ascending: false })
    .limit(200);

  if (tenantId) q = q.eq('tenant_id', Number(tenantId));
  if (stage) q = q.eq('stage', stage);
  if (search) q = q.or(`title.ilike.%${search}%,ref_code.ilike.%${search}%`);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deals: data ?? [] });
}

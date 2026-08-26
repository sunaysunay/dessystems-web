export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { getTenantId } from '@/lib/tenant';

const TENANT_ID = getTenantId('console');

export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get('page') ?? '1');
  const limit = Math.min(Number(searchParams.get('limit') ?? '25'), 100);
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabase
    .from('wrk_inspections')
    .select('*', { count: 'exact' })
    .eq('tenant_id', TENANT_ID)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data, total: count, page, limit });
}

export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const body = await req.json();

  const { data, error } = await supabase
    .from('wrk_inspections')
    .insert({ ...body, tenant_id: TENANT_ID })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

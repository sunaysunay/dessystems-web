import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') ?? '';
  let q = supabase
    .from('ast_assets')
    .select('id,make,model,year,vehicle_type,status,asking_price,cost_price,created_at,updated_at,mdm_business_partners(name,company_name)')
    .order('updated_at', { ascending: false }).limit(200);
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const STATUSES = ['purchased','inspection','preparation','published','reserved','sold','delivered'];
  const board: Record<string, any[]> = {};
  STATUSES.forEach(s => { board[s] = []; });
  (data ?? []).forEach((a: any) => { if (board[a.status]) board[a.status].push(a); });
  return NextResponse.json({ board, assets: data ?? [], statuses: STATUSES });
}

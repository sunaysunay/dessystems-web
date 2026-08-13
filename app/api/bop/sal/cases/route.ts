import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const { searchParams } = new URL(req.url);
  const business_line = searchParams.get('business_line') ?? '';
  const owner = searchParams.get('owner') ?? '';
  const search = searchParams.get('search') ?? '';
  const partner_id = searchParams.get('partner_id') ?? '';

  let q = supabase
    .from('bop_cases')
    .select(`*, mdm_business_partners(id, name, company_name)`)
    .order('created_at', { ascending: false })
    .limit(200);

  if (business_line) q = q.eq('business_line', business_line);
  if (owner) q = q.eq('owner', owner);
  if (partner_id) q = q.eq('partner_id', partner_id);
  if (search) q = q.ilike('case_number', `%${search}%`);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const caseIds = (data ?? []).map((c: any) => c.id);
  const stageMap: Record<string, string> = {};

  if (caseIds.length > 0) {
    const batchResults = await Promise.all(
      caseIds.map((cid: string) => supabase.rpc('case_stage', { p_case_id: cid }))
    );
    batchResults.forEach((r, i) => {
      stageMap[caseIds[i]] = r.data ?? 'lead';
    });
  }

  const cases = (data ?? []).map((c: any) => ({
    ...c,
    derived_stage: stageMap[c.id] ?? 'lead',
  }));

  return NextResponse.json({ cases });
}

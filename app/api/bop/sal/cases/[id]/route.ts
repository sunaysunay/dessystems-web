import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Invalid case ID' }, { status: 400 });

  const supabase = getServerClient();

  const { data, error } = await supabase
    .from('bop_cases')
    .select(`*, mdm_business_partners(id, name, company_name, email, phone)`)
    .eq('id', id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Case not found' }, { status: 404 });

  const { data: stage } = await supabase.rpc('case_stage', { p_case_id: id });
  const { data: docs } = await supabase.rpc('case_documents', { p_case_id: id });

  return NextResponse.json({
    case_detail: { ...data, derived_stage: stage ?? 'lead', documents: docs ?? [] },
  });
}

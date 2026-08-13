import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const { handover_id, warranty_type, term_months, actor } = await req.json();
  if (!handover_id) return NextResponse.json({ error: 'handover_id required' }, { status: 400 });

  const { data, error } = await supabase.rpc('bop_create_warranty_from_handover', {
    p_handover_id: handover_id,
    p_warranty_type: warranty_type ?? 'standard',
    p_term_months: term_months ?? 6,
    p_actor: actor ?? 'staff',
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

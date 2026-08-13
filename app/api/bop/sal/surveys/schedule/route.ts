import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const { handover_id, delay_days, actor } = await req.json();
  if (!handover_id) return NextResponse.json({ error: 'handover_id required' }, { status: 400 });

  const { data, error } = await supabase.rpc('bop_schedule_survey', {
    p_handover_id: handover_id,
    p_delay_days: delay_days ?? 7,
    p_actor: actor ?? 'staff',
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

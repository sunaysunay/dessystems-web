import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getServerClient();
  const { signature, signed_by, actor } = await req.json();
  if (!signature || !signed_by) return NextResponse.json({ error: 'signature and signed_by required' }, { status: 400 });

  const { data, error } = await supabase.rpc('bop_handover_complete', {
    p_handover_id: id, p_signature: signature, p_signed_by: signed_by, p_actor: actor ?? 'staff',
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

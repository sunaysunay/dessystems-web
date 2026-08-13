import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getServerClient();
  const { actor } = await req.json().catch(() => ({ actor: 'user' }));
  const { data, error } = await supabase.rpc('bop_quotation_new_version', {
    p_quotation_id: id, p_actor: actor ?? 'user',
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ new_quotation_id: data });
}

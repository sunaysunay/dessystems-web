import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const token = new URL(req.url).searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 });

  const { data, error } = await supabase
    .from('bop_customer_approvals')
    .select('*, sal_quotations:entity_id(*), sal_orders:entity_id(*)')
    .eq('token', token)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Invalid token' }, { status: 404 });
  return NextResponse.json({ approval: data });
}

export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const { token, response, reason, signature } = await req.json();
  if (!token || !response) return NextResponse.json({ error: 'token and response required' }, { status: 400 });

  const { data, error } = await supabase.rpc('bop_approval_respond', {
    p_token: token, p_response: response, p_reason: reason ?? null, p_signature: signature ?? null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? { ok: true });
}

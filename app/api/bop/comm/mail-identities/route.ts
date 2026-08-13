import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenant_id');

  if (!tenantId) return NextResponse.json({ error: 'tenant_id required' }, { status: 400 });

  const { data, error } = await supabase
    .from('bop_mail_identity')
    .select('*')
    .eq('tenant_id', Number(tenantId))
    .order('code', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ identities: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const { tenant_id, code, from_email, from_name, reply_to, cc_email, bcc_email } = await req.json();

  const { data, error } = await supabase
    .from('bop_mail_identity')
    .insert({ tenant_id, code, from_email, from_name, reply_to, cc_email, bcc_email, is_active: true })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ identity: data });
}

export async function PATCH(req: NextRequest) {
  const supabase = getServerClient();
  const { id, ...fields } = await req.json();

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { data, error } = await supabase
    .from('bop_mail_identity')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ identity: data });
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getServerClient();
  const { data, error } = await supabase
    .from('mdm_business_partners')
    .select(`*, mdm_partner_roles ( * )`)
    .eq('id', id)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ partner: data });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getServerClient();
  const body = await req.json();
  const { roles, ...partnerData } = body;

  const { data, error } = await supabase
    .from('mdm_business_partners')
    .update({ ...partnerData, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Replace roles if provided
  if (roles !== undefined) {
    await supabase.from('mdm_partner_roles').delete().eq('partner_id', id);
    if (roles.length) {
      await supabase.from('mdm_partner_roles').insert(
        roles.map((r: string, i: number) => ({
          partner_id: id,
          tenant_id: data.tenant_id,
          role_type: r,
          is_primary: i === 0,
        }))
      );
    }
  }

  return NextResponse.json({ partner: data });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getServerClient();
  await supabase
    .from('mdm_business_partners')
    .update({ status: 'inactive', updated_at: new Date().toISOString() })
    .eq('id', id);
  return NextResponse.json({ ok: true });
}

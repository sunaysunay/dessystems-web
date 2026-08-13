import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') ?? '';
  const role = searchParams.get('role') ?? '';
  const status = searchParams.get('status') ?? '';
  const limit = parseInt(searchParams.get('limit') ?? '50');

  let q = supabase
    .from('mdm_business_partners')
    .select(`
      *,
      mdm_partner_roles ( role_type, is_primary )
    `)
    .order('name')
    .limit(limit);

  if (search) q = q.or(`name.ilike.%${search}%,company_name.ilike.%${search}%,email.ilike.%${search}%`);
  if (status) q = q.eq('status', status);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Filter by role if requested (post-filter since it's in join)
  const filtered = role
    ? (data ?? []).filter(p => p.mdm_partner_roles?.some((r: any) => r.role_type === role))
    : (data ?? []);

  return NextResponse.json({ partners: filtered });
}

export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const body = await req.json();
  const { roles, ...partnerData } = body;

  const { data: partner, error } = await supabase
    .from('mdm_business_partners')
    .insert(partnerData)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Insert roles
  if (roles?.length) {
    await supabase.from('mdm_partner_roles').insert(
      roles.map((r: string, i: number) => ({
        partner_id: partner.id,
        tenant_id: partnerData.tenant_id,
        role_type: r,
        is_primary: i === 0,
      }))
    );
  }

  return NextResponse.json({ partner });
}

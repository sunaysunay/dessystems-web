import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sb = getServerClient();
  const body = await req.json().catch(() => ({}));
  const tenantId: number = Number(body.tenant_id);
  if (!tenantId) return NextResponse.json({ error: 'tenant_id required' }, { status: 400 });

  // Check current state before RPC (for already_existed flag)
  const { data: before } = await sb
    .from('dm_inquiries')
    .select('crm_lead_id, status')
    .eq('id', id)
    .maybeSingle();

  if (!before) return NextResponse.json({ error: 'inquiry not found' }, { status: 404 });
  if (before.status === 'converted' && before.crm_lead_id) {
    return NextResponse.json({ crm_lead_id: before.crm_lead_id, already_existed: true });
  }

  const { data: leadId, error } = await sb.rpc('promote_inquiry_to_lead', {
    p_inquiry_id: id,
    p_tenant_id:  tenantId,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ crm_lead_id: leadId, already_existed: false });
}

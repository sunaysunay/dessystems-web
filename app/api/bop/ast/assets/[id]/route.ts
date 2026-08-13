import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { fireTaskTriggers } from '@/lib/ops/fire-triggers';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getServerClient();
  const { data, error } = await supabase
    .from('ast_assets')
    .select(`*, mdm_business_partners ( id, name, company_name ), ast_lifecycle_events ( * ), ast_cost_items ( * )`)
    .eq('id', id)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ asset: data });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getServerClient();
  const body = await req.json();
  const actorEmail = req.headers.get('x-actor-email') ?? '';
  const { status: newStatus, ...rest } = body;

  // Get current status for lifecycle log
  const { data: current } = await supabase
    .from('ast_assets')
    .select('status')
    .eq('id', id)
    .single();

  const { data, error } = await supabase
    .from('ast_assets')
    .update({ ...rest, ...(newStatus ? { status: newStatus } : {}), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Log status change
  if (newStatus && current?.status !== newStatus) {
    await supabase.from('ast_lifecycle_events').insert({
      asset_id: id,
      from_status: current?.status,
      to_status: newStatus,
      note: body.note ?? null,
      actor_email: actorEmail,
    });

    if (newStatus === 'sold' && data?.tenant_id) {
      void fireTaskTriggers(supabase, 'listing.purchased', 'ast_asset', id, String(data.tenant_id));
    }
  }

  return NextResponse.json({ asset: data });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getServerClient();
  await supabase.from('ast_assets').update({ status: 'sold' }).eq('id', id);
  return NextResponse.json({ ok: true });
}

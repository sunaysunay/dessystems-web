export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { getTenantId } from '@/lib/tenant';

const TENANT_ID = getTenantId('console');

export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const { searchParams } = new URL(req.url);
  const grade = searchParams.get('grade');
  const activeOn = searchParams.get('active_on');

  let query = supabase
    .from('wrk_labour_rates')
    .select('*')
    .eq('tenant_id', TENANT_ID)
    .order('grade', { ascending: true })
    .order('effective_from', { ascending: false });

  if (grade) query = query.eq('grade', grade);
  if (activeOn) {
    query = query.lte('effective_from', activeOn);
    query = query.or(`effective_to.is.null,effective_to.gte.${activeOn}`);
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const body = await req.json();

  const { data, error } = await supabase
    .from('wrk_labour_rates')
    .insert({
      grade: body.grade,
      hourly_rate: body.hourly_rate,
      cost_rate: body.cost_rate,
      revenue_group: body.revenue_group,
      effective_from: body.effective_from,
      effective_to: body.effective_to || null,
      tenant_id: TENANT_ID,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const supabase = getServerClient();
  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const allowed: Record<string, unknown> = {};
  if (updates.hourly_rate !== undefined) allowed.hourly_rate = updates.hourly_rate;
  if (updates.cost_rate !== undefined) allowed.cost_rate = updates.cost_rate;
  if (updates.effective_to !== undefined) allowed.effective_to = updates.effective_to || null;

  const { data, error } = await supabase
    .from('wrk_labour_rates')
    .update(allowed)
    .eq('id', id)
    .eq('tenant_id', TENANT_ID)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const supabase = getServerClient();
  const body = await req.json();
  const { id } = body;

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const { error } = await supabase
    .from('wrk_labour_rates')
    .delete()
    .eq('id', id)
    .eq('tenant_id', TENANT_ID);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

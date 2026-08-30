export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { getTenantId } from '@/lib/tenant';

const TENANT_ID = getTenantId('console');

export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category');
  const active = searchParams.get('active');

  let query = supabase
    .from('wrk_service_packages')
    .select('*')
    .eq('tenant_id', TENANT_ID)
    .order('name', { ascending: true });

  if (category) query = query.eq('category', category);
  if (active === 'true') query = query.eq('active', true);
  if (active === 'false') query = query.eq('active', false);

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const body = await req.json();

  const { data, error } = await supabase
    .from('wrk_service_packages')
    .insert({
      name: body.name,
      description: body.description || null,
      parts: body.parts || [],
      labour_minutes: body.labour_minutes || 0,
      fixed_price: body.fixed_price || 0,
      category: body.category || null,
      active: body.active ?? true,
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
  if (updates.name !== undefined) allowed.name = updates.name;
  if (updates.description !== undefined) allowed.description = updates.description;
  if (updates.parts !== undefined) allowed.parts = updates.parts;
  if (updates.labour_minutes !== undefined) allowed.labour_minutes = updates.labour_minutes;
  if (updates.fixed_price !== undefined) allowed.fixed_price = updates.fixed_price;
  if (updates.category !== undefined) allowed.category = updates.category;
  if (updates.active !== undefined) allowed.active = updates.active;
  allowed.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('wrk_service_packages')
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

  // Soft delete: set active = false
  const { data, error } = await supabase
    .from('wrk_service_packages')
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', TENANT_ID)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

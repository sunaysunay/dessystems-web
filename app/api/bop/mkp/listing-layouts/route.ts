import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenant_id');
  const category = searchParams.get('category');
  const id = searchParams.get('id');

  if (id) {
    const { data, error } = await supabase
      .from('bop_listing_layouts')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ layout: data });
  }

  let q = supabase
    .from('bop_listing_layouts')
    .select('*')
    .order('category')
    .order('body_type_code', { ascending: true, nullsFirst: true });

  if (tenantId) q = q.eq('tenant_id', Number(tenantId));
  if (category) q = q.eq('category', category);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ layouts: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const body = await req.json();
  const { tenant_id, category, body_type_code, name, layout } = body;

  if (!tenant_id || !category || !layout) {
    return NextResponse.json({ error: 'tenant_id, category, and layout are required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('bop_listing_layouts')
    .upsert(
      {
        tenant_id,
        category,
        body_type_code: body_type_code ?? null,
        name: name ?? `${category} default`,
        layout,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'tenant_id,category,body_type_code' }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ layout: data });
}

export async function PATCH(req: NextRequest) {
  const supabase = getServerClient();
  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const allowed: Record<string, unknown> = {};
  if (updates.name !== undefined) allowed.name = updates.name;
  if (updates.layout !== undefined) allowed.layout = updates.layout;
  if (updates.is_active !== undefined) allowed.is_active = updates.is_active;
  allowed.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('bop_listing_layouts')
    .update(allowed)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ layout: data });
}

export async function DELETE(req: NextRequest) {
  const supabase = getServerClient();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const { error } = await supabase
    .from('bop_listing_layouts')
    .delete()
    .eq('id', Number(id));

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

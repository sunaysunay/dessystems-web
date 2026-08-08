import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

function err(msg: string, status = 500) {
  return NextResponse.json({ error: msg }, { status });
}

export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenant_id') ?? '';

  let q = supabase
    .from('op_task_views')
    .select('*')
    .is('deleted_at', null)
    .order('is_pinned', { ascending: false })
    .order('sort_order', { ascending: true });
  if (tenantId) q = q.eq('tenant_id', tenantId);

  const ownerId = searchParams.get('owner_id');
  if (ownerId) q = q.eq('owner_id', ownerId);

  const { data, error } = await q;
  if (error) return err(error.message);
  return NextResponse.json({ views: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const body = await req.json();
  const { action } = body;

  if (action === 'create') {
    if (!body.tenant_id) return err('tenant_id required', 400);
    if (!body.name) return err('name required', 400);

    const { data, error } = await supabase
      .from('op_task_views')
      .insert({
        tenant_id: body.tenant_id,
        name: body.name,
        filter_config: body.filter_config ?? {},
        sort_config: body.sort_config ?? {},
        owner_id: body.owner_id ?? null,
        is_pinned: body.is_pinned ?? false,
        sort_order: body.sort_order ?? 0,
        icon: body.icon ?? 'filter',
      })
      .select()
      .single();
    if (error) return err(error.message);
    return NextResponse.json({ view: data });
  }

  if (action === 'pin') {
    if (!body.id) return err('id required', 400);
    const { data, error } = await supabase
      .from('op_task_views')
      .update({ is_pinned: body.is_pinned ?? true })
      .eq('id', body.id)
      .is('deleted_at', null)
      .select()
      .single();
    if (error) return err(error.message);
    return NextResponse.json({ view: data });
  }

  return err('Unknown action', 400);
}

export async function PATCH(req: NextRequest) {
  const supabase = getServerClient();
  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return err('id required', 400);

  const allowed = ['name', 'filter_config', 'sort_config', 'is_pinned', 'sort_order', 'icon'];
  const filtered: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in updates) filtered[key] = updates[key];
  }
  if (Object.keys(filtered).length === 0) return err('no valid fields', 400);

  const { data, error } = await supabase
    .from('op_task_views')
    .update(filtered)
    .eq('id', id)
    .is('deleted_at', null)
    .select()
    .single();
  if (error) return err(error.message);
  return NextResponse.json({ view: data });
}

export async function DELETE(req: NextRequest) {
  const supabase = getServerClient();
  const { id } = await req.json();
  if (!id) return err('id required', 400);

  const { error } = await supabase
    .from('op_task_views')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .is('deleted_at', null);
  if (error) return err(error.message);
  return NextResponse.json({ deleted: true });
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { OBJECT_TYPES, OBJECT_STATUSES, validateObjectId } from '@/lib/bop/types/objects';
import type { BopObject } from '@/lib/bop/types/objects';
import { assertEditable, assertNoDependents, ProtectionError } from '@/lib/bop/guards/assert-editable';

export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const { searchParams } = new URL(req.url);
  const module  = searchParams.get('module');
  const type    = searchParams.get('type');
  const status  = searchParams.get('status');
  const q       = searchParams.get('q');

  let query = supabase
    .from('bop_objects')
    .select('*')
    .order('module')
    .order('type')
    .order('name');

  if (module) query = query.eq('module', module);
  if (type && OBJECT_TYPES.includes(type as any)) query = query.eq('type', type);
  if (status && OBJECT_STATUSES.includes(status as any)) query = query.eq('status', status);
  if (q) query = query.or(`name.ilike.%${q}%,object_id.ilike.%${q}%,description.ilike.%${q}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ objects: data ?? [], count: (data ?? []).length });
}

export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const body = await req.json();
  const rows: BopObject[] = Array.isArray(body) ? body : [body];

  // Application-layer validation (mirrors DB CHECK constraints)
  for (const row of rows) {
    if (!OBJECT_TYPES.includes(row.type)) {
      return NextResponse.json({ error: `Invalid type: ${row.type}` }, { status: 400 });
    }
    if (!OBJECT_STATUSES.includes(row.status)) {
      return NextResponse.json({ error: `Invalid status: ${row.status}` }, { status: 400 });
    }
    const idErr = validateObjectId(row);
    if (idErr) return NextResponse.json({ error: idErr }, { status: 400 });
    if (!row.module) return NextResponse.json({ error: 'module is required' }, { status: 400 });
    if (!row.name)   return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  // For updates on existing objects, run protection guard
  for (const row of rows) {
    const { data: existing } = await supabase
      .from('bop_objects')
      .select('object_id')
      .eq('object_id', row.object_id)
      .maybeSingle();

    if (existing) {
      try {
        await assertEditable(row.object_id, 'update');
      } catch (e) {
        if (e instanceof ProtectionError) {
          return NextResponse.json({ error: e.message }, { status: 403 });
        }
        throw e;
      }
    }
  }

  const { data, error } = await supabase
    .from('bop_objects')
    .upsert(rows.map(r => ({ ...r, updated_at: new Date().toISOString() })), { onConflict: 'object_id' })
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ upserted: data, count: (data ?? []).length });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const objectId = searchParams.get('object_id');

  if (!objectId) {
    return NextResponse.json({ error: 'object_id query param required' }, { status: 400 });
  }

  try {
    await assertEditable(objectId, 'delete');
    await assertNoDependents(objectId);
  } catch (e) {
    if (e instanceof ProtectionError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    throw e;
  }

  const supabase = getServerClient();
  const { error } = await supabase
    .from('bop_objects')
    .delete()
    .eq('object_id', objectId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: objectId });
}

export async function PATCH(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const objectId = searchParams.get('object_id');

  if (!objectId) {
    return NextResponse.json({ error: 'object_id query param required' }, { status: 400 });
  }

  try {
    await assertEditable(objectId, 'update');
  } catch (e) {
    if (e instanceof ProtectionError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    throw e;
  }

  const supabase = getServerClient();
  const body = await req.json();

  // Prevent bypassing protection via PATCH
  const safeBody = { ...body };
  delete safeBody.protection_lvl;
  delete safeBody.criticality;
  delete safeBody.change_policy;

  const { data, error } = await supabase
    .from('bop_objects')
    .update({ ...safeBody, updated_at: new Date().toISOString() })
    .eq('object_id', objectId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ object: data });
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

// GET — list field_definitions, optional ?section= filter
export async function GET(req: NextRequest) {
  const sb = getServerClient();
  const section = req.nextUrl.searchParams.get('section');
  let q = sb.from('field_definitions').select('*').order('sort_order', { ascending: true });
  if (section) q = q.eq('section', section);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ definitions: data ?? [] });
}

// POST — create new field definition
export async function POST(req: NextRequest) {
  const sb = getServerClient();
  const body = await req.json();
  const { data, error } = await sb.from('field_definitions').insert(body).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ definition: data });
}

// PATCH — update field definition by id (passed in body)
export async function PATCH(req: NextRequest) {
  const sb = getServerClient();
  const { id, ...updates } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const { data, error } = await sb.from('field_definitions').update(updates).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ definition: data });
}

// DELETE — delete by id query param
export async function DELETE(req: NextRequest) {
  const sb = getServerClient();
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const { error } = await sb.from('field_definitions').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

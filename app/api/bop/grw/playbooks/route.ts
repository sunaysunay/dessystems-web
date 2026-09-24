import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
export const dynamic = 'force-dynamic';

export async function GET() {
  const sb = getServerClient();
  const { data, error } = await sb.from('gr_playbooks').select('*').order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const sb = getServerClient();
  const body = await req.json();
  const { name, trigger, channels, languages, objective } = body;
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

  const { data, error } = await sb.from('gr_playbooks').insert({
    name,
    trigger: trigger || 'manual',
    channels: channels || [],
    languages: languages || ['nl', 'en'],
    objective: objective || 'promotion',
    active: false,
    run_count: 0,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const sb = getServerClient();
  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { data, error } = await sb.from('gr_playbooks').update(updates).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const sb = getServerClient();
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { error } = await sb.from('gr_playbooks').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: true });
}

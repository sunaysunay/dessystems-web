import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = getServerClient();
  const { data, error } = await sb.from('listing_tab_templates').select('*').eq('id', id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ template: data });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = getServerClient();
  const body = await req.json();
  const { force, ...updates } = body;

  const { data: existing } = await sb.from('listing_tab_templates').select('locked').eq('id', id).single();
  if (existing?.locked && !force) {
    return NextResponse.json({ error: 'Template is locked. Pass force=true to override.' }, { status: 423 });
  }

  const { data, error } = await sb.from('listing_tab_templates').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ template: data });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = getServerClient();
  const { data: existing } = await sb.from('listing_tab_templates').select('locked').eq('id', id).single();
  if (existing?.locked) {
    return NextResponse.json({ error: 'Cannot delete a locked template.' }, { status: 423 });
  }
  const { error } = await sb.from('listing_tab_templates').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

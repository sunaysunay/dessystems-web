import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = getServerClient();
  const { data, error } = await supabase
    .from('bop_counter')
    .select('*')
    .order('object_name');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ counters: data ?? [] });
}

export async function PUT(req: NextRequest) {
  const supabase = getServerClient();
  const { id, counter } = await req.json();
  if (!id || counter == null) {
    return NextResponse.json({ error: 'id and counter are required' }, { status: 400 });
  }
  const { data, error } = await supabase
    .from('bop_counter')
    .update({ counter, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const { object_name, short_code, counter } = await req.json();
  if (!object_name || !short_code) {
    return NextResponse.json({ error: 'object_name and short_code are required' }, { status: 400 });
  }
  const { data, error } = await supabase
    .from('bop_counter')
    .insert({ object_name, short_code: short_code.toUpperCase(), counter: counter ?? 0 })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const supabase = getServerClient();
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  const { error } = await supabase.from('bop_counter').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export async function GET() {
  const supabase = getServerClient();
  const { data, error } = await supabase.from('bop_modules').select('*').order('code');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ modules: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const body = await req.json();
  const row: Record<string, unknown> = { code: body.code.toUpperCase(), name: body.name, description: body.description, status: body.status };
  if (body.module_id) row.module_id = body.module_id;
  if (body.layer != null) row.layer = body.layer;
  if (body.layer_name) row.layer_name = body.layer_name;
  if (body.phase != null) row.phase = body.phase;
  const { data, error } = await supabase.from('bop_modules')
    .insert(row)
    .select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ module: data });
}

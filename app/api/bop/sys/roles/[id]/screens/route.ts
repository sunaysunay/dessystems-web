import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getServerClient();
  const { data, error } = await supabase
    .from('bop_role_screens')
    .select('screen_id, access_level')
    .eq('role_id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ assignments: data ?? [] });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getServerClient();
  const { assignments } = await req.json();

  // Delete existing, re-insert
  await supabase.from('bop_role_screens').delete().eq('role_id', id);

  const rows = Object.entries(assignments as Record<string,string>).map(([screen_id, access_level]) => ({
    role_id: id,
    screen_id,
    access_level,
  }));

  if (rows.length > 0) {
    const { error } = await supabase.from('bop_role_screens').insert(rows);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, count: rows.length });
}

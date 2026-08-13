import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getServerClient();
  const { status, note } = await req.json();
  if (!status) return NextResponse.json({ error: 'status required' }, { status: 400 });

  // Read existing record
  const { data: existing } = await supabase.from('bop_change_log').select('new_value').eq('id', id).single();
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const updated = {
    ...((existing.new_value as Record<string,any>) ?? {}),
    status,
    reviewed_at: new Date().toISOString(),
    review_note: note ?? null,
  };

  const { error } = await supabase.from('bop_change_log').update({ new_value: updated }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

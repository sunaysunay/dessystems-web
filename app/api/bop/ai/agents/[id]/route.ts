import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const COLS = ['name','provider','model','base_url','system_prompt','temperature','max_tokens'];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getServerClient();
  const b = await req.json();
  const patch: any = {};
  for (const c of COLS) if (c in b) patch[c] = b[c] === '' ? null : b[c];
  if (typeof b.api_key === 'string' && b.api_key.trim() !== '') patch.api_key = b.api_key.trim();

  if (b.is_active === true) {
    await supabase.from('bop_ai_agents').update({ is_active: false }).eq('is_active', true);
    patch.is_active = true;
  } else if (b.is_active === false) {
    patch.is_active = false;
  }

  const { error } = await supabase.from('bop_ai_agents').update(patch).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getServerClient();
  const { error } = await supabase.from('bop_ai_agents').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

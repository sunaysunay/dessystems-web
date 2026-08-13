import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

// PATCH { name?, generation?, year_from?, year_to? }
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ modelId: string }> }) {
  const { modelId } = await params;
  const supabase = getServerClient();
  const b = await req.json();
  const patch: any = {};
  for (const k of ['name', 'generation', 'year_from', 'year_to']) if (k in b) patch[k] = b[k];
  const { error } = await supabase.from('bop_models').update(patch).eq('id', modelId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ modelId: string }> }) {
  const { modelId } = await params;
  const supabase = getServerClient();
  await supabase.from('bop_listings').update({ model_id: null }).eq('model_id', modelId);
  const { error } = await supabase.from('bop_models').delete().eq('id', modelId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

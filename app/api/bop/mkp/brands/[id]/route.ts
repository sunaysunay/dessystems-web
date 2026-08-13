import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

// PATCH { name?, country_origin?, categories?, logo_url? }
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getServerClient();
  const b = await req.json();
  const patch: any = {};
  for (const k of ['name', 'country_origin', 'categories', 'logo_url']) if (k in b) patch[k] = b[k];
  const { error } = await supabase.from('bop_brands').update(patch).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE — cascades to bop_models; listings referencing this brand get brand_id set null
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getServerClient();
  await supabase.from('bop_listings').update({ brand_id: null }).eq('brand_id', id);
  const { error } = await supabase.from('bop_brands').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

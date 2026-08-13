import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

// POST { order: number[] } — array of bop_listing_media ids in the new display order
export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const { order } = await req.json();
  if (!Array.isArray(order)) return NextResponse.json({ error: 'order[] is required' }, { status: 400 });
  await Promise.all(order.map((id: number, i: number) =>
    supabase.from('bop_listing_media').update({ sort_order: i }).eq('id', id)));
  return NextResponse.json({ ok: true });
}

// app/api/bop/mkt/studio/presets/route.ts — list active presets
import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const sb = getServerClient();
  const { data, error } = await sb
    .from('bop_studio_presets')
    .select('*')
    .eq('active', true)
    .order('sort');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ presets: data });
}

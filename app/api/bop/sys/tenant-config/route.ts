import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

// bop_tenants is BOP V2's own complete, independent tenant table.
// (`tenants` — no prefix — stays exclusively for descamper/dessiteAG_V4/desmobil-web.)
export async function GET() {
  const supabase = getServerClient();
  const { data } = await supabase.from('bop_tenants').select('*').order('sort_order', { ascending: true });
  return NextResponse.json({ tenants: data ?? [] });
}

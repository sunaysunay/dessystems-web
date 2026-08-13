import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = getServerClient();
  const { data, error } = await supabase.rpc('bop_check_doc_flow_integrity');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ integrity: data ?? { orphan_count: 0, orphans: [] } });
}

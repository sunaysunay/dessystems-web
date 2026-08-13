import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const sb = getServerClient();
  const { data, error } = await sb.from('environment_states')
    .select('*, dev_releases(version, status)')
    .order('environment');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ states: data ?? [] });
}

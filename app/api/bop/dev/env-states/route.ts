import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  const supabase = getServerClient();
  const { data, error } = await supabase.from('environment_states').select('*');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ environments: data ?? [] });
}

export async function PATCH(req: NextRequest) {
  const supabase = getServerClient();
  const body = await req.json();

  const { data, error } = await supabase
    .from('environment_states')
    .update({
      current_version: body.current_version,
      release_id: body.current_release_id,
      deployed_at: new Date().toISOString()
    })
    .eq('environment', body.environment)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ environment: data });
}

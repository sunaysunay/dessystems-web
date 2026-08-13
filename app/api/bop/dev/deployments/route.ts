import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const { searchParams } = new URL(req.url);
  const env = searchParams.get('environment');

  let q = supabase
    .from('dev_deployments')
    .select('*, dev_releases(id,version)')
    .order('deployed_at', { ascending: false });

  if (env) q = q.eq('environment', env);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deployments: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const body = await req.json();

  const { data, error } = await supabase
    .from('dev_deployments')
    .insert({
      release_id:    body.release_id ?? null,
      environment:   body.environment,
      success:       body.success ?? true,
      duration_secs: body.duration_secs ?? null,
      deployed_by:   body.deployed_by ?? null,
      notes:         body.notes ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (data) {
    const releaseData = body.release_id
      ? await supabase.from('dev_releases').select('version').eq('id', body.release_id).single()
      : null;

    await supabase.from('environment_states').upsert(
      {
        environment:     body.environment,
        current_version: releaseData?.data?.version ?? null,
        release_id:      body.release_id ?? null,
        deployed_at:     data.deployed_at,
        deployed_by:     body.deployed_by ?? null,
        status:          body.success ? 'stable' : 'failed',
      },
      { onConflict: 'environment' }
    );
  }

  return NextResponse.json({ deployment: data }, { status: 201 });
}

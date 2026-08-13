import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export async function GET(_req: NextRequest) {
  const supabase = getServerClient();
  const { data, error } = await supabase.from('int_systems').select('*').order('name');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ connectors: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const body = await req.json();
  const row = {
    system_key:   body.system_key ?? body.name?.toLowerCase().replace(/\s+/g, '_'),
    name:         body.name,
    system_type:  body.connector_type ?? body.system_type ?? 'rest_api',
    direction:    body.direction ?? 'pull',
    base_url:     body.base_url ?? null,
    auth_type:    body.auth_type ?? (body.api_key ? 'api_key' : 'none'),
    secret_ref:   body.secret_ref ?? null,
    capabilities: body.capabilities ?? {},
    config:       body.config ?? {},
    status:       'active',
  };
  const { data, error } = await supabase.from('int_systems').insert(row).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ connector: data }, { status: 201 });
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
export const dynamic = 'force-dynamic';

// GET /api/bop/grw/clients — list all growth clients (DES tenants + external)
export async function GET(req: NextRequest) {
  const sb = getServerClient();
  const u = new URL(req.url);
  const type = u.searchParams.get('type');
  let q = sb.from('gr_clients').select('*').order('name');
  if (type) q = q.eq('client_type', type);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ clients: data ?? [] });
}

// POST /api/bop/grw/clients — create or update a client profile
export async function POST(req: NextRequest) {
  const sb = getServerClient();
  const body = await req.json();
  const row: Record<string, unknown> = {
    name: body.name,
    client_type: body.client_type || 'external',
    website: body.website || null,
    industry: body.industry || null,
    brand_tone: body.brand_tone || null,
    brand_description: body.brand_description || null,
    logo_url: body.logo_url || null,
    channels: body.channels || [],
    languages: body.languages || ['nl', 'en'],
    contact_email: body.contact_email || null,
    tenant_id: body.tenant_id || null,
    updated_at: new Date().toISOString(),
  };
  if (body.id) row.id = body.id;
  const { data, error } = await sb.from('gr_clients')
    .upsert(row, { onConflict: 'id' })
    .select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ client: data });
}

// DELETE /api/bop/grw/clients?id=uuid
export async function DELETE(req: NextRequest) {
  const sb = getServerClient();
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const { error } = await sb.from('gr_clients').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

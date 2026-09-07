export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { generateAccessCode, hashCode, normalizeCode, slugify } from '@/lib/portal/auth';

// GET → all portal clients with offer/document counts
export async function GET() {
  const supabase = getServerClient();
  const { data, error } = await supabase
    .from('portal_clients')
    .select('id, slug, name, contact_name, email, locale, status, expires_at, created_at, updated_at, portal_offers(id, status), portal_documents(id, status)')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const clients = (data ?? []).map((c: any) => {
    const offers = Array.isArray(c.portal_offers) ? c.portal_offers : [];
    const docs = Array.isArray(c.portal_documents) ? c.portal_documents : [];
    const { portal_offers: _o, portal_documents: _d, ...rest } = c;
    return {
      ...rest,
      offer_count: offers.length,
      open_offers: offers.filter((o: any) => ['sent', 'viewed', 'changes_requested'].includes(o.status)).length,
      document_count: docs.filter((d: any) => d.status === 'active').length,
    };
  });
  return NextResponse.json({ clients });
}

// POST { name, contact_name?, email?, locale?, expires_at?, slug?, code? }
// Creates the client and returns the plain access code ONCE.
export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const body = await req.json();

  const name = String(body.name || '').trim();
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

  const slug = slugify(String(body.slug || name));
  if (!slug) return NextResponse.json({ error: 'invalid slug' }, { status: 400 });

  const code = normalizeCode(body.code || '') || generateAccessCode();
  const salt = `${slug}-${new Date().getFullYear()}`;

  const { data, error } = await supabase
    .from('portal_clients')
    .insert({
      slug,
      name,
      contact_name: body.contact_name || null,
      email: body.email || null,
      locale: body.locale || 'nl',
      expires_at: body.expires_at || null,
      code_salt: salt,
      code_hash: hashCode(code, salt),
    })
    .select('id, slug, name, contact_name, email, locale, status, expires_at, created_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ client: data, code, login_url: `/portal/login?c=${data.slug}` });
}

// PATCH { id, action?: 'regenerate_code', ...fields }
export async function PATCH(req: NextRequest) {
  const supabase = getServerClient();
  const body = await req.json();
  const id = String(body.id || '');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  if (body.action === 'regenerate_code') {
    const { data: client } = await supabase.from('portal_clients').select('id, slug').eq('id', id).single();
    if (!client) return NextResponse.json({ error: 'not found' }, { status: 404 });
    const code = generateAccessCode();
    const salt = `${client.slug}-${Date.now()}`;
    const { error } = await supabase
      .from('portal_clients')
      .update({ code_salt: salt, code_hash: hashCode(code, salt), updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, code });
  }

  const patch: Record<string, any> = { updated_at: new Date().toISOString() };
  for (const k of ['name', 'contact_name', 'email', 'locale', 'status', 'expires_at'] as const) {
    if (k in body) patch[k] = body[k] || null;
  }
  if ('status' in patch && !['active', 'suspended', 'closed'].includes(patch.status)) {
    return NextResponse.json({ error: 'invalid status' }, { status: 400 });
  }

  const { data, error } = await supabase.from('portal_clients').update(patch).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ client: data });
}

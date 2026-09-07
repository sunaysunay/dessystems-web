export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

// GET ?client_id= → documents (active + archived)
export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get('client_id') ?? '';

  let q = supabase
    .from('portal_documents')
    .select('*, portal_clients(name, slug)')
    .order('sort_order', { ascending: true })
    .limit(300);
  if (clientId) q = q.eq('client_id', clientId);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ documents: data ?? [] });
}

// POST { client_id, title, note?, category?, file_url?, storage_path?, mime_type?, size_bytes?, is_primary?, sort_order? }
export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const body = await req.json();

  const clientId = String(body.client_id || '');
  const title = String(body.title || '').trim();
  if (!clientId || !title) return NextResponse.json({ error: 'client_id and title required' }, { status: 400 });
  if (!body.file_url && !body.storage_path) {
    return NextResponse.json({ error: 'file_url or storage_path required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('portal_documents')
    .insert({
      client_id: clientId,
      title,
      note: body.note || null,
      category: body.category || 'general',
      file_url: body.file_url || null,
      storage_path: body.storage_path || null,
      mime_type: body.mime_type || null,
      size_bytes: body.size_bytes ?? null,
      is_primary: !!body.is_primary,
      sort_order: Number(body.sort_order ?? 0),
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ document: data });
}

// PATCH { id, ...fields } — bumps version when the file itself changes
export async function PATCH(req: NextRequest) {
  const supabase = getServerClient();
  const body = await req.json();
  const id = String(body.id || '');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const patch: Record<string, any> = { updated_at: new Date().toISOString() };
  for (const k of ['title', 'note', 'category', 'file_url', 'storage_path', 'mime_type', 'size_bytes', 'is_primary', 'sort_order', 'status'] as const) {
    if (k in body) patch[k] = body[k];
  }
  if ('status' in patch && !['active', 'archived'].includes(patch.status)) {
    return NextResponse.json({ error: 'invalid status' }, { status: 400 });
  }

  if (body.file_url || body.storage_path) {
    const { data: current } = await supabase.from('portal_documents').select('version, file_url, storage_path').eq('id', id).single();
    if (current && (current.file_url !== (body.file_url ?? current.file_url) || current.storage_path !== (body.storage_path ?? current.storage_path))) {
      patch.version = (current.version ?? 1) + 1;
    }
  }

  const { data, error } = await supabase.from('portal_documents').update(patch).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ document: data });
}

// DELETE ?id= → archive (soft delete)
export async function DELETE(req: NextRequest) {
  const supabase = getServerClient();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id') ?? '';
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { error } = await supabase
    .from('portal_documents')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

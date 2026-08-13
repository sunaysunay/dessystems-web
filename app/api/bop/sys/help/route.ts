import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

// GET /api/bop/sys/help?screen=MP003  → authored docs grouped by doc_type
export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const { searchParams } = new URL(req.url);
  const screen = searchParams.get('screen');
  if (!screen) return NextResponse.json({ error: 'screen is required' }, { status: 400 });

  const { data, error } = await supabase
    .from('bop_documentation')
    .select('doc_id, doc_type, seq, title, body_md, i18n_key, status')
    .eq('target_type', 'screen')
    .eq('target_id', screen)
    .eq('status', 'active')
    .order('doc_type', { ascending: true })
    .order('seq', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data ?? [];
  const grouped: Record<string, any[]> = {};
  for (const r of rows) (grouped[r.doc_type] ??= []).push(r);

  // platform-level docs (ADRs/changelog) explicitly tagged as related to this screen
  const { data: related } = await supabase
    .from('bop_documentation')
    .select('target_id, doc_type, title')
    .eq('target_type', 'platform')
    .eq('status', 'active')
    .contains('related_screens', [screen]);

  return NextResponse.json({
    screen,
    overview: grouped.overview?.[0] ?? null,
    steps: grouped.steps ?? [],
    faq: grouped.faq ?? [],
    reference: grouped.reference ?? [],
    process: grouped.process ?? [],
    has_docs: rows.length > 0,
    related_docs: related ?? [],
  });
}

// POST /api/bop/sys/help  → author/update a doc (super_admin via UI)
export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const b = await req.json();
  if (!b.target_id || !b.doc_type) {
    return NextResponse.json({ error: 'target_id and doc_type are required' }, { status: 400 });
  }
  const row = {
    target_type: b.target_type ?? 'screen',
    target_id: b.target_id,
    doc_type: b.doc_type,
    seq: b.seq ?? 0,
    title: b.title ?? null,
    i18n_namespace: b.i18n_namespace ?? null,
    i18n_key: b.i18n_key ?? null,
    body_md: b.body_md ?? null,
    status: b.status ?? 'draft',
    owner: b.owner ?? null,
  };
  const { data, error } = await supabase
    .from('bop_documentation')
    .insert(row)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, doc: data });
}

export async function PATCH(req: NextRequest) {
  const supabase = getServerClient();
  const { doc_id, ...fields } = await req.json();
  if (!doc_id) return NextResponse.json({ error: 'doc_id is required' }, { status: 400 });
  const { data, error } = await supabase
    .from('bop_documentation')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('doc_id', doc_id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, doc: data });
}

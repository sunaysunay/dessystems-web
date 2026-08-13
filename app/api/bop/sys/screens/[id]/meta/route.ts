import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getServerClient();
  const { data, error } = await supabase
    .from('bop_screen_meta')
    .select('*')
    .eq('screen_id', id)
    .single();
  if (error && error.code !== 'PGRST116') return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ meta: data ?? null });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getServerClient();
  const body = await req.json();
  const changed_by: string = body.changed_by ?? 'system';

  // Fetch current for diff
  const { data: current } = await supabase
    .from('bop_screen_meta')
    .select('*')
    .eq('screen_id', id)
    .single();

  const payload = {
    screen_id: id,
    api_routes: body.api_routes,
    db_tables:  body.db_tables,
    nav_group:  body.nav_group,
    notes:      body.notes,
  };

  const { error } = await supabase
    .from('bop_screen_meta')
    .upsert(payload, { onConflict: 'screen_id' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Log changes to meta fields
  const logRows: any[] = [];
  for (const field of ['nav_group', 'notes'] as const) {
    const oldVal = current?.[field] !== null ? String(current[field]) : null;
    const newVal = body[field]      !== null ? String(body[field])    : null;
    if (oldVal !== newVal) {
      logRows.push({ screen_id: id, field: `meta.${field}`, old_val: oldVal, new_val: newVal, changed_by, source: 'meta' });
    }
  }
  // Log api_routes/db_tables as JSON snapshots if changed
  for (const field of ['api_routes', 'db_tables'] as const) {
    const oldVal = JSON.stringify(current?.[field] ?? []);
    const newVal = JSON.stringify(body[field]      ?? []);
    if (oldVal !== newVal) {
      logRows.push({ screen_id: id, field: `meta.${field}`, old_val: oldVal, new_val: newVal, changed_by, source: 'meta' });
    }
  }

  if (logRows.length > 0) await supabase.from('bop_change_log').insert(logRows);

  return NextResponse.json({ ok: true });
}

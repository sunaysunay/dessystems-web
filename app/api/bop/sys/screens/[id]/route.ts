import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getServerClient();
  const { data, error } = await supabase
    .from('bop_screens')
    .select('screen_id,title,module,route,func_type,sequence,status,description,parent_id,lifecycle_state,owner,updated_at')
    .eq('screen_id', id)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ screen: data });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getServerClient();
  const body = await req.json();

  const allowed = ['title', 'description', 'module', 'route', 'func_type', 'sequence', 'status', 'parent_id', 'lifecycle_state', 'owner'];
  const changed_by: string = body.changed_by ?? 'system';

  // Fetch current values for diff
  const { data: current } = await supabase
    .from('bop_screens')
    .select('*')
    .eq('screen_id', id)
    .single();

  const update: Record<string, any> = { updated_at: new Date().toISOString() };
  const logRows: any[] = [];

  for (const key of allowed) {
    if (!(key in body)) continue;
    update[key] = body[key];
    const oldVal = current?.[key] !== null ? String(current[key]) : null;
    const newVal = body[key]     !== null ? String(body[key])     : null;
    if (oldVal !== newVal) {
      logRows.push({
        screen_id: id,
        field: key,
        old_val: oldVal,
        new_val: newVal,
        changed_by,
        source: 'screen',
      });
    }
  }

  const { error } = await supabase.from('bop_screens').update(update).eq('screen_id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (logRows.length > 0) {
    await supabase.from('bop_change_log').insert(logRows);
  }

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export async function GET() {
  const supabase = getServerClient();
  const { data, error } = await supabase
    .from('bop_screens')
    .select('screen_id,title,module,route,func_type,sequence,status,description,parent_id,lifecycle_state,nav_group,nav_subgroup,nav_visible,nav_order,updated_at')
    .order('module').order('sequence');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ screens: data ?? [] });
}

// Upsert one or many screens — DB is the single source of truth
export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const body = await req.json();
  const rows = Array.isArray(body) ? body : [body];
  const { data, error } = await supabase
    .from('bop_screens')
    .upsert(rows.map(r => ({ ...r, updated_at: new Date().toISOString() })), { onConflict: 'screen_id' })
    .select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ upserted: data });
}

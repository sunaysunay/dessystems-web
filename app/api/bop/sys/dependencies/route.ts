import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { DEP_TYPES } from '@/lib/bop/types/objects';
import type { BopDependency } from '@/lib/bop/types/objects';

export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const { searchParams } = new URL(req.url);
  const from_id   = searchParams.get('from');
  const to_id     = searchParams.get('to');
  const dep_type  = searchParams.get('type');

  // If neither from nor to, return all (capped at 2000 for safety)
  let query = supabase
    .from('bop_dependencies')
    .select('*')
    .order('from_id')
    .limit(2000);

  if (from_id)  query = query.eq('from_id', from_id);
  if (to_id)    query = query.eq('to_id', to_id);
  if (dep_type && DEP_TYPES.includes(dep_type as any)) query = query.eq('dep_type', dep_type);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ dependencies: data ?? [], count: (data ?? []).length });
}

export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const body = await req.json();
  const rows: BopDependency[] = Array.isArray(body) ? body : [body];

  for (const row of rows) {
    if (!row.from_id) return NextResponse.json({ error: 'from_id is required' }, { status: 400 });
    if (!row.to_id)   return NextResponse.json({ error: 'to_id is required' }, { status: 400 });
    if (!DEP_TYPES.includes(row.dep_type)) {
      return NextResponse.json({ error: `Invalid dep_type: ${row.dep_type}. Must be one of: ${DEP_TYPES.join(', ')}` }, { status: 400 });
    }
    if (row.from_id === row.to_id) {
      return NextResponse.json({ error: 'Self-referential dependencies are not allowed' }, { status: 400 });
    }
  }

  const { data, error } = await supabase
    .from('bop_dependencies')
    .upsert(rows, { onConflict: 'from_id,to_id,dep_type' })
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ upserted: data, count: (data ?? []).length });
}

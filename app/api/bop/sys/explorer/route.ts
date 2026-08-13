import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { unstable_noStore as noStore } from 'next/cache';

export const dynamic = 'force-dynamic';

async function getAllowedTables(supabase: ReturnType<typeof getServerClient>): Promise<Set<string>> {
  const { data } = await supabase
    .from('bop_objects')
    .select('object_id,name,description,module')
    .eq('type', 'table')
    .limit(500);
  return new Set((data ?? []).map(r => r.object_id.replace('table:', '')));
}

async function getTableMeta(supabase: ReturnType<typeof getServerClient>) {
  const { data } = await supabase
    .from('bop_objects')
    .select('object_id,name,description,module,protection_lvl,criticality,change_policy')
    .eq('type', 'table')
    .order('module')
    .order('name')
    .limit(500);
  return (data ?? []).map(r => ({
    ...r,
    table_name: r.object_id.replace('table:', ''),
  }));
}

export async function GET(req: NextRequest) {
  noStore();
  const supabase = getServerClient();
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action') ?? 'rows';
  const table  = searchParams.get('table') ?? '';

  // ── List available tables ─────────────────────────────────────────────────
  if (action === 'tables') {
    const meta = await getTableMeta(supabase);
    return NextResponse.json({ tables: meta });
  }

  if (!table) return NextResponse.json({ error: 'table param required' }, { status: 400 });

  const allowed = await getAllowedTables(supabase);
  if (!allowed.has(table)) {
    return NextResponse.json({ error: `Table "${table}" is not registered in bop_objects` }, { status: 403 });
  }

  // ── Schema info ───────────────────────────────────────────────────────────
  if (action === 'schema') {
    const { data: sample } = await supabase.from(table as any).select('*').limit(1);
    const { count } = await supabase.from(table as any).select('*', { count: 'exact', head: true });
    const columns = sample && sample[0]
      ? Object.entries(sample[0]).map(([key, val]) => ({
          key,
          type: val === null ? 'unknown' : Array.isArray(val) ? 'array' : typeof val,
        }))
      : [];
    const meta = (await getTableMeta(supabase)).find(t => t.table_name === table);
    return NextResponse.json({ columns, row_count: count ?? 0, meta });
  }

  // ── Technical info ────────────────────────────────────────────────────────
  if (action === 'tech') {
    const { data, error } = await supabase.rpc('bop_table_tech_info', { p_table: table });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? {});
  }

  // ── Where Used ────────────────────────────────────────────────────────────
  if (action === 'whereused') {
    // Get the table's own bop_objects entry to know its module
    const { data: tableObj } = await supabase
      .from('bop_objects')
      .select('object_id,name,module,description,protection_lvl,status')
      .eq('object_id', `table:${table}`)
      .single();

    const module = tableObj?.module ?? null;

    // Screens in same module (from bop_screens joined to bop_objects)
    const { data: screens } = module
      ? await supabase
          .from('bop_screens')
          .select('screen_id,title,description,route,func_type,sequence,icon')
          .eq('module', module)
          .order('sequence')
          .limit(200)
      : { data: [] };

    // BOP objects in same module grouped: apis, dashboards, reports, workflows, components
    const { data: objects } = module
      ? await supabase
          .from('bop_objects')
          .select('object_id,type,name,route,status,protection_lvl,description')
          .eq('module', module)
          .not('type', 'eq', 'table')  // exclude tables, show related objects
          .order('type')
          .order('name')
          .limit(300)
      : { data: [] };

    // Reverse FK: other tables that reference this one (via RPC)
    const { data: reverseFks } = await supabase.rpc('bop_table_reverse_fks', { p_table: table });

    return NextResponse.json({
      table_obj: tableObj ?? null,
      module,
      screens: screens ?? [],
      objects: objects ?? [],
      referenced_by: reverseFks ?? [],
    });
  }

  // ── Row data ──────────────────────────────────────────────────────────────
  const page   = parseInt(searchParams.get('page') ?? '0');
  const limit  = Math.min(parseInt(searchParams.get('limit') ?? '50'), 500);
  const q      = searchParams.get('q') ?? '';
  const sort   = searchParams.get('sort') ?? 'id';
  const dir    = searchParams.get('dir') === 'desc' ? false : true;
  const from   = page * limit;
  const to     = from + limit - 1;

  let query = supabase
    .from(table as any)
    .select('*', { count: 'exact' })
    .order(sort, { ascending: dir })
    .range(from, to);

  if (q) {
    const textCols = ['id', 'name', 'title', 'email', 'object_id', 'key', 'screen_id', 'description', 'route'];
    const filters = textCols.map(c => `${c}.ilike.%${q}%`).join(',');
    query = query.or(filters);
  }

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    rows: data ?? [],
    total: count ?? 0,
    page,
    limit,
    pages: Math.ceil((count ?? 0) / limit),
  });
}

export async function PATCH(req: NextRequest) {
  noStore();
  const supabase = getServerClient();
  const { searchParams } = new URL(req.url);
  const table = searchParams.get('table') ?? '';
  const pk    = searchParams.get('pk') ?? 'id';
  const pkVal = searchParams.get('pk_value') ?? '';

  if (!table || !pkVal) {
    return NextResponse.json({ error: 'table and pk_value required' }, { status: 400 });
  }

  const allowed = await getAllowedTables(supabase);
  if (!allowed.has(table)) {
    return NextResponse.json({ error: `Table "${table}" is not registered` }, { status: 403 });
  }

  const body = await req.json();
  const safeBody = { ...body };
  delete safeBody[pk];
  delete safeBody.id;
  delete safeBody.created_at;
  delete safeBody.registered_at;

  const { data, error } = await supabase
    .from(table as any)
    .update(safeBody)
    .eq(pk, pkVal)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ row: data });
}

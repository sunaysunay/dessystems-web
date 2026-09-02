export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getReadPool } from '@/lib/db-console/pools';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const action = sp.get('action') ?? 'schemas';
  const schema = sp.get('schema') ?? 'public';
  const table = sp.get('table');

  const pool = getReadPool();

  try {
    switch (action) {
      case 'schemas': {
        const { rows } = await pool.query('SELECT * FROM bop_meta.list_schemas()');
        return NextResponse.json({ schemas: rows });
      }
      case 'tables': {
        const { rows } = await pool.query('SELECT * FROM bop_meta.list_tables($1)', [schema]);
        return NextResponse.json({ tables: rows });
      }
      case 'columns': {
        if (!table) return NextResponse.json({ error: 'table param required' }, { status: 400 });
        const { rows } = await pool.query('SELECT * FROM bop_meta.list_columns($1, $2)', [schema, table]);
        return NextResponse.json({ columns: rows });
      }
      case 'indexes': {
        if (!table) return NextResponse.json({ error: 'table param required' }, { status: 400 });
        const { rows } = await pool.query('SELECT * FROM bop_meta.list_indexes($1, $2)', [schema, table]);
        return NextResponse.json({ indexes: rows });
      }
      case 'fkeys': {
        if (!table) return NextResponse.json({ error: 'table param required' }, { status: 400 });
        const { rows } = await pool.query('SELECT * FROM bop_meta.list_foreign_keys($1, $2)', [schema, table]);
        return NextResponse.json({ foreign_keys: rows });
      }
      case 'policies': {
        if (!table) return NextResponse.json({ error: 'table param required' }, { status: 400 });
        const { rows } = await pool.query('SELECT * FROM bop_meta.list_policies($1, $2)', [schema, table]);
        return NextResponse.json({ policies: rows });
      }
      case 'triggers': {
        if (!table) return NextResponse.json({ error: 'table param required' }, { status: 400 });
        const { rows } = await pool.query('SELECT * FROM bop_meta.list_triggers($1, $2)', [schema, table]);
        return NextResponse.json({ triggers: rows });
      }
      case 'enums': {
        const { rows } = await pool.query('SELECT * FROM bop_meta.list_enums($1)', [schema]);
        return NextResponse.json({ enums: rows });
      }
      case 'extensions': {
        const { rows } = await pool.query('SELECT * FROM bop_meta.list_extensions()');
        return NextResponse.json({ extensions: rows });
      }
      case 'table_detail': {
        if (!table) return NextResponse.json({ error: 'table param required' }, { status: 400 });
        const [cols, idx, fks, pol, trg] = await Promise.all([
          pool.query('SELECT * FROM bop_meta.list_columns($1, $2)', [schema, table]),
          pool.query('SELECT * FROM bop_meta.list_indexes($1, $2)', [schema, table]),
          pool.query('SELECT * FROM bop_meta.list_foreign_keys($1, $2)', [schema, table]),
          pool.query('SELECT * FROM bop_meta.list_policies($1, $2)', [schema, table]),
          pool.query('SELECT * FROM bop_meta.list_triggers($1, $2)', [schema, table]),
        ]);
        return NextResponse.json({
          columns: cols.rows,
          indexes: idx.rows,
          foreign_keys: fks.rows,
          policies: pol.rows,
          triggers: trg.rows,
        });
      }
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 });
  }
}

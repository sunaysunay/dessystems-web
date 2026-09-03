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
      case 'table_screens': {
        const { rows } = await pool.query(`
          SELECT sm.screen_id, s.title, s.module, s.route,
                 jsonb_array_elements_text(sm.db_tables) AS table_name
          FROM bop_screen_meta sm
          JOIN bop_screens s ON s.screen_id = sm.screen_id
          WHERE sm.db_tables IS NOT NULL
            AND jsonb_typeof(sm.db_tables) = 'array'
          ORDER BY sm.screen_id
        `);
        const map: Record<string, { screen_id: string; title: string; module: string; route: string }[]> = {};
        for (const r of rows) {
          if (!map[r.table_name]) map[r.table_name] = [];
          map[r.table_name].push({ screen_id: r.screen_id, title: r.title, module: r.module, route: r.route });
        }
        return NextResponse.json({ table_screens: map });
      }
      case 'all_fkeys': {
        const { rows } = await pool.query(`
          SELECT
            conname AS constraint_name,
            src.relname AS source_table,
            tgt.relname AS target_table,
            array_agg(sa.attname ORDER BY x.ord) AS source_columns,
            array_agg(ta.attname ORDER BY x.ord) AS target_columns
          FROM pg_constraint c
          JOIN pg_class src ON src.oid = c.conrelid
          JOIN pg_class tgt ON tgt.oid = c.confrelid
          JOIN pg_namespace ns ON ns.oid = src.relnamespace
          CROSS JOIN LATERAL unnest(c.conkey, c.confkey) WITH ORDINALITY AS x(src_att, tgt_att, ord)
          JOIN pg_attribute sa ON sa.attrelid = c.conrelid AND sa.attnum = x.src_att
          JOIN pg_attribute ta ON ta.attrelid = c.confrelid AND ta.attnum = x.tgt_att
          WHERE c.contype = 'f' AND ns.nspname = $1
          GROUP BY c.conname, src.relname, tgt.relname
          ORDER BY src.relname, tgt.relname
        `, [schema]);
        return NextResponse.json({ foreign_keys: rows });
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

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getReadPool, getWritePool } from '@/lib/db-console/pools';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const action = sp.get('action') ?? 'list';
  const schema = sp.get('schema') ?? 'public';
  const table = sp.get('table');
  const search = sp.get('search');

  const pool = getReadPool();

  try {
    switch (action) {
      case 'list': {
        const { rows } = await pool.query(
          `SELECT table_name, description, tags, module
           FROM bop_table_docs
           WHERE schema_name = $1 AND column_name IS NULL
           ORDER BY table_name`,
          [schema]
        );
        return NextResponse.json({ docs: rows });
      }
      case 'table': {
        if (!table) return NextResponse.json({ error: 'table param required' }, { status: 400 });
        const { rows } = await pool.query(
          `SELECT table_name, column_name, description, tags, module, updated_by, updated_at
           FROM bop_table_docs
           WHERE schema_name = $1 AND table_name = $2
           ORDER BY column_name NULLS FIRST`,
          [schema, table]
        );
        return NextResponse.json({ docs: rows });
      }
      case 'search': {
        if (!search) return NextResponse.json({ error: 'search param required' }, { status: 400 });
        const { rows } = await pool.query(
          `SELECT table_name, column_name, description, tags, module,
                  ts_rank(search_vector, websearch_to_tsquery('english', $2)) AS rank
           FROM bop_table_docs
           WHERE schema_name = $1
             AND search_vector @@ websearch_to_tsquery('english', $2)
           ORDER BY rank DESC
           LIMIT 50`,
          [schema, search]
        );
        return NextResponse.json({ results: rows });
      }
      case 'columns_index': {
        const { rows } = await pool.query(
          `SELECT c.relname AS table_name,
                  array_agg(a.attname ORDER BY a.attnum) AS columns
           FROM pg_class c
           JOIN pg_namespace n ON n.oid = c.relnamespace
           JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
           WHERE c.relkind = 'r' AND n.nspname = $1
           GROUP BY c.relname
           ORDER BY c.relname`,
          [schema]
        );
        return NextResponse.json({ tables: rows });
      }
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { schema_name, table_name, column_name, description, tags, module, updated_by } = body;

  if (!table_name || !description) {
    return NextResponse.json({ error: 'table_name and description required' }, { status: 400 });
  }

  const pool = getWritePool();

  try {
    const { rows } = await pool.query(
      `INSERT INTO bop_table_docs (schema_name, table_name, column_name, description, tags, module, updated_by, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, now())
       ON CONFLICT (schema_name, table_name, column_name)
       DO UPDATE SET description = EXCLUDED.description,
                     tags = COALESCE(EXCLUDED.tags, bop_table_docs.tags),
                     module = COALESCE(EXCLUDED.module, bop_table_docs.module),
                     updated_by = EXCLUDED.updated_by,
                     updated_at = now()
       RETURNING *`,
      [schema_name ?? 'public', table_name, column_name ?? null, description, tags ?? [], module ?? null, updated_by ?? 'console']
    );
    return NextResponse.json({ doc: rows[0] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 });
  }
}

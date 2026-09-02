export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getReadPool, getWritePool } from '@/lib/db-console/pools';

const MAX_ROWS = 200;

function ident(name: string): string {
  return '"' + name.replace(/"/g, '""') + '"';
}

function qualifiedTable(schema: string, table: string): string {
  return `${ident(schema)}.${ident(table)}`;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const action = sp.get('action') ?? 'rows';
  const schema = sp.get('schema') ?? 'public';
  const table = sp.get('table');

  if (!table) return NextResponse.json({ error: 'table param required' }, { status: 400 });

  const pool = getReadPool();

  try {
    switch (action) {
      case 'rows': {
        const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10));
        const limit = Math.min(MAX_ROWS, Math.max(1, parseInt(sp.get('limit') ?? '50', 10)));
        const sortCol = sp.get('sort');
        const sortDir = (sp.get('dir') ?? 'asc').toLowerCase() === 'desc' ? 'DESC' : 'ASC';
        const filter = sp.get('filter') ?? '';
        const offset = (page - 1) * limit;

        const qt = qualifiedTable(schema, table);

        let whereClause = '';
        const whereParams: any[] = [];
        if (filter) {
          const colsRes = await pool.query(
            'SELECT * FROM bop_meta.list_columns($1, $2)',
            [schema, table],
          );
          const textCols = colsRes.rows
            .filter((c: any) => ['text', 'character varying', 'varchar', 'char', 'name', 'uuid'].includes(c.data_type))
            .map((c: any) => c.column_name);
          if (textCols.length > 0) {
            const conditions = textCols.map((col: string, i: number) => `${ident(col)}::text ILIKE $${i + 1}`);
            whereClause = `WHERE ${conditions.join(' OR ')}`;
            const pattern = `%${filter}%`;
            for (let i = 0; i < textCols.length; i++) whereParams.push(pattern);
          }
        }

        const orderClause = sortCol ? `ORDER BY ${ident(sortCol)} ${sortDir} NULLS LAST` : '';

        const countRes = await pool.query(
          `SELECT count(*)::int AS total FROM ${qt} ${whereClause}`,
          whereParams,
        );
        const total = countRes.rows[0]?.total ?? 0;

        const dataRes = await pool.query(
          `SELECT * FROM ${qt} ${whereClause} ${orderClause} LIMIT $${whereParams.length + 1} OFFSET $${whereParams.length + 2}`,
          [...whereParams, limit, offset],
        );

        return NextResponse.json({
          rows: dataRes.rows,
          columns: dataRes.fields.map(f => f.name),
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        });
      }

      case 'pk': {
        const res = await pool.query(
          `SELECT a.attname AS column_name
           FROM pg_index i
           JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
           WHERE i.indrelid = ($1 || '.' || $2)::regclass
             AND i.indisprimary
           ORDER BY array_position(i.indkey, a.attnum)`,
          [schema, table],
        );
        return NextResponse.json({ pk_columns: res.rows.map((r: any) => r.column_name) });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action, schema = 'public', table, row, pk_values, updates } = body;

  if (!table) return NextResponse.json({ error: 'table required' }, { status: 400 });

  const pool = getWritePool();
  const qt = qualifiedTable(schema, table);

  try {
    switch (action) {
      case 'insert': {
        if (!row || typeof row !== 'object') return NextResponse.json({ error: 'row object required' }, { status: 400 });
        const keys = Object.keys(row).filter(k => row[k] !== undefined && row[k] !== '');
        if (keys.length === 0) return NextResponse.json({ error: 'at least one column required' }, { status: 400 });
        const cols = keys.map(k => ident(k)).join(', ');
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
        const vals = keys.map(k => row[k] === '' ? null : row[k]);
        const res = await pool.query(
          `INSERT INTO ${qt} (${cols}) VALUES (${placeholders}) RETURNING *`,
          vals,
        );
        return NextResponse.json({ inserted: res.rows[0] });
      }

      case 'update': {
        if (!pk_values || !updates) return NextResponse.json({ error: 'pk_values and updates required' }, { status: 400 });
        const pkKeys = Object.keys(pk_values);
        const updKeys = Object.keys(updates);
        if (pkKeys.length === 0 || updKeys.length === 0) return NextResponse.json({ error: 'empty pk or updates' }, { status: 400 });

        let paramIdx = 1;
        const setClauses = updKeys.map(k => `${ident(k)} = $${paramIdx++}`);
        const whereClauses = pkKeys.map(k => `${ident(k)} = $${paramIdx++}`);
        const vals = [...updKeys.map(k => updates[k] === '' ? null : updates[k]), ...pkKeys.map(k => pk_values[k])];

        const res = await pool.query(
          `UPDATE ${qt} SET ${setClauses.join(', ')} WHERE ${whereClauses.join(' AND ')} RETURNING *`,
          vals,
        );
        return NextResponse.json({ updated: res.rows[0] ?? null, count: res.rowCount });
      }

      case 'delete': {
        if (!pk_values) return NextResponse.json({ error: 'pk_values required' }, { status: 400 });
        const pkKeys = Object.keys(pk_values);
        if (pkKeys.length === 0) return NextResponse.json({ error: 'empty pk' }, { status: 400 });

        const whereClauses = pkKeys.map((k, i) => `${ident(k)} = $${i + 1}`);
        const vals = pkKeys.map(k => pk_values[k]);

        const res = await pool.query(
          `DELETE FROM ${qt} WHERE ${whereClauses.join(' AND ')}`,
          vals,
        );
        return NextResponse.json({ deleted: res.rowCount });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 });
  }
}

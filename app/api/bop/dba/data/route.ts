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

      case 'export': {
        const format = sp.get('format') ?? 'csv';
        const sortCol = sp.get('sort');
        const sortDir = (sp.get('dir') ?? 'asc').toLowerCase() === 'desc' ? 'DESC' : 'ASC';
        const filter = sp.get('filter') ?? '';
        const exportLimit = 10000;
        const qt = qualifiedTable(schema, table);

        let whereClause = '';
        const whereParams: any[] = [];
        if (filter) {
          const colsRes = await pool.query('SELECT * FROM bop_meta.list_columns($1, $2)', [schema, table]);
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
        const dataRes = await pool.query(
          `SELECT * FROM ${qt} ${whereClause} ${orderClause} LIMIT $${whereParams.length + 1}`,
          [...whereParams, exportLimit],
        );

        const cols = dataRes.fields.map(f => f.name);
        const rows2 = dataRes.rows;

        if (format === 'json') {
          return new Response(JSON.stringify(rows2, null, 2), {
            headers: {
              'Content-Type': 'application/json',
              'Content-Disposition': `attachment; filename="${table}.json"`,
            },
          });
        }

        if (format === 'sql') {
          const lines = rows2.map(row => {
            const vals = cols.map(c => {
              const v = row[c];
              if (v === null || v === undefined) return 'NULL';
              if (typeof v === 'number' || typeof v === 'boolean') return String(v);
              if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
              return `'${String(v).replace(/'/g, "''")}'`;
            });
            return `INSERT INTO ${ident(schema)}.${ident(table)} (${cols.map(c => ident(c)).join(', ')}) VALUES (${vals.join(', ')});`;
          });
          return new Response(lines.join('\n'), {
            headers: {
              'Content-Type': 'text/sql',
              'Content-Disposition': `attachment; filename="${table}.sql"`,
            },
          });
        }

        if (format === 'tsv') {
          const header = cols.join('\t');
          const body = rows2.map(row =>
            cols.map(c => {
              const v = row[c];
              if (v === null || v === undefined) return '';
              if (typeof v === 'object') return JSON.stringify(v);
              return String(v).replace(/\t/g, ' ').replace(/\n/g, ' ');
            }).join('\t')
          ).join('\n');
          return new Response(header + '\n' + body, {
            headers: {
              'Content-Type': 'text/tab-separated-values',
              'Content-Disposition': `attachment; filename="${table}.tsv"`,
            },
          });
        }

        // Default: CSV
        const escCsv = (v: any): string => {
          if (v === null || v === undefined) return '';
          const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
          if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
          return s;
        };
        const header = cols.map(escCsv).join(',');
        const csvBody = rows2.map(row => cols.map(c => escCsv(row[c])).join(',')).join('\n');
        return new Response(header + '\n' + csvBody, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="${table}.csv"`,
          },
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

      case 'columns_meta': {
        const res = await pool.query(
          'SELECT * FROM bop_meta.list_columns($1, $2)',
          [schema, table],
        );
        return NextResponse.json({ columns_meta: res.rows });
      }

      case 'protection': {
        const res = await pool.query(
          `SELECT
             CASE
               WHEN t.table_name LIKE 'pg_%' OR t.table_name LIKE 'auth_%' OR n.nspname IN ('pg_catalog','information_schema','auth','storage','vault','pgsodium','_realtime','supabase_migrations','supabase_functions','graphql','graphql_public','_analytics','extensions','net','cron','pgbouncer') THEN 0
               WHEN t.table_name IN ('bop_modules','bop_screens','bop_screen_roles','bop_settings','bop_tenants','bop_roles') THEN 1
               WHEN t.table_name LIKE 'bop_%' AND t.table_name NOT LIKE 'bop_db_%' AND t.table_name NOT LIKE 'bop_log_%' THEN 2
               WHEN t.table_name LIKE 'bop_log_%' OR t.table_name LIKE 'bop_db_%' THEN 4
               ELSE 3
             END AS protection_level,
             CASE
               WHEN t.table_name LIKE 'pg_%' OR t.table_name LIKE 'auth_%' OR n.nspname IN ('pg_catalog','information_schema','auth','storage','vault','pgsodium','_realtime','supabase_migrations','supabase_functions','graphql','graphql_public','_analytics','extensions','net','cron','pgbouncer') THEN 'System Critical'
               WHEN t.table_name IN ('bop_modules','bop_screens','bop_screen_roles','bop_settings','bop_tenants','bop_roles') THEN 'Configuration'
               WHEN t.table_name LIKE 'bop_%' AND t.table_name NOT LIKE 'bop_db_%' AND t.table_name NOT LIKE 'bop_log_%' THEN 'Business Data'
               WHEN t.table_name LIKE 'bop_log_%' OR t.table_name LIKE 'bop_db_%' THEN 'Logs/Temp'
               ELSE 'Operational'
             END AS protection_label
           FROM information_schema.tables t
           JOIN pg_namespace n ON n.nspname = t.table_schema
           WHERE t.table_schema = $1 AND t.table_name = $2`,
          [schema, table],
        );
        const row = res.rows[0];
        if (!row) return NextResponse.json({ protection: { level: 3, label: 'Operational' } });
        return NextResponse.json({
          protection: { level: row.protection_level, label: row.protection_label },
        });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 });
  }
}

const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';
const SYSTEM_USER_EMAIL = 'console@system';

function simpleHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

function clientIpFrom(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  const real = req.headers.get('x-real-ip');
  if (real) return real.trim();
  return '127.0.0.1';
}

function fmtVal(v: any): string {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
  return `'${String(v).replace(/'/g, "''")}'`;
}

async function logAudit(
  pool: ReturnType<typeof getWritePool>,
  opts: {
    statementClass: string;
    sqlText: string;
    rowsAffected: number;
    clientIp: string;
  },
): Promise<void> {
  const sqlHash = simpleHash(`${opts.statementClass}:${opts.sqlText}:${Date.now()}`);
  await pool.query(
    `INSERT INTO bop_db_query_log (user_id, user_email, statement_class, sql_hash, sql_text, rows_affected, was_committed, pg_role_used, client_ip)
     VALUES ($1, $2, $3, $4, $5, $6, true, 'bop_console_write', $7)`,
    [
      SYSTEM_USER_ID,
      SYSTEM_USER_EMAIL,
      opts.statementClass,
      sqlHash,
      opts.sqlText,
      opts.rowsAffected,
      opts.clientIp,
    ],
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action, schema = 'public', table, row, pk_values, updates, rows } = body;

  if (!table) return NextResponse.json({ error: 'table required' }, { status: 400 });

  const pool = getWritePool();
  const qt = qualifiedTable(schema, table);
  const clientIp = clientIpFrom(req);

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

        const summary = `INSERT INTO ${schema}.${table} (${keys.join(', ')}) VALUES (${keys.map(k => fmtVal(row[k] === '' ? null : row[k])).join(', ')})`;
        await logAudit(pool, {
          statementClass: 'INSERT',
          sqlText: summary,
          rowsAffected: res.rowCount ?? 0,
          clientIp,
        });

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

        const setSummary = updKeys.map(k => `${k}=${fmtVal(updates[k] === '' ? null : updates[k])}`).join(', ');
        const whereSummary = pkKeys.map(k => `${k}=${fmtVal(pk_values[k])}`).join(' AND ');
        const summary = `UPDATE ${schema}.${table} SET ${setSummary} WHERE ${whereSummary}`;
        await logAudit(pool, {
          statementClass: 'UPDATE',
          sqlText: summary,
          rowsAffected: res.rowCount ?? 0,
          clientIp,
        });

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

        const whereSummary = pkKeys.map(k => `${k}=${fmtVal(pk_values[k])}`).join(' AND ');
        const summary = `DELETE FROM ${schema}.${table} WHERE ${whereSummary}`;
        await logAudit(pool, {
          statementClass: 'DELETE',
          sqlText: summary,
          rowsAffected: res.rowCount ?? 0,
          clientIp,
        });

        return NextResponse.json({ deleted: res.rowCount });
      }

      case 'batch_delete': {
        if (!Array.isArray(rows) || rows.length === 0) {
          return NextResponse.json({ error: 'rows array required' }, { status: 400 });
        }

        let totalDeleted = 0;
        const errors: string[] = [];
        const summaries: string[] = [];

        for (const pkVals of rows) {
          const pkKeys = Object.keys(pkVals ?? {});
          if (pkKeys.length === 0) {
            errors.push('empty pk_values in batch item');
            continue;
          }
          try {
            const whereClauses = pkKeys.map((k, i) => `${ident(k)} = $${i + 1}`);
            const vals = pkKeys.map(k => pkVals[k]);
            const res = await pool.query(
              `DELETE FROM ${qt} WHERE ${whereClauses.join(' AND ')}`,
              vals,
            );
            totalDeleted += res.rowCount ?? 0;
            const whereSummary = pkKeys.map(k => `${k}=${fmtVal(pkVals[k])}`).join(' AND ');
            summaries.push(`DELETE FROM ${schema}.${table} WHERE ${whereSummary}`);
          } catch (err: any) {
            errors.push(err.message ?? 'delete failed');
          }
        }

        if (totalDeleted > 0) {
          await logAudit(pool, {
            statementClass: 'DELETE',
            sqlText: `BATCH DELETE (${rows.length} rows): ${summaries.join('; ')}`,
            rowsAffected: totalDeleted,
            clientIp,
          });
        }

        return NextResponse.json({ deleted: totalDeleted, errors });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 });
  }
}

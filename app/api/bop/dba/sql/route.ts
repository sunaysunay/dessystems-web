export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getReadPool, getWritePool } from '@/lib/db-console/pools';

const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';
const SYSTEM_USER_EMAIL = 'console@system';
const MAX_SELECT_ROWS = 1000;

type StatementClass = 'select' | 'insert' | 'update' | 'delete' | 'ddl' | 'other';

interface Classification {
  statement_class: StatementClass;
  is_read_only: boolean;
  is_destructive: boolean;
  requires_confirmation: boolean;
}

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

/**
 * Strip leading whitespace and comments (line comments and block comments)
 * so the first real keyword can be inspected.
 */
function stripLeadingComments(sql: string): string {
  let s = sql;
  let changed = true;
  while (changed) {
    changed = false;
    const trimmed = s.replace(/^\s+/, '');
    if (trimmed !== s) {
      s = trimmed;
      changed = true;
      continue;
    }
    if (s.startsWith('--')) {
      const nl = s.indexOf('\n');
      s = nl === -1 ? '' : s.slice(nl + 1);
      changed = true;
      continue;
    }
    if (s.startsWith('/*')) {
      const end = s.indexOf('*/');
      s = end === -1 ? '' : s.slice(end + 2);
      changed = true;
      continue;
    }
  }
  return s;
}

function classifySql(sql: string): Classification {
  const cleaned = stripLeadingComments(sql ?? '').trimStart();
  const match = cleaned.match(/^([A-Za-z]+)/);
  const keyword = (match ? match[1] : '').toUpperCase();

  let statement_class: StatementClass;
  switch (keyword) {
    case 'SELECT':
    case 'WITH':
      statement_class = 'select';
      break;
    case 'INSERT':
      statement_class = 'insert';
      break;
    case 'UPDATE':
      statement_class = 'update';
      break;
    case 'DELETE':
      statement_class = 'delete';
      break;
    case 'CREATE':
    case 'ALTER':
    case 'DROP':
    case 'TRUNCATE':
      statement_class = 'ddl';
      break;
    default:
      statement_class = 'other';
  }

  const is_read_only = statement_class === 'select';
  const is_destructive = statement_class === 'delete' || statement_class === 'ddl';
  const requires_confirmation =
    statement_class === 'delete' || statement_class === 'ddl' || statement_class === 'update';

  return { statement_class, is_read_only, is_destructive, requires_confirmation };
}

/**
 * Detects a semicolon that separates two statements — i.e. a ';' that is not
 * inside a quoted string/identifier and is followed by more non-whitespace
 * content. A single trailing ';' (optionally followed only by whitespace) is fine.
 */
function hasMultipleStatements(sql: string): boolean {
  let inSingle = false;
  let inDouble = false;
  let inDollar = false;
  let dollarTag = '';

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];

    if (inDollar) {
      if (ch === '$') {
        const rest = sql.slice(i);
        const tagMatch = rest.match(/^\$([A-Za-z_][A-Za-z0-9_]*)?\$/);
        if (tagMatch && `$${tagMatch[1] ?? ''}$` === dollarTag) {
          inDollar = false;
          i += dollarTag.length - 1;
        }
      }
      continue;
    }
    if (inSingle) {
      if (ch === "'") {
        if (sql[i + 1] === "'") { i++; continue; }
        inSingle = false;
      }
      continue;
    }
    if (inDouble) {
      if (ch === '"') {
        if (sql[i + 1] === '"') { i++; continue; }
        inDouble = false;
      }
      continue;
    }

    if (ch === "'") { inSingle = true; continue; }
    if (ch === '"') { inDouble = true; continue; }
    if (ch === '$') {
      const rest = sql.slice(i);
      const tagMatch = rest.match(/^\$([A-Za-z_][A-Za-z0-9_]*)?\$/);
      if (tagMatch) {
        inDollar = true;
        dollarTag = `$${tagMatch[1] ?? ''}$`;
        i += dollarTag.length - 1;
        continue;
      }
    }
    if (ch === ';') {
      const rest = sql.slice(i + 1);
      if (rest.trim().length > 0) return true;
    }
  }
  return false;
}

function findBlockedOperation(sql: string): string | null {
  const normalized = sql.replace(/\s+/g, ' ').toUpperCase();
  if (/\bDROP\s+DATABASE\b/.test(normalized)) return 'DROP DATABASE';
  if (/\bDROP\s+SCHEMA\s+PUBLIC\b/.test(normalized)) return 'DROP SCHEMA public';
  return null;
}

async function logQuery(
  pool: ReturnType<typeof getWritePool>,
  opts: {
    statementClass: string;
    sqlText: string;
    executionMs: number | null;
    rowsAffected: number | null;
    wasDryRun: boolean;
    wasCommitted: boolean;
    clientIp: string;
  },
): Promise<void> {
  const sqlHash = simpleHash(`${opts.statementClass}:${opts.sqlText}:${Date.now()}`);
  await pool.query(
    `INSERT INTO bop_db_query_log
       (user_id, user_email, statement_class, sql_hash, sql_text, execution_ms, rows_affected, was_dry_run, was_committed, pg_role_used, client_ip)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      SYSTEM_USER_ID,
      SYSTEM_USER_EMAIL,
      opts.statementClass,
      sqlHash,
      opts.sqlText,
      opts.executionMs,
      opts.rowsAffected,
      opts.wasDryRun,
      opts.wasCommitted,
      'bop_console_write',
      opts.clientIp,
    ],
  );
}

const RANGE_INTERVAL: Record<string, string | null> = {
  '1h': '1 hour',
  '24h': '24 hours',
  '7d': '7 days',
  '30d': '30 days',
  all: null,
};

/**
 * Shared WHERE-clause builder for the history / history_stats actions.
 * Supports: class (statement_class), range (time window), search (sql_text ILIKE),
 * user (user_email ILIKE).
 */
function buildHistoryWhere(
  sp: URLSearchParams,
  classFilter: string | null,
): { whereClause: string; whereParams: any[] } {
  const conditions: string[] = [];
  const params: any[] = [];

  if (classFilter) {
    params.push(classFilter);
    conditions.push(`statement_class = $${params.length}`);
  }

  const range = (sp.get('range') ?? 'all').toLowerCase();
  const interval = RANGE_INTERVAL[range];
  if (interval) {
    params.push(interval);
    conditions.push(`executed_at >= now() - $${params.length}::interval`);
  }

  const search = sp.get('search');
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`sql_text ILIKE $${params.length}`);
  }

  const user = sp.get('user');
  if (user) {
    params.push(`%${user}%`);
    conditions.push(`user_email ILIKE $${params.length}`);
  }

  return {
    whereClause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    whereParams: params,
  };
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const action = sp.get('action') ?? 'classify';

  try {
    switch (action) {
      case 'classify': {
        const sql = sp.get('sql') ?? '';
        if (!sql.trim()) {
          return NextResponse.json({ error: 'sql param required' }, { status: 400 });
        }
        const classification = classifySql(sql);
        return NextResponse.json({ classification });
      }

      case 'history': {
        const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10));
        const limit = Math.min(200, Math.max(1, parseInt(sp.get('limit') ?? '50', 10)));
        const classFilter = sp.get('class');
        const offset = (page - 1) * limit;

        const pool = getReadPool();

        const { whereClause, whereParams } = buildHistoryWhere(sp, classFilter);

        const countRes = await pool.query(
          `SELECT count(*)::int AS total FROM bop_db_query_log ${whereClause}`,
          whereParams,
        );
        const total = countRes.rows[0]?.total ?? 0;

        const dataParams = [...whereParams, limit, offset];
        const dataRes = await pool.query(
          `SELECT * FROM bop_db_query_log ${whereClause}
           ORDER BY executed_at DESC
           LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
          dataParams,
        );

        return NextResponse.json({
          history: dataRes.rows,
          total,
          page,
          limit,
          pages: Math.max(1, Math.ceil(total / limit)),
        });
      }

      case 'history_stats': {
        const classFilter = sp.get('class');
        const pool = getReadPool();
        const { whereClause, whereParams } = buildHistoryWhere(sp, classFilter);

        const totalsRes = await pool.query(
          `SELECT count(*)::int AS total, avg(execution_ms)::numeric(10,2) AS avg_ms
             FROM bop_db_query_log ${whereClause}`,
          whereParams,
        );
        const byClassRes = await pool.query(
          `SELECT statement_class, count(*)::int AS count
             FROM bop_db_query_log ${whereClause}
             GROUP BY statement_class`,
          whereParams,
        );

        const byClass: Record<string, number> = {};
        for (const r of byClassRes.rows) byClass[r.statement_class] = r.count;

        return NextResponse.json({
          total: totalsRes.rows[0]?.total ?? 0,
          avg_ms: totalsRes.rows[0]?.avg_ms !== null ? Number(totalsRes.rows[0].avg_ms) : null,
          by_class: byClass,
        });
      }

      case 'saved': {
        const pool = getReadPool();
        try {
          const res = await pool.query(
            'SELECT * FROM bop_saved_queries ORDER BY created_at DESC',
          );
          return NextResponse.json({ queries: res.rows });
        } catch {
          return NextResponse.json({ queries: [] });
        }
      }

      case 'migrations': {
        const pool = getReadPool();
        try {
          const res = await pool.query(
            'SELECT * FROM bop_migrations ORDER BY applied_at DESC NULLS LAST, filename ASC',
          );
          return NextResponse.json({ migrations: res.rows, table_exists: true });
        } catch {
          // bop_migrations table not present yet — fall back to recent DDL from the query log
          let recentDdl: any[] = [];
          try {
            const ddlRes = await pool.query(
              `SELECT * FROM bop_db_query_log WHERE statement_class = 'ddl' ORDER BY executed_at DESC LIMIT 5`,
            );
            recentDdl = ddlRes.rows;
          } catch {
            recentDdl = [];
          }
          return NextResponse.json({
            migrations: [],
            table_exists: false,
            message: 'No migration tracking table found.',
            recent_ddl: recentDdl,
          });
        }
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const action = body.action ?? 'execute';
  const clientIp = clientIpFrom(req);

  try {
    switch (action) {
      case 'execute': {
        const sql: string = body.sql ?? '';
        const dryRun: boolean = !!body.dry_run;

        if (!sql.trim()) {
          return NextResponse.json({ error: 'sql required' }, { status: 400 });
        }

        if (hasMultipleStatements(sql)) {
          return NextResponse.json({ error: 'Multiple statements not allowed' }, { status: 400 });
        }

        const blocked = findBlockedOperation(sql);
        if (blocked) {
          return NextResponse.json({ error: `Blocked: dangerous operation (${blocked})` }, { status: 400 });
        }

        const classification = classifySql(sql);
        const pool = classification.statement_class === 'select' ? getReadPool() : getWritePool();

        if (dryRun && classification.statement_class !== 'select') {
          if (classification.statement_class === 'ddl') {
            return NextResponse.json({
              error: 'DDL statements cannot be dry-run; disable dry run to execute DDL directly',
            }, { status: 400 });
          }

          const client = await pool.connect();
          try {
            await client.query('BEGIN');
            let plan: any = null;
            let estimatedRows: number | null = null;
            try {
              const explainRes = await client.query(`EXPLAIN (FORMAT JSON) ${sql}`);
              plan = explainRes.rows[0]?.['QUERY PLAN'] ?? null;
              if (Array.isArray(plan) && plan[0]?.Plan) {
                estimatedRows = plan[0].Plan['Plan Rows'] ?? null;
              }
            } finally {
              await client.query('ROLLBACK');
            }

            await logQuery(pool, {
              statementClass: classification.statement_class,
              sqlText: sql,
              executionMs: null,
              rowsAffected: null,
              wasDryRun: true,
              wasCommitted: false,
              clientIp,
            });

            return NextResponse.json({
              dry_run: true,
              classification,
              plan,
              estimated_rows: estimatedRows,
            });
          } catch (err: any) {
            try { await client.query('ROLLBACK'); } catch { /* ignore */ }
            return NextResponse.json({ error: err.message ?? 'Dry run failed' }, { status: 500 });
          } finally {
            client.release();
          }
        }

        // Real execution
        const start = Date.now();
        let result: any;
        try {
          result = await pool.query(sql);
        } catch (err: any) {
          await logQuery(getWritePool(), {
            statementClass: classification.statement_class,
            sqlText: sql,
            executionMs: Date.now() - start,
            rowsAffected: 0,
            wasDryRun: false,
            wasCommitted: false,
            clientIp,
          }).catch(() => {});
          return NextResponse.json({ error: err.message ?? 'Execution failed' }, { status: 500 });
        }
        const executionMs = Date.now() - start;

        const rawRows = Array.isArray(result.rows) ? result.rows : [];
        const rows = classification.statement_class === 'select'
          ? rawRows.slice(0, MAX_SELECT_ROWS)
          : rawRows;
        const columns = result.fields ? result.fields.map((f: any) => f.name) : [];

        await logQuery(getWritePool(), {
          statementClass: classification.statement_class,
          sqlText: sql,
          executionMs,
          rowsAffected: result.rowCount ?? 0,
          wasDryRun: false,
          wasCommitted: true,
          clientIp,
        });

        return NextResponse.json({
          rows,
          columns,
          rowCount: result.rowCount ?? rows.length,
          execution_ms: executionMs,
          classification,
        });
      }

      case 'save': {
        const { name, sql, description } = body;
        if (!name || !sql) {
          return NextResponse.json({ error: 'name and sql required' }, { status: 400 });
        }
        const pool = getWritePool();
        try {
          const res = await pool.query(
            `INSERT INTO bop_saved_queries (name, sql_text, description, user_id, user_email)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [name, sql, description ?? null, SYSTEM_USER_ID, SYSTEM_USER_EMAIL],
          );
          return NextResponse.json({ saved: res.rows[0] });
        } catch (err: any) {
          return NextResponse.json({ error: 'Saved queries table not yet created' });
        }
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 });
  }
}

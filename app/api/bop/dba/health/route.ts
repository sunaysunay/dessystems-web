export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getReadPool, getWritePool } from '@/lib/db-console/pools';

/* ------------------------------------------------------------------ */
/*  Finding type returned by the /findings action                     */
/* ------------------------------------------------------------------ */
interface Finding {
  check_id: string;
  category: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  object_name: string;
  detail: string;
  actual_value: string | number | null;
  threshold: string | number | null;
}

/* ================================================================== */
/*  action = overview (default)                                       */
/* ================================================================== */
type HealthStatus = 'in_range' | 'monitor' | 'urgent';

interface HealthMetric {
  key: string;
  label: string;
  value: string;
  raw_value: number;
  status: HealthStatus;
  detail: string;
}

function assessStatus(key: string, val: number): { status: HealthStatus; detail: string } {
  switch (key) {
    case 'cache_hit':
      if (val >= 99) return { status: 'in_range', detail: 'Buffer cache performing optimally' };
      if (val >= 95) return { status: 'monitor', detail: 'Cache hit ratio declining — watch for I/O pressure' };
      return { status: 'urgent', detail: 'Low cache hit ratio — excessive disk reads' };
    case 'conn_pct':
      if (val < 60) return { status: 'in_range', detail: 'Connection pool healthy' };
      if (val < 80) return { status: 'monitor', detail: 'Connection usage rising — consider pooling' };
      return { status: 'urgent', detail: 'Connection saturation risk — action required' };
    case 'xid_age':
      if (val < 100_000_000) return { status: 'in_range', detail: 'Transaction ID age within safe limits' };
      if (val < 150_000_000) return { status: 'monitor', detail: 'XID age approaching threshold — schedule VACUUM FREEZE' };
      return { status: 'urgent', detail: 'XID wraparound risk — VACUUM FREEZE urgently needed' };
    case 'dead_pct':
      if (val < 5) return { status: 'in_range', detail: 'Autovacuum keeping up with dead tuples' };
      if (val < 20) return { status: 'monitor', detail: 'Dead tuple ratio elevated — check autovacuum settings' };
      return { status: 'urgent', detail: 'High dead tuple bloat — manual VACUUM recommended' };
    case 'rls_pct':
      if (val >= 95) return { status: 'in_range', detail: 'Nearly all tables have RLS protection' };
      if (val >= 70) return { status: 'monitor', detail: 'Some tables lack RLS — review exposure' };
      return { status: 'urgent', detail: 'Significant RLS gap — security review needed' };
    default:
      return { status: 'in_range', detail: '' };
  }
}

async function getOverview() {
  const pool = getReadPool();
  const { rows } = await pool.query(`
    SELECT
      pg_size_pretty(pg_database_size(current_database())) AS db_size,
      pg_database_size(current_database())                 AS db_bytes,
      (SELECT count(*) FROM pg_stat_user_tables)           AS total_tables,
      (SELECT count(*) FROM pg_stat_user_indexes)          AS total_indexes,
      (SELECT numbackends FROM pg_stat_database
       WHERE datname = current_database())                 AS connections,
      current_setting('max_connections')::int               AS max_conn,
      (SELECT round(100.0 * blks_hit / nullif(blks_hit + blks_read, 0), 2)
       FROM pg_stat_database
       WHERE datname = current_database())                 AS cache_hit_pct,
      (SELECT stats_reset FROM pg_stat_database
       WHERE datname = current_database())                 AS stats_reset,
      current_setting('server_version')                    AS pg_version
  `);
  const r = rows[0];

  const connPct = Number(r.max_conn) > 0
    ? Math.round(100 * Number(r.connections) / Number(r.max_conn))
    : 0;
  const cacheHit = r.cache_hit_pct != null ? Number(r.cache_hit_pct) : 100;

  // Fetch XID age, worst dead tuple ratio, and RLS coverage for metrics
  const [xidRes, deadRes, rlsRes] = await Promise.all([
    pool.query(`SELECT max(age(relfrozenxid)) AS worst FROM pg_class WHERE relkind IN ('r','p')`),
    pool.query(`SELECT coalesce(max(round(100.0 * n_dead_tup / nullif(n_live_tup + n_dead_tup, 0), 1)), 0) AS worst FROM pg_stat_user_tables WHERE n_dead_tup > 100`),
    pool.query(`SELECT count(*) AS total, count(*) FILTER (WHERE relrowsecurity AND (SELECT count(*) FROM pg_policies p WHERE p.schemaname = n.nspname AND p.tablename = c.relname) > 0) AS covered FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relkind = 'r' AND n.nspname NOT IN (${SYSTEM_SCHEMAS})`),
  ]);

  const xidAge = Number(xidRes.rows[0]?.worst ?? 0);
  const deadPct = Number(deadRes.rows[0]?.worst ?? 0);
  const rlsTotal = Number(rlsRes.rows[0]?.total ?? 0);
  const rlsCovered = Number(rlsRes.rows[0]?.covered ?? 0);
  const rlsPct = rlsTotal > 0 ? Math.round(100 * rlsCovered / rlsTotal) : 100;

  const metrics: HealthMetric[] = [
    { key: 'cache_hit', label: 'Cache Hit Ratio', value: `${cacheHit}%`, raw_value: cacheHit, ...assessStatus('cache_hit', cacheHit) },
    { key: 'conn_pct', label: 'Connection Usage', value: `${connPct}% (${r.connections}/${r.max_conn})`, raw_value: connPct, ...assessStatus('conn_pct', connPct) },
    { key: 'xid_age', label: 'XID Age (worst)', value: xidAge.toLocaleString(), raw_value: xidAge, ...assessStatus('xid_age', xidAge) },
    { key: 'dead_pct', label: 'Dead Tuple Ratio', value: `${deadPct}%`, raw_value: deadPct, ...assessStatus('dead_pct', deadPct) },
    { key: 'rls_pct', label: 'RLS Coverage', value: `${rlsPct}% (${rlsCovered}/${rlsTotal})`, raw_value: rlsPct, ...assessStatus('rls_pct', rlsPct) },
  ];

  return {
    database_size: r.db_size,
    database_bytes: Number(r.db_bytes),
    total_tables: Number(r.total_tables),
    total_indexes: Number(r.total_indexes),
    active_connections: Number(r.connections),
    max_connections: Number(r.max_conn),
    cache_hit_ratio: cacheHit,
    stats_reset: r.stats_reset,
    pg_version: r.pg_version,
    metrics,
  };
}

/* ================================================================== */
/*  action = findings — live health checks                            */
/* ================================================================== */

const SYSTEM_SCHEMAS = `'pg_catalog','information_schema','pg_toast','auth','storage','realtime','vault','extensions','graphql','net','supabase_functions','pgsodium','_realtime','_analytics'`;

async function checkVacuumXidAge(): Promise<Finding[]> {
  const pool = getReadPool();
  const { rows } = await pool.query(`
    SELECT relnamespace::regnamespace || '.' || relname AS obj,
           age(relfrozenxid) AS val
    FROM pg_class
    WHERE relkind IN ('r','p')
    ORDER BY 2 DESC
    LIMIT 5
  `);
  const findings: Finding[] = [];
  for (const r of rows) {
    const val = Number(r.val);
    if (val > 150_000_000) {
      findings.push({
        check_id: 'vacuum.xid_age',
        category: 'Vacuum',
        severity: 'critical',
        object_name: r.obj,
        detail: `Transaction ID age ${val.toLocaleString()} exceeds safe threshold`,
        actual_value: val,
        threshold: 150_000_000,
      });
    }
  }
  return findings;
}

async function checkDeadTupleRatio(): Promise<Finding[]> {
  const pool = getReadPool();
  const { rows } = await pool.query(`
    SELECT schemaname || '.' || relname AS obj,
           n_dead_tup,
           n_live_tup,
           round(100.0 * n_dead_tup / nullif(n_live_tup + n_dead_tup, 0), 1) AS dead_pct,
           pg_total_relation_size(relid) AS size_bytes
    FROM pg_stat_user_tables
    WHERE n_dead_tup > 1000
      AND pg_total_relation_size(relid) > 104857600
    ORDER BY dead_pct DESC
  `);
  const findings: Finding[] = [];
  for (const r of rows) {
    const pct = Number(r.dead_pct);
    if (pct > 20) {
      findings.push({
        check_id: 'vacuum.dead_tuple_ratio',
        category: 'Vacuum',
        severity: 'medium',
        object_name: r.obj,
        detail: `${pct}% dead tuples (${Number(r.n_dead_tup).toLocaleString()} dead of ${(Number(r.n_live_tup) + Number(r.n_dead_tup)).toLocaleString()} total)`,
        actual_value: pct,
        threshold: 20,
      });
    }
  }
  return findings;
}

async function checkIdleInTransaction(): Promise<Finding[]> {
  const pool = getReadPool();
  const { rows } = await pool.query(`
    SELECT pid, usename, state,
           extract(epoch FROM (now() - state_change))::int AS idle_seconds,
           left(regexp_replace(query, '\\s+', ' ', 'g'), 120) AS query
    FROM pg_stat_activity
    WHERE state = 'idle in transaction'
      AND datname = current_database()
      AND pid <> pg_backend_pid()
  `);
  const findings: Finding[] = [];
  for (const r of rows) {
    const secs = Number(r.idle_seconds);
    if (secs > 300) {
      findings.push({
        check_id: 'conn.idle_in_transaction',
        category: 'Connections',
        severity: 'high',
        object_name: `pid ${r.pid} (${r.usename})`,
        detail: `Idle in transaction for ${secs}s — ${r.query}`,
        actual_value: secs,
        threshold: 300,
      });
    }
  }
  return findings;
}

async function checkConnectionUtilization(): Promise<Finding[]> {
  const pool = getReadPool();
  const { rows } = await pool.query(`
    SELECT count(*) AS active,
           current_setting('max_connections')::int AS max_conn
    FROM pg_stat_activity
    WHERE datname = current_database()
  `);
  const findings: Finding[] = [];
  const r = rows[0];
  const ratio = Number(r.active) / Number(r.max_conn);
  if (ratio > 0.8) {
    findings.push({
      check_id: 'conn.utilization',
      category: 'Connections',
      severity: 'high',
      object_name: 'connection pool',
      detail: `${r.active} of ${r.max_conn} connections in use (${(ratio * 100).toFixed(1)}%)`,
      actual_value: Number(r.active),
      threshold: `${(Number(r.max_conn) * 0.8).toFixed(0)} (80% of max)`,
    });
  }
  return findings;
}

async function checkRlsMissing(): Promise<Finding[]> {
  const pool = getReadPool();
  const { rows } = await pool.query(`
    SELECT n.nspname || '.' || c.relname AS obj,
           c.relrowsecurity AS rls_on,
           (SELECT count(*) FROM pg_policies p
            WHERE p.schemaname = n.nspname AND p.tablename = c.relname) AS policies
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r'
      AND n.nspname NOT IN (${SYSTEM_SCHEMAS})
      AND (NOT c.relrowsecurity
           OR (c.relrowsecurity
               AND (SELECT count(*) FROM pg_policies p
                    WHERE p.schemaname = n.nspname AND p.tablename = c.relname) = 0))
  `);
  const findings: Finding[] = [];
  for (const r of rows) {
    findings.push({
      check_id: 'security.rls_missing',
      category: 'Security',
      severity: r.rls_on ? 'high' : 'critical',
      object_name: r.obj,
      detail: r.rls_on
        ? 'RLS enabled but no policies defined'
        : 'Row-Level Security is disabled',
      actual_value: r.rls_on ? 'enabled, 0 policies' : 'disabled',
      threshold: 'RLS enabled with >= 1 policy',
    });
  }
  return findings;
}

async function checkUnusedIndexes(): Promise<Finding[]> {
  const pool = getReadPool();
  const { rows } = await pool.query(`
    SELECT s.schemaname || '.' || s.relname AS table_name,
           s.indexrelname AS idx_name,
           s.idx_scan,
           pg_size_pretty(pg_relation_size(s.indexrelid)) AS size
    FROM pg_stat_user_indexes s
    JOIN pg_index ix ON ix.indexrelid = s.indexrelid
    WHERE NOT ix.indisprimary
      AND s.idx_scan = 0
      AND pg_relation_size(s.indexrelid) > 10485760
    ORDER BY pg_relation_size(s.indexrelid) DESC
    LIMIT 20
  `);
  return rows.map((r) => ({
    check_id: 'index.unused',
    category: 'Indexes',
    severity: 'low' as const,
    object_name: `${r.idx_name} on ${r.table_name}`,
    detail: `Index never scanned, consuming ${r.size}`,
    actual_value: Number(r.idx_scan),
    threshold: '> 0 scans expected',
  }));
}

async function checkNoPrimaryKey(): Promise<Finding[]> {
  const pool = getReadPool();
  const { rows } = await pool.query(`
    SELECT n.nspname || '.' || c.relname AS obj,
           pg_size_pretty(pg_total_relation_size(c.oid)) AS size
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r'
      AND n.nspname NOT IN (${SYSTEM_SCHEMAS})
      AND NOT EXISTS (
        SELECT 1 FROM pg_index i
        WHERE i.indrelid = c.oid AND i.indisprimary
      )
  `);
  return rows.map((r) => ({
    check_id: 'table.no_pk',
    category: 'Schema',
    severity: 'medium' as const,
    object_name: r.obj,
    detail: `Table has no primary key (size: ${r.size})`,
    actual_value: 'no PK',
    threshold: 'primary key required',
  }));
}

async function getFindings(): Promise<Finding[]> {
  const results = await Promise.allSettled([
    checkVacuumXidAge(),
    checkDeadTupleRatio(),
    checkIdleInTransaction(),
    checkConnectionUtilization(),
    checkRlsMissing(),
    checkUnusedIndexes(),
    checkNoPrimaryKey(),
  ]);

  const findings: Finding[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      findings.push(...result.value);
    }
    // Silently skip failed checks — partial results are better than none
  }

  // Sort by severity: critical > high > medium > low > info
  const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
  findings.sort((a, b) => (order[a.severity] ?? 5) - (order[b.severity] ?? 5));

  return findings;
}

/* ================================================================== */
/*  action = tables — top 30 by size                                  */
/* ================================================================== */
async function getTables() {
  const pool = getReadPool();
  const { rows } = await pool.query(`
    SELECT s.schemaname, s.relname,
      pg_size_pretty(pg_total_relation_size(c.oid)) AS total_size,
      pg_total_relation_size(c.oid)                  AS total_bytes,
      pg_size_pretty(pg_relation_size(c.oid))        AS heap_size,
      pg_size_pretty(pg_indexes_size(c.oid))         AS index_size,
      s.n_live_tup   AS live_rows,
      s.n_dead_tup   AS dead_rows,
      round(100.0 * s.n_dead_tup / nullif(s.n_live_tup + s.n_dead_tup, 0), 1) AS dead_pct,
      s.n_tup_ins    AS inserts,
      s.n_tup_upd    AS updates,
      s.n_tup_del    AS deletes,
      s.seq_scan, s.idx_scan,
      s.last_autovacuum, s.last_autoanalyze
    FROM pg_stat_user_tables s
    JOIN pg_class c ON c.oid = s.relid
    ORDER BY pg_total_relation_size(c.oid) DESC
    LIMIT 30
  `);
  return rows;
}

/* ================================================================== */
/*  action = connections                                               */
/* ================================================================== */
async function getConnections() {
  const pool = getReadPool();
  const { rows } = await pool.query(`
    SELECT state, count(*) AS count,
      max(extract(epoch FROM (now() - state_change)))::int AS longest_seconds
    FROM pg_stat_activity
    WHERE datname = current_database()
    GROUP BY state
    ORDER BY count DESC
  `);
  return rows;
}

/* ================================================================== */
/*  action = extensions                                                */
/* ================================================================== */
async function getExtensions() {
  const pool = getReadPool();
  const { rows } = await pool.query(`
    SELECT name, default_version, installed_version, comment
    FROM pg_available_extensions
    WHERE name IN (
      'pg_cron','pg_partman','pg_stat_statements','pgaudit',
      'pg_repack','pgcrypto','hypopg','pg_trgm','postgis'
    )
    ORDER BY (installed_version IS NULL), name
  `);
  return rows;
}

/* ================================================================== */
/*  GET handler                                                        */
/* ================================================================== */
export async function GET(req: NextRequest) {
  const action = req.nextUrl.searchParams.get('action') ?? 'overview';

  try {
    switch (action) {
      case 'overview': {
        const overview = await getOverview();
        return NextResponse.json({ overview });
      }
      case 'findings': {
        const findings = await getFindings();
        return NextResponse.json({ findings, count: findings.length });
      }
      case 'tables': {
        const tables = await getTables();
        return NextResponse.json({ tables });
      }
      case 'connections': {
        const connections = await getConnections();
        return NextResponse.json({ connections });
      }
      case 'extensions': {
        const extensions = await getExtensions();
        return NextResponse.json({ extensions });
      }
      case 'trend': {
        const readPool = getReadPool();
        const { rows } = await readPool.query(`
          SELECT id, captured_at, run_type, total_tables, urgent_count, monitor_count, in_range_count,
                 summary, duration_ms, finding_count
          FROM bop_db_health_log
          ORDER BY captured_at DESC
          LIMIT 30
        `);
        return NextResponse.json({ snapshots: rows });
      }
      case 'run_audit': {
        const writePool = getWritePool();
        const { rows } = await writePool.query(
          `SELECT bop_capture_health_snapshot($1) AS result`,
          ['manual']
        );
        const result = rows[0]?.result;
        return NextResponse.json({ snapshot: result ?? null });
      }
      case 'run_vacuum': {
        const writePool = getWritePool();
        const { rows } = await writePool.query(
          `SELECT bop_trigger_vacuum_now() AS result`
        );
        return NextResponse.json({ result: rows[0]?.result ?? 'Vacuum scheduled' });
      }
      case 'cron_history': {
        const readPool = getReadPool();
        const { rows } = await readPool.query(
          `SELECT * FROM bop_get_cron_history()`
        );
        return NextResponse.json({ jobs: rows });
      }
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 },
        );
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[DBA Health]', action, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

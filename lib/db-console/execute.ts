import { createHash } from 'crypto';
import type { Pool, PoolClient } from 'pg';
import { getPoolForClass, type StatementClass } from './pools';
import { classifySQL, type ClassifyResult } from './classify';

const MAX_ROWS = 1000;
const MAX_PAYLOAD_BYTES = 8 * 1024 * 1024;

export interface ExecuteOptions {
  sql: string;
  dryRun?: boolean;
  userId: string;
  userEmail?: string;
  tenantId?: string;
}

export interface ExecuteResult {
  classification: ClassifyResult;
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  totalRowCount: number;
  truncated: boolean;
  executionMs: number;
  dryRun: boolean;
  committed: boolean;
  pgRole: string;
  sqlHash: string;
}

export async function executeSQL(opts: ExecuteOptions): Promise<ExecuteResult> {
  const { sql, dryRun = true, userId, userEmail, tenantId } = opts;
  const classification = await classifySQL(sql);

  if (classification.blocked) {
    throw new Error(`Blocked: ${classification.blockReason}`);
  }

  const pool = getPoolForClass(classification.statementClass);
  const pgRole = poolRole(pool);
  const sqlHash = createHash('sha256').update(sql).digest('hex').slice(0, 16);

  const isDML = ['insert', 'update', 'delete'].includes(classification.statementClass);
  const shouldWrapTx = isDML && dryRun;

  const client = await pool.connect();
  const start = performance.now();

  try {
    if (shouldWrapTx) {
      await client.query('BEGIN');
    }

    const result = await client.query(sql);
    const executionMs = Math.round(performance.now() - start);

    const rawRows = Array.isArray(result) ? result[result.length - 1]?.rows ?? [] : result.rows ?? [];
    const totalRowCount = rawRows.length;
    const truncated = totalRowCount > MAX_ROWS;
    const rows = truncated ? rawRows.slice(0, MAX_ROWS) : rawRows;

    const columns = Array.isArray(result)
      ? (result[result.length - 1]?.fields ?? []).map((f: any) => f.name)
      : (result.fields ?? []).map((f: any) => f.name);

    const rowCount = Array.isArray(result)
      ? result.reduce((n: number, r: any) => n + (r.rowCount ?? 0), 0)
      : result.rowCount ?? 0;

    let committed = !shouldWrapTx;
    if (shouldWrapTx) {
      await client.query('ROLLBACK');
      committed = false;
    }

    const payload: ExecuteResult = {
      classification,
      columns,
      rows,
      rowCount,
      totalRowCount,
      truncated,
      executionMs,
      dryRun: shouldWrapTx,
      committed,
      pgRole,
      sqlHash,
    };

    const payloadSize = JSON.stringify(payload).length;
    if (payloadSize > MAX_PAYLOAD_BYTES) {
      const safeRows = Math.max(1, Math.floor(MAX_ROWS * (MAX_PAYLOAD_BYTES / payloadSize) * 0.9));
      payload.rows = rows.slice(0, safeRows);
      payload.truncated = true;
    }

    return payload;
  } catch (err: any) {
    if (shouldWrapTx) {
      await client.query('ROLLBACK').catch(() => {});
    }
    throw err;
  } finally {
    client.release();
  }
}

export async function commitSQL(opts: Omit<ExecuteOptions, 'dryRun'>): Promise<ExecuteResult> {
  return executeSQL({ ...opts, dryRun: false });
}

function poolRole(pool: Pool): string {
  return (pool as any).options?.user ?? 'unknown';
}

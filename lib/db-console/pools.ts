import { Pool, type PoolConfig } from 'pg';

const SHARED: Partial<PoolConfig> = {
  max: 3,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  allowExitOnIdle: true,
};

function envOrThrow(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function buildPool(user: string, password: string): Pool {
  return new Pool({
    ...SHARED,
    host: process.env.DBA_PG_HOST ?? '127.0.0.1',
    port: parseInt(process.env.DBA_PG_PORT ?? '5432', 10),
    database: process.env.DBA_PG_DATABASE ?? 'postgres',
    user,
    password,
    ssl: process.env.DBA_PG_SSL === 'false' ? false : { rejectUnauthorized: false },
  });
}

let _readPool: Pool | null = null;
let _writePool: Pool | null = null;
let _ddlPool: Pool | null = null;

export function getReadPool(): Pool {
  if (!_readPool) {
    _readPool = buildPool(
      process.env.DBA_PG_READ_USER ?? 'bop_console_read',
      envOrThrow('DBA_PG_READ_PASSWORD'),
    );
  }
  return _readPool;
}

export function getWritePool(): Pool {
  if (!_writePool) {
    _writePool = buildPool(
      process.env.DBA_PG_WRITE_USER ?? 'bop_console_write',
      envOrThrow('DBA_PG_WRITE_PASSWORD'),
    );
  }
  return _writePool;
}

export function getDdlPool(): Pool {
  if (!_ddlPool) {
    _ddlPool = buildPool(
      process.env.DBA_PG_DDL_USER ?? 'bop_console_ddl',
      envOrThrow('DBA_PG_DDL_PASSWORD'),
    );
  }
  return _ddlPool;
}

export type StatementClass = 'select' | 'insert' | 'update' | 'delete' | 'ddl' | 'other';

export function getPoolForClass(cls: StatementClass): Pool {
  switch (cls) {
    case 'select':
      return getReadPool();
    case 'insert':
    case 'update':
    case 'delete':
      return getWritePool();
    case 'ddl':
      return getDdlPool();
    case 'other':
      return getReadPool();
  }
}

export async function shutdownPools(): Promise<void> {
  await Promise.allSettled([
    _readPool?.end(),
    _writePool?.end(),
    _ddlPool?.end(),
  ]);
  _readPool = _writePool = _ddlPool = null;
}

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getReadPool } from '@/lib/db-console/pools';

export async function GET() {
  try {
    const pool = getReadPool();

    const [overviewRes, schemasRes] = await Promise.all([
      pool.query('SELECT * FROM bop_meta.database_overview()'),
      pool.query('SELECT * FROM bop_meta.list_schemas()'),
    ]);

    const overview = overviewRes.rows[0] ?? null;
    const schemas = schemasRes.rows ?? [];

    return NextResponse.json({ overview, schemas });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? 'Internal server error' },
      { status: 500 },
    );
  }
}

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getReadPool } from '@/lib/db-console/pools';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const action = sp.get('action') ?? 'list';
  const schema = sp.get('schema') ?? 'public';
  const name = sp.get('name');

  const pool = getReadPool();

  try {
    switch (action) {
      case 'list': {
        const { rows } = await pool.query('SELECT * FROM bop_meta.list_functions($1)', [schema]);
        return NextResponse.json({ functions: rows });
      }
      case 'source': {
        if (!name) return NextResponse.json({ error: 'name param required' }, { status: 400 });
        const { rows } = await pool.query('SELECT * FROM bop_meta.get_function_source($1, $2)', [schema, name]);
        return NextResponse.json({ functions: rows });
      }
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 });
  }
}

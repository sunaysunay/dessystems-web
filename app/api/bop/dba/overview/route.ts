export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = getServerClient();

    const [overviewRes, schemasRes] = await Promise.all([
      supabase.rpc('database_overview', undefined, { schema: 'bop_meta' } as any),
      supabase.rpc('list_schemas', undefined, { schema: 'bop_meta' } as any),
    ]);

    const overview = overviewRes.data?.[0] ?? null;
    const schemas = schemasRes.data ?? [];

    return NextResponse.json({ overview, schemas });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? 'Internal server error' },
      { status: 500 },
    );
  }
}

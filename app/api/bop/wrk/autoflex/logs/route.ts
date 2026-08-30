export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { getTenantId } from '@/lib/tenant';

const TENANT_ID = getTenantId('console');

// ---------------------------------------------------------------------------
// GET — query sync log history
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const { searchParams } = new URL(req.url);

  let query = supabase
    .from('wrk_autoflex_sync_logs')
    .select('*', { count: 'exact' })
    .eq('tenant_id', TENANT_ID);

  const type = searchParams.get('type');
  if (type) query = query.eq('sync_type', type);

  query = query.order('created_at', { ascending: false }).limit(50);

  const { data, error, count } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data, total: count });
}

// ---------------------------------------------------------------------------
// POST — insert a sync log entry
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const body = await req.json();

  const { sync_type, direction, records_synced, records_failed, errors, duration_ms } = body;

  if (!sync_type || !direction) {
    return NextResponse.json(
      { error: 'sync_type and direction are required' },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from('wrk_autoflex_sync_logs')
    .insert({
      tenant_id: TENANT_ID,
      sync_type,
      direction,
      records_synced: records_synced ?? 0,
      records_failed: records_failed ?? 0,
      errors: errors ?? null,
      duration_ms: duration_ms ?? 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

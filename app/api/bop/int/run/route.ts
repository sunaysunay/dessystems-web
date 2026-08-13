// POST /api/bop/int/run — synchronous flow execution endpoint.
// Used by IT001 "Test" panel, listing manager, and sell funnel plate lookup.
import { NextRequest, NextResponse } from 'next/server';
import { executeFlow } from '@/lib/integration/engine/executor';
import { callerUid } from '@/lib/api-guard';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { flow_key, payload = {} } = body;
  if (!flow_key) return NextResponse.json({ error: 'flow_key required' }, { status: 400 });

  const uid = await callerUid();
  const run = await executeFlow({
    flowKey:     flow_key,
    payload,
    trigger:     'manual',
    triggeredBy: uid || 'api',
  });

  return NextResponse.json(run, { status: run.status === 'ok' ? 200 : 502 });
}

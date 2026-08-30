export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { getTenantId } from '@/lib/tenant';

const TENANT_ID = getTenantId('console');

const STATUS_STEPS = [
  { key: 'received',            label: 'Ontvangen' },
  { key: 'diagnosis',           label: 'Diagnose' },
  { key: 'in_progress',         label: 'Aan het werk' },
  { key: 'waiting_parts',       label: 'Wacht op onderdelen' },
  { key: 'waiting_approval',    label: 'Wacht op goedkeuring' },
  { key: 'completed',           label: 'Gereed' },
  { key: 'delivered',           label: 'Afgeleverd' },
];

function deriveTimeline(status: string) {
  const statusMap: Record<string, number> = {
    open: 0, received: 0,
    diagnosis: 1, diagnosing: 1,
    in_progress: 2, working: 2,
    waiting_parts: 3, parts_ordered: 3,
    waiting_approval: 4, approval: 4, pending_approval: 4,
    completed: 5, done: 5, ready: 5,
    delivered: 6, closed: 6, picked_up: 6,
  };
  const currentIndex = statusMap[status?.toLowerCase()] ?? 0;
  return STATUS_STEPS.map((step, i) => ({
    ...step,
    status: i < currentIndex ? 'done' : i === currentIndex ? 'current' : 'upcoming',
  }));
}

export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const { searchParams } = new URL(req.url);

  const woNumber = searchParams.get('wo_number');
  const id = searchParams.get('id');

  if (!woNumber && !id) {
    return NextResponse.json({ error: 'wo_number or id parameter required' }, { status: 400 });
  }

  let query = supabase
    .from('wrk_orders')
    .select('id, wo_number, status, type, estimated_completion, created_at')
    .eq('tenant_id', TENANT_ID);

  if (woNumber) {
    query = query.ilike('wo_number', woNumber);
  } else if (id) {
    query = query.eq('id', id);
  }

  const { data, error } = await query.is('deleted_at', null).single();

  if (error || !data) {
    return NextResponse.json({ error: 'Work order not found' }, { status: 404 });
  }

  return NextResponse.json({
    data: {
      wo_number: data.wo_number,
      status: data.status,
      type: data.type,
      estimated_completion: data.estimated_completion,
      created_at: data.created_at,
      status_timeline: deriveTimeline(data.status),
    },
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { fireTaskTriggers } from '@/lib/ops/fire-triggers';
import type { SupabaseClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

type Res = ReturnType<typeof NextResponse.json>;
type Body = Record<string, unknown>;

function err(msg: string, status = 500) {
  return NextResponse.json({ error: msg }, { status });
}

export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenant_id') ?? '';

  let q = supabase
    .from('op_task_triggers')
    .select('*, op_task_templates(id, name, is_chain, category)', { count: 'exact' })
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (tenantId) q = q.eq('tenant_id', tenantId);

  const eventType = searchParams.get('event_type');
  if (eventType) q = q.eq('event_type', eventType);

  const { data, error, count } = await q;
  if (error) return err(error.message);
  return NextResponse.json({ triggers: data ?? [], total: count ?? 0 });
}

async function actionCreate(supabase: SupabaseClient, body: Body): Promise<Res> {
  if (!body.tenant_id) return err('tenant_id required', 400);
  if (!body.event_type) return err('event_type required', 400);
  if (!body.template_id) return err('template_id required', 400);
  const { data, error } = await supabase.from('op_task_triggers').insert({
    tenant_id: body.tenant_id, event_type: body.event_type, template_id: body.template_id,
    condition_jsonb: body.condition_jsonb ?? {}, enabled: body.enabled ?? true,
    cooldown_hours: body.cooldown_hours ?? 0, description: body.description ?? null,
    created_by: body.created_by ?? null,
  }).select().single();
  if (error) return err(error.message);
  return NextResponse.json({ trigger: data });
}

async function actionFire(supabase: SupabaseClient, body: Body): Promise<Res> {
  if (!body.event_type) return err('event_type required', 400);
  if (!body.source_object_type) return err('source_object_type required', 400);
  if (!body.source_object_id) return err('source_object_id required', 400);
  if (!body.tenant_id) return err('tenant_id required', 400);
  const results = await fireTaskTriggers(
    supabase, body.event_type as string, body.source_object_type as string,
    body.source_object_id as string, body.tenant_id as string, (body.actor_id as string) ?? null,
  );
  return NextResponse.json({ fired: results, count: results.length });
}

async function actionToggle(supabase: SupabaseClient, body: Body): Promise<Res> {
  if (!body.id) return err('id required', 400);
  const { data, error } = await supabase.from('op_task_triggers')
    .update({ enabled: body.enabled ?? false }).eq('id', body.id)
    .is('deleted_at', null).select().single();
  if (error) return err(error.message);
  return NextResponse.json({ trigger: data });
}

const ACTIONS: Record<string, (sb: SupabaseClient, b: Body) => Promise<Res>> = {
  create: actionCreate, fire: actionFire, toggle: actionToggle,
};

export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const body = await req.json();
  const handler = ACTIONS[body.action as string];
  if (!handler) return err('Unknown action', 400);
  return handler(supabase, body);
}

export async function DELETE(req: NextRequest) {
  const supabase = getServerClient();
  const { id } = await req.json();
  if (!id) return err('id required', 400);

  const { error } = await supabase
    .from('op_task_triggers')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .is('deleted_at', null);
  if (error) return err(error.message);
  return NextResponse.json({ deleted: true });
}

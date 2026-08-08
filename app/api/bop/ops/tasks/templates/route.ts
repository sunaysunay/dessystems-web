import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import type { SupabaseClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function err(msg: string, status = 500) {
  return NextResponse.json({ error: msg }, { status });
}

export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenant_id') ?? '';

  const id = searchParams.get('id');
  if (id) {
    const { data: template, error } = await supabase
      .from('op_task_templates')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();
    if (error) return err(error.message);

    const { data: steps } = await supabase
      .from('op_task_template_steps')
      .select('*')
      .eq('template_id', id)
      .order('step_order', { ascending: true });

    return NextResponse.json({ template, steps: steps ?? [] });
  }

  let q = supabase
    .from('op_task_templates')
    .select('*', { count: 'exact' })
    .is('deleted_at', null)
    .order('name', { ascending: true });
  if (tenantId) q = q.eq('tenant_id', tenantId);

  const category = searchParams.get('category');
  if (category) q = q.eq('category', category);

  const { data, error, count } = await q;
  if (error) return err(error.message);
  return NextResponse.json({ templates: data ?? [], total: count ?? 0 });
}

type Res = ReturnType<typeof NextResponse.json>;
type Body = Record<string, unknown>;

async function actionCreate(supabase: SupabaseClient, body: Body): Promise<Res> {
  if (!body.tenant_id) return err('tenant_id required', 400);
  if (!body.name) return err('name required', 400);
  const { data, error } = await supabase.from('op_task_templates').insert({
    tenant_id: body.tenant_id, name: body.name, name_i18n: body.name_i18n ?? {},
    description: body.description ?? null, is_chain: body.is_chain ?? false,
    default_priority: body.default_priority ?? 2, category: body.category ?? null,
    ref_object_type: body.ref_object_type ?? null, created_by: body.created_by ?? null,
  }).select().single();
  if (error) return err(error.message);
  return NextResponse.json({ template: data });
}

async function actionAddStep(supabase: SupabaseClient, body: Body): Promise<Res> {
  if (!body.template_id) return err('template_id required', 400);
  if (!body.title) return err('title required', 400);
  const { data, error } = await supabase.from('op_task_template_steps').insert({
    template_id: body.template_id, step_order: body.step_order ?? 1, title: body.title,
    title_i18n: body.title_i18n ?? {}, description: body.description ?? null,
    due_offset_hours: body.due_offset_hours ?? 0, sla_offset_hours: body.sla_offset_hours ?? null,
    default_priority: body.default_priority ?? 2, depends_on_prev: body.depends_on_prev ?? false,
    department_id: body.department_id ?? null,
  }).select().single();
  if (error) return err(error.message);
  return NextResponse.json({ step: data });
}

function offsetIso(hours: number | null): string | null {
  if (!hours) return null;
  return new Date(Date.now() + hours * 3600_000).toISOString();
}

function buildStepParams(step: Record<string, unknown>, body: Body, tmpl: Record<string, unknown> | null) {
  return {
    p_tenant_id: body.tenant_id,
    p_title: step.title,
    p_description: step.description ?? null,
    p_priority: step.default_priority ?? tmpl?.default_priority ?? 2,
    p_assignee_id: body.assignee_id ?? null,
    p_department_id: step.department_id ?? null,
    p_due_at: offsetIso(step.due_offset_hours as number | null),
    p_sla_due_at: offsetIso(step.sla_offset_hours as number | null),
    p_ref_object_type: body.ref_object_type ?? tmpl?.ref_object_type ?? null,
    p_ref_object_id: body.ref_object_id ?? null,
    p_ref_object_label: body.ref_object_label ?? null,
    p_parent_task_id: null,
    p_checklist: [],
    p_actor: body.actor_id ?? null,
  };
}

async function instantiateStep(
  supabase: SupabaseClient,
  step: Record<string, unknown>,
  body: Body,
  tmpl: Record<string, unknown> | null,
  prevId: string | null,
): Promise<string | null> {
  const params = buildStepParams(step, body, tmpl);
  const { data: task, error } = await supabase.rpc('op_task_create', params);
  if (error || !task) return null;
  const taskId = typeof task === 'object' ? (task as Record<string, string>).id : String(task);
  if (step.depends_on_prev && prevId) {
    await supabase.from('op_task_dependencies').insert({ task_id: taskId, depends_on_task_id: prevId });
  }
  return taskId;
}

async function actionInstantiate(supabase: SupabaseClient, body: Body): Promise<Res> {
  if (!body.template_id) return err('template_id required', 400);
  if (!body.tenant_id) return err('tenant_id required', 400);

  const { data: steps, error: se } = await supabase
    .from('op_task_template_steps').select('*')
    .eq('template_id', body.template_id).order('step_order', { ascending: true });
  if (se) return err(se.message);
  if (!steps?.length) return err('Template has no steps', 400);

  const { data: tmpl } = await supabase.from('op_task_templates')
    .select('default_priority, ref_object_type').eq('id', body.template_id).single();

  const created: string[] = [];
  let prevId: string | null = null;
  for (const step of steps) {
    const taskId = await instantiateStep(supabase, step, body, tmpl, prevId);
    if (taskId) { created.push(taskId); prevId = taskId; }
  }
  return NextResponse.json({ tasks_created: created, count: created.length });
}

const ACTIONS: Record<string, (sb: SupabaseClient, b: Body) => Promise<Res>> = {
  create: actionCreate, add_step: actionAddStep, instantiate: actionInstantiate,
};

export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const body = await req.json();
  const handler = ACTIONS[body.action as string];
  if (!handler) return err('Unknown action', 400);
  return handler(supabase, body);
}

export async function PATCH(req: NextRequest) {
  const supabase = getServerClient();
  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return err('id required', 400);

  const allowed = ['name', 'name_i18n', 'description', 'is_chain', 'default_priority', 'category', 'ref_object_type'];
  const filtered: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in updates) filtered[key] = updates[key];
  }
  if (Object.keys(filtered).length === 0) return err('no valid fields', 400);

  const { data, error } = await supabase
    .from('op_task_templates')
    .update(filtered)
    .eq('id', id)
    .is('deleted_at', null)
    .select()
    .single();
  if (error) return err(error.message);
  return NextResponse.json({ template: data });
}

export async function DELETE(req: NextRequest) {
  const supabase = getServerClient();
  const { id } = await req.json();
  if (!id) return err('id required', 400);

  const { error } = await supabase
    .from('op_task_templates')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .is('deleted_at', null);
  if (error) return err(error.message);
  return NextResponse.json({ deleted: true });
}

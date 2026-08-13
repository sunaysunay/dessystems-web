import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const { searchParams } = new URL(req.url);

  const view = searchParams.get('view') ?? '';

  const tenantId = searchParams.get('tenant_id') ?? '';

  if (view === 'cockpit-summary') {
    let sq = supabase
      .from('op_tasks')
      .select('status, sla_due_at, escalation_level, due_at, updated_at')
      .is('deleted_at', null);
    if (tenantId) sq = sq.eq('tenant_id', tenantId);
    const { data, error } = await sq;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 86400000);

    const rows = data ?? [];
    const summary = {
      open: rows.filter(r => r.status === 'open').length,
      due_today: rows.filter(r => r.due_at && new Date(r.due_at) >= todayStart && new Date(r.due_at) < todayEnd && !['done','cancelled'].includes(r.status)).length,
      overdue: rows.filter(r => r.due_at && new Date(r.due_at) < todayStart && !['done','cancelled'].includes(r.status)).length,
      waiting_input: rows.filter(r => r.status === 'waiting_input').length,
      waiting_approval: rows.filter(r => r.status === 'waiting_approval').length,
      blocked: rows.filter(r => r.status === 'blocked').length,
      completed_today: rows.filter(r => r.status === 'done' && r.updated_at && new Date(r.updated_at) >= todayStart && new Date(r.updated_at) < todayEnd).length,
      sla_at_risk: rows.filter(r => r.sla_due_at && new Date(r.sla_due_at) < new Date(now.getTime() + 7200000) && !['done','cancelled'].includes(r.status)).length,
    };
    return NextResponse.json({ summary });
  }

  const singleId = searchParams.get('id') ?? '';

  if (singleId) {
    const { data, error } = await supabase
      .from('op_tasks')
      .select('*')
      .eq('id', singleId)
      .is('deleted_at', null)
      .single();
    if (error || !data) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    return NextResponse.json({ task: data });
  }

  const search   = searchParams.get('search') ?? '';
  const status   = searchParams.get('status') ?? '';
  const priority = searchParams.get('priority') ?? '';
  const assignee = searchParams.get('assignee_id') ?? '';
  const dept     = searchParams.get('department_id') ?? '';
  const refType  = searchParams.get('ref_object_type') ?? '';
  const refId    = searchParams.get('ref_object_id') ?? '';
  const page     = parseInt(searchParams.get('page') ?? '1', 10);
  const pageSize = Math.min(parseInt(searchParams.get('page_size') ?? '50', 10), 200);
  const sortBy   = searchParams.get('sort') ?? 'created_at';
  const sortAsc  = searchParams.get('sort_dir') === 'asc';

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let q = supabase
    .from('op_tasks')
    .select('*', { count: 'exact' })
    .is('deleted_at', null)
    .order(sortBy, { ascending: sortAsc })
    .range(from, to);

  if (tenantId) q = q.eq('tenant_id', tenantId);
  if (status)   q = q.eq('status', status);
  if (priority) q = q.eq('priority', parseInt(priority, 10));
  if (assignee) q = q.eq('assignee_id', assignee);
  if (dept)     q = q.eq('department_id', dept);
  if (refType)  q = q.eq('ref_object_type', refType);
  if (refId)    q = q.eq('ref_object_id', refId);
  if (search)   q = q.or(`title.ilike.%${search}%,task_number.ilike.%${search}%`);

  const { data, error, count } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tasks: data ?? [], total: count ?? 0, page, page_size: pageSize });
}

export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const body = await req.json();
  const { action } = body;

  if (action === 'create') {
    if (!body.tenant_id) return NextResponse.json({ error: 'tenant_id required' }, { status: 400 });
    const { data, error } = await supabase.rpc('op_task_create', {
      p_tenant_id: body.tenant_id,
      p_title: body.title,
      p_description: body.description ?? null,
      p_priority: body.priority ?? 2,
      p_assignee_id: body.assignee_id ?? null,
      p_department_id: body.department_id ?? null,
      p_due_at: body.due_at ?? null,
      p_sla_due_at: body.sla_due_at ?? null,
      p_ref_object_type: body.ref_object_type ?? null,
      p_ref_object_id: body.ref_object_id ?? null,
      p_ref_object_label: body.ref_object_label ?? null,
      p_parent_task_id: body.parent_task_id ?? null,
      p_checklist: body.checklist ?? [],
      p_actor: body.actor_id ?? null,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ task: data });
  }

  if (action === 'transition') {
    const { data, error } = await supabase.rpc('op_task_transition', {
      p_task_id: body.task_id,
      p_to_status: body.status,
      p_actor: body.actor_id ?? null,
      p_reason: body.reason ?? null,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ result: data });
  }

  if (action === 'assign') {
    const { data, error } = await supabase.rpc('op_task_assign', {
      p_task_id: body.task_id,
      p_assignee_id: body.assignee_id,
      p_actor: body.actor_id ?? null,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ result: data });
  }

  if (action === 'bulk_update') {
    const { data, error } = await supabase.rpc('op_task_bulk_update', {
      p_task_ids: body.task_ids,
      p_updates: body.updates,
      p_actor: body.actor_id ?? null,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ result: data });
  }

  if (action === 'timer_start') {
    const { data, error } = await supabase.rpc('op_task_timer_start', {
      p_task_id: body.task_id,
      p_actor: body.actor_id ?? null,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ result: data });
  }

  if (action === 'timer_stop') {
    const { data, error } = await supabase.rpc('op_task_timer_stop', {
      p_task_id: body.task_id,
      p_actor: body.actor_id ?? null,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ result: data });
  }

  if (action === 'snooze') {
    const { data, error } = await supabase.rpc('op_task_snooze', {
      p_task_id: body.task_id,
      p_until: body.until,
      p_actor: body.actor_id ?? null,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ result: data });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

export async function PATCH(req: NextRequest) {
  const supabase = getServerClient();
  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const allowedFields = [
    'title', 'description', 'priority', 'assignee_id', 'department_id',
    'due_at', 'sla_due_at', 'ref_object_type', 'ref_object_id', 'ref_object_label',
    'parent_task_id', 'checklist', 'is_recurring', 'rrule', 'goal_kr_id',
    'snoozed_until', 'estimated_hours',
  ];

  const filtered: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in updates) filtered[key] = updates[key];
  }

  if (Object.keys(filtered).length === 0) {
    return NextResponse.json({ error: 'no valid fields to update' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('op_tasks')
    .update(filtered)
    .eq('id', id)
    .is('deleted_at', null)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ task: data });
}

export async function DELETE(req: NextRequest) {
  const supabase = getServerClient();
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { error } = await supabase
    .from('op_tasks')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .is('deleted_at', null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: true });
}

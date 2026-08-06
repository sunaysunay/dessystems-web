import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const { searchParams } = new URL(req.url);

  const tenantId = searchParams.get('tenant_id') ?? '';
  const view = searchParams.get('view') ?? '';

  if (view === 'dashboard-summary') {
    let sq = supabase
      .from('op_goals')
      .select('status, health, progress_pct, entity, level')
      .is('deleted_at', null);
    if (tenantId) sq = sq.eq('tenant_id', tenantId);
    const { data, error } = await sq;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rows = data ?? [];
    const topLevel = rows.filter(r => r.level === 0);
    const summary = {
      total: topLevel.length,
      active: topLevel.filter(r => r.status === 'active').length,
      achieved: topLevel.filter(r => r.status === 'achieved').length,
      on_track: topLevel.filter(r => r.health === 'on_track' && r.status === 'active').length,
      at_risk: topLevel.filter(r => r.health === 'at_risk' && r.status === 'active').length,
      off_track: topLevel.filter(r => r.health === 'off_track' && r.status === 'active').length,
      avg_progress: topLevel.length > 0
        ? Math.round(topLevel.reduce((s, r) => s + Number(r.progress_pct ?? 0), 0) / topLevel.length)
        : 0,
    };
    return NextResponse.json({ summary });
  }

  if (view === 'tree') {
    let gq = supabase
      .from('op_goals')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: true });
    if (tenantId) gq = gq.eq('tenant_id', tenantId);

    const statusFilter = searchParams.get('status');
    const entityFilter = searchParams.get('entity');
    if (statusFilter) gq = gq.eq('status', statusFilter);
    if (entityFilter) gq = gq.eq('entity', entityFilter);

    const { data: goals, error: ge } = await gq;
    if (ge) return NextResponse.json({ error: ge.message }, { status: 500 });

    const goalIds = (goals ?? []).map(g => g.id);

    let krs: Record<string, unknown>[] = [];
    if (goalIds.length > 0) {
      const { data: krData, error: ke } = await supabase
        .from('op_goal_key_results')
        .select('*')
        .in('goal_id', goalIds)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });
      if (ke) return NextResponse.json({ error: ke.message }, { status: 500 });
      krs = krData ?? [];
    }

    const krsByGoal: Record<string, typeof krs> = {};
    for (const kr of krs) {
      const gid = kr.goal_id as string;
      if (!krsByGoal[gid]) krsByGoal[gid] = [];
      krsByGoal[gid].push(kr);
    }

    interface GoalNode {
      [key: string]: unknown;
      children: GoalNode[];
      key_results: Record<string, unknown>[];
    }

    const byParent: Record<string, GoalNode[]> = {};
    const roots: GoalNode[] = [];

    for (const g of (goals ?? [])) {
      const node: GoalNode = { ...g, children: [], key_results: krsByGoal[g.id] ?? [] };
      const pid = g.parent_goal_id as string | null;
      if (pid) {
        if (!byParent[pid]) byParent[pid] = [];
        byParent[pid].push(node);
      } else {
        roots.push(node);
      }
    }

    function attach(nodes: GoalNode[]) {
      for (const n of nodes) {
        n.children = byParent[n.id as string] ?? [];
        attach(n.children);
      }
    }
    attach(roots);

    return NextResponse.json({ goals: roots, total: goals?.length ?? 0 });
  }

  const id = searchParams.get('id');
  if (id) {
    const { data: goal, error } = await supabase
      .from('op_goals')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { data: krs } = await supabase
      .from('op_goal_key_results')
      .select('*')
      .eq('goal_id', id)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    const { data: checkins } = await supabase
      .from('op_goal_checkins')
      .select('*')
      .eq('goal_id', id)
      .order('created_at', { ascending: false })
      .limit(20);

    const { data: children } = await supabase
      .from('op_goals')
      .select('id, goal_number, title, status, health, progress_pct, level')
      .eq('parent_goal_id', id)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    return NextResponse.json({
      goal,
      key_results: krs ?? [],
      checkins: checkins ?? [],
      children: children ?? [],
    });
  }

  let q = supabase
    .from('op_goals')
    .select('*', { count: 'exact' })
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (tenantId) q = q.eq('tenant_id', tenantId);

  const search = searchParams.get('search');
  if (search) q = q.or(`title.ilike.%${search}%,goal_number.ilike.%${search}%`);

  const { data, error, count } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ goals: data ?? [], total: count ?? 0 });
}

export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const body = await req.json();
  const { action } = body;

  if (action === 'create') {
    if (!body.tenant_id) return NextResponse.json({ error: 'tenant_id required' }, { status: 400 });
    if (!body.title) return NextResponse.json({ error: 'title required' }, { status: 400 });

    const insert: Record<string, unknown> = {
      tenant_id: body.tenant_id,
      title: body.title,
      description: body.description ?? null,
      vision_text: body.vision_text ?? null,
      entity: body.entity ?? null,
      period_type: body.period_type ?? 'quarterly',
      period_start: body.period_start ?? null,
      period_end: body.period_end ?? null,
      owner_id: body.owner_id ?? null,
      budget: body.budget ?? null,
      parent_goal_id: body.parent_goal_id ?? null,
      level: body.level ?? 0,
    };

    const { data, error } = await supabase
      .from('op_goals')
      .insert(insert)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ goal: data });
  }

  if (action === 'create_kr') {
    if (!body.goal_id) return NextResponse.json({ error: 'goal_id required' }, { status: 400 });
    if (!body.title) return NextResponse.json({ error: 'title required' }, { status: 400 });

    const insert: Record<string, unknown> = {
      tenant_id: body.tenant_id,
      goal_id: body.goal_id,
      title: body.title,
      description: body.description ?? null,
      metric_type: body.metric_type ?? 'manual',
      direction: body.direction ?? 'increase',
      baseline: body.baseline ?? 0,
      target: body.target,
      current_value: body.current_value ?? 0,
      unit_label: body.unit_label ?? '%',
      weight: body.weight ?? 1,
    };

    const { data, error } = await supabase
      .from('op_goal_key_results')
      .insert(insert)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ key_result: data });
  }

  if (action === 'update_kr_value') {
    if (!body.kr_id) return NextResponse.json({ error: 'kr_id required' }, { status: 400 });

    const { data: kr, error: fe } = await supabase
      .from('op_goal_key_results')
      .select('baseline, target, direction')
      .eq('id', body.kr_id)
      .single();
    if (fe) return NextResponse.json({ error: fe.message }, { status: 500 });

    const val = Number(body.current_value);
    const base = Number(kr.baseline);
    const tgt = Number(kr.target);
    const range = tgt - base;
    let pct = range !== 0 ? ((val - base) / range) * 100 : 0;
    if (kr.direction === 'decrease') pct = range !== 0 ? ((base - val) / (base - tgt)) * 100 : 0;
    pct = Math.max(0, Math.min(100, pct));

    const { data, error } = await supabase
      .from('op_goal_key_results')
      .update({ current_value: val, progress_pct: Math.round(pct * 100) / 100 })
      .eq('id', body.kr_id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ key_result: data });
  }

  if (action === 'checkin') {
    if (!body.goal_id) return NextResponse.json({ error: 'goal_id required' }, { status: 400 });

    const { data, error } = await supabase
      .from('op_goal_checkins')
      .insert({
        goal_id: body.goal_id,
        author_id: body.author_id ?? null,
        confidence: body.confidence ?? 3,
        note: body.note ?? null,
        blockers: body.blockers ?? null,
      })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ checkin: data });
  }

  if (action === 'close_out') {
    if (!body.goal_id) return NextResponse.json({ error: 'goal_id required' }, { status: 400 });
    const finalStatus = body.achieved ? 'achieved' : 'semi_achieved';
    const { data, error } = await supabase
      .from('op_goals')
      .update({ status: finalStatus })
      .eq('id', body.goal_id)
      .is('deleted_at', null)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ goal: data });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

export async function PATCH(req: NextRequest) {
  const supabase = getServerClient();
  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const allowedFields = [
    'title', 'description', 'vision_text', 'entity', 'period_type',
    'period_start', 'period_end', 'status', 'health', 'health_override',
    'owner_id', 'budget', 'parent_goal_id', 'level', 'progress_pct',
  ];

  const filtered: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in updates) filtered[key] = updates[key];
  }

  if (Object.keys(filtered).length === 0) {
    return NextResponse.json({ error: 'no valid fields to update' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('op_goals')
    .update(filtered)
    .eq('id', id)
    .is('deleted_at', null)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ goal: data });
}

export async function DELETE(req: NextRequest) {
  const supabase = getServerClient();
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { error } = await supabase
    .from('op_goals')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .is('deleted_at', null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: true });
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { unstable_noStore as noStore } from 'next/cache';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  noStore();
  const supabase = getServerClient();
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get('scope') ?? 'programs';

  if (scope === 'programs') {
    const { data, error } = await supabase
      .from('sy_program_progress')
      .select('*')
      .order('code');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    // Enrich with scope from sy_programs
    const ids = (data ?? []).map((p: Record<string, unknown>) => p.program_id);
    if (ids.length) {
      const { data: raw } = await supabase.from('sy_programs').select('id, scope').in('id', ids);
      const scopeMap = Object.fromEntries((raw ?? []).map((r: Record<string, unknown>) => [r.id, r.scope]));
      for (const p of (data ?? [])) (p as Record<string, unknown>).scope = scopeMap[(p as Record<string, unknown>).program_id as string] ?? null;
    }
    return NextResponse.json({ programs: data ?? [] });
  }

  if (scope === 'phases') {
    const programId = searchParams.get('program_id');
    if (!programId) return NextResponse.json({ error: 'program_id required' }, { status: 400 });
    const { data, error } = await supabase
      .from('sy_phase_progress')
      .select('*')
      .eq('program_id', programId)
      .order('seq');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ phases: data ?? [] });
  }

  if (scope === 'tasks') {
    const phaseId = searchParams.get('phase_id');
    const taskId = searchParams.get('task_id');
    if (!phaseId && !taskId) return NextResponse.json({ error: 'phase_id or task_id required' }, { status: 400 });
    let query = supabase.from('sy_task_progress').select('*');
    if (taskId) query = query.eq('task_id', taskId);
    else query = query.eq('phase_id', phaseId!);
    const { data, error } = await query.order('task_id');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    // Enrich with discrepancy_note + tested from sy_tasks
    const ids = (data ?? []).map((t: Record<string, unknown>) => t.task_id);
    if (ids.length) {
      const { data: raw } = await supabase.from('sy_tasks').select('id, discrepancy_note, tested, tested_at, tested_by').in('id', ids);
      const map = Object.fromEntries((raw ?? []).map((r: Record<string, unknown>) => [r.id, r]));
      for (const t of (data ?? [])) {
        const r = map[(t as Record<string, unknown>).task_id as string];
        (t as Record<string, unknown>).discrepancy_note = r?.discrepancy_note ?? null;
        (t as Record<string, unknown>).tested = r?.tested ?? false;
        (t as Record<string, unknown>).tested_at = r?.tested_at ?? null;
        (t as Record<string, unknown>).tested_by = r?.tested_by ?? null;
      }
    }
    return NextResponse.json({ tasks: data ?? [] });
  }

  if (scope === 'deliverables') {
    const taskId = searchParams.get('task_id');
    if (!taskId) return NextResponse.json({ error: 'task_id required' }, { status: 400 });
    const { data, error } = await supabase
      .from('sy_deliverables')
      .select('*')
      .eq('task_id', taskId)
      .order('sort_order');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ deliverables: data ?? [] });
  }

  if (scope === 'events') {
    const taskId = searchParams.get('task_id');
    if (!taskId) return NextResponse.json({ error: 'task_id required' }, { status: 400 });
    const { data, error } = await supabase
      .from('sy_task_events')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ events: data ?? [] });
  }

  if (scope === 'templates') {
    const { data, error } = await supabase
      .from('sy_templates')
      .select('*, sy_template_items(*)')
      .order('code');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ templates: data ?? [] });
  }

  return NextResponse.json({ error: 'Invalid scope' }, { status: 400 });
}

export async function POST(req: NextRequest) {
  noStore();
  const supabase = getServerClient();
  const body = await req.json();
  const { action } = body;

  if (action === 'upsert_program') {
    const { id, code, title, owner, status, spec_doc_path, total_fte_days, target_date } = body;
    const row: Record<string, unknown> = { code, title, owner, status, spec_doc_path, total_fte_days, target_date };
    if (id) row.id = id;
    const { data, error } = await supabase
      .from('sy_programs')
      .upsert(row, { onConflict: 'code' })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ program: data });
  }

  if (action === 'upsert_phase') {
    const { id, program_id, seq, code, title, fte_days, gate_criteria, status, go_signal } = body;
    const row: Record<string, unknown> = { program_id, seq, code, title, fte_days, gate_criteria, status, go_signal };
    if (id) row.id = id;
    const { data, error } = await supabase
      .from('sy_phases')
      .upsert(row, { onConflict: 'id' })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ phase: data });
  }

  if (action === 'upsert_task') {
    const { id, phase_id, seq, code, title, task_type, blocked_reason, estimate_h, ref_spec_section, impl_notes } = body;
    const row: Record<string, unknown> = { phase_id, seq, code, title, task_type, blocked_reason, estimate_h, ref_spec_section, impl_notes };
    if (id) row.id = id;
    const { data, error } = await supabase
      .from('sy_tasks')
      .upsert(row, { onConflict: 'id' })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ task: data });
  }

  if (action === 'upsert_deliverable') {
    const { id, task_id, kind, ref, verify_mode, sort_order } = body;
    const row: Record<string, unknown> = { task_id, kind, ref, verify_mode, sort_order };
    if (id) row.id = id;
    const { data, error } = await supabase
      .from('sy_deliverables')
      .upsert(row, { onConflict: 'id' })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ deliverable: data });
  }

  if (action === 'add_event') {
    const { task_id, actor_type, actor, event, payload, commit_sha } = body;
    const { data, error } = await supabase
      .from('sy_task_events')
      .insert({ task_id, actor_type: actor_type ?? 'human', actor, event, payload, commit_sha })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ event: data });
  }

  if (action === 'update_program_status') {
    const { program_id, status, status_note, actor } = body;
    if (!program_id || !status) return NextResponse.json({ error: 'program_id and status required' }, { status: 400 });

    // Check impl plan gate: cannot move to 'active' without uploaded docs
    if (status === 'active') {
      const prefix = `${program_id}/`;
      const { data: files } = await supabase.storage.from('impl-docs').list(prefix);
      const realFiles = (files ?? []).filter(f => f.name !== '.emptyFolderPlaceholder');
      const hasAiSpec = realFiles.some(f => f.name.startsWith('ai-spec_'));
      const hasImplPlan = realFiles.some(f => f.name.startsWith('impl-plan_'));
      if (!hasImplPlan) {
        return NextResponse.json({ error: 'Cannot activate program without an Implementation Plan document. Upload one in the Documents section first.' }, { status: 400 });
      }
      if (!hasAiSpec) {
        return NextResponse.json({ error: 'Cannot activate program without an AI Spec (.md) document. Upload one in the Documents section first.' }, { status: 400 });
      }
    }

    const { error } = await supabase.from('sy_programs').update({ status, status_note: status_note || null }).eq('id', program_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Log event — find any task in this program to attach the event
    const { data: ph } = await supabase.from('sy_phases').select('phase_id').eq('program_id', program_id).limit(1);
    if (ph?.length) {
      const { data: tk } = await supabase.from('sy_tasks').select('task_id').eq('phase_id', ph[0].phase_id).limit(1);
      if (tk?.length) {
        await supabase.from('sy_task_events').insert({
          task_id: tk[0].task_id,
          actor_type: 'human',
          actor: actor ?? 'user',
          event: `Program status → ${status}${status_note ? ': ' + status_note : ''}`,
        });
      }
    }

    return NextResponse.json({ ok: true });
  }

  if (action === 'update_phase_status') {
    const { phase_id, status, status_note, actor } = body;
    if (!phase_id || !status) return NextResponse.json({ error: 'phase_id and status required' }, { status: 400 });

    const { error } = await supabase.from('sy_phases').update({ status, status_note: status_note || null }).eq('id', phase_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Log event on first task in phase
    const { data: tk } = await supabase.from('sy_tasks').select('task_id').eq('phase_id', phase_id).limit(1);
    if (tk?.length) {
      await supabase.from('sy_task_events').insert({
        task_id: tk[0].task_id,
        actor_type: 'human',
        actor: actor ?? 'user',
        event: `Phase status → ${status}${status_note ? ': ' + status_note : ''}`,
      });
    }

    return NextResponse.json({ ok: true });
  }

  if (action === 'check_impl_plan') {
    const { program_id } = body;
    if (!program_id) return NextResponse.json({ error: 'program_id required' }, { status: 400 });
    const prefix = `${program_id}/`;
    const { data: files } = await supabase.storage.from('impl-docs').list(prefix);
    const realFiles = (files ?? []).filter(f => f.name !== '.emptyFolderPlaceholder');
    const hasAiSpec = realFiles.some(f => f.name.startsWith('ai-spec_'));
    const hasImplPlan = realFiles.some(f => f.name.startsWith('impl-plan_'));
    return NextResponse.json({ hasAiSpec, hasImplPlan, canProceed: hasAiSpec && hasImplPlan });
  }

  if (action === 'delete_deliverable') {
    const { id } = body;
    const { error } = await supabase.from('sy_deliverables').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === 'delete_task') {
    const { id } = body;
    const { error } = await supabase.from('sy_tasks').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === 'search_op_tasks') {
    const { search } = body;
    let q = supabase.from('op_tasks').select('id, task_number, title, status, priority, created_at').is('deleted_at', null).order('created_at', { ascending: false }).limit(20);
    if (search?.trim()) q = q.or(`title.ilike.%${search.trim()}%,task_number.ilike.%${search.trim()}%`);
    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ tasks: data ?? [] });
  }

  if (action === 'link_op_task') {
    const { program_id, op_task_id } = body;
    if (!program_id) return NextResponse.json({ error: 'program_id required' }, { status: 400 });
    const { error } = await supabase.from('sy_programs').update({ op_task_id: op_task_id || null }).eq('id', program_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === 'fetch_op_task') {
    const { task_id } = body;
    if (!task_id) return NextResponse.json({ error: 'task_id required' }, { status: 400 });
    const { data, error } = await supabase.from('op_tasks').select('id, task_number, title, status, priority').eq('id', task_id).single();
    if (error) return NextResponse.json({ error: error.message, op_task: null }, { status: 200 });
    return NextResponse.json({ op_task: data });
  }

  if (action === 'fetch_program_op_task') {
    const { program_id } = body;
    if (!program_id) return NextResponse.json({ error: 'program_id required' }, { status: 400 });
    const { data: prog } = await supabase.from('sy_programs').select('op_task_id').eq('id', program_id).single();
    if (!prog?.op_task_id) return NextResponse.json({ op_task: null });
    const { data, error } = await supabase.from('op_tasks').select('id, task_number, title, status, priority').eq('id', prog.op_task_id).single();
    if (error) return NextResponse.json({ op_task: null });
    return NextResponse.json({ op_task: data });
  }

  if (action === 'search_op_goals') {
    const { search } = body;
    let q = supabase.from('op_goals').select('id, goal_number, title, status, health, progress_pct').is('deleted_at', null).order('created_at', { ascending: false }).limit(20);
    if (search?.trim()) q = q.or(`title.ilike.%${search.trim()}%,goal_number.ilike.%${search.trim()}%`);
    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ goals: data ?? [] });
  }

  if (action === 'link_op_goal') {
    const { program_id, op_goal_id } = body;
    if (!program_id) return NextResponse.json({ error: 'program_id required' }, { status: 400 });
    const { error } = await supabase.from('sy_programs').update({ op_goal_id: op_goal_id || null }).eq('id', program_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === 'fetch_program_op_goal') {
    const { program_id } = body;
    if (!program_id) return NextResponse.json({ error: 'program_id required' }, { status: 400 });
    const { data: prog } = await supabase.from('sy_programs').select('op_goal_id').eq('id', program_id).single();
    if (!prog?.op_goal_id) return NextResponse.json({ op_goal: null });
    const { data, error } = await supabase.from('op_goals').select('id, goal_number, title, status, health, progress_pct').eq('id', prog.op_goal_id).single();
    if (error) return NextResponse.json({ op_goal: null });
    return NextResponse.json({ op_goal: data });
  }

  if (action === 'verify_deliverable') {
    const { id, is_verified } = body;
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const { error } = await supabase.from('sy_deliverables').update({
      is_verified: is_verified !== false,
      verified_at: is_verified !== false ? new Date().toISOString() : null,
      verify_error: null,
    }).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === 'bulk_verify_deliverables') {
    const { ids } = body;
    if (!ids?.length) return NextResponse.json({ error: 'ids required' }, { status: 400 });
    const { error } = await supabase.from('sy_deliverables').update({
      is_verified: true,
      verified_at: new Date().toISOString(),
      verify_error: null,
    }).in('id', ids);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, count: ids.length });
  }

  if (action === 'delete_program') {
    const { program_id } = body;
    if (!program_id) return NextResponse.json({ error: 'program_id required' }, { status: 400 });
    // Delete storage docs
    const prefix = `${program_id}/`;
    const { data: files } = await supabase.storage.from('impl-docs').list(prefix);
    if (files?.length) {
      const paths = files.map(f => `${prefix}${f.name}`);
      await supabase.storage.from('impl-docs').remove(paths);
    }
    // Cascade: deliverables → tasks → phases → program
    const { data: phs } = await supabase.from('sy_phases').select('phase_id').eq('program_id', program_id);
    for (const ph of (phs ?? [])) {
      const { data: tks } = await supabase.from('sy_tasks').select('task_id').eq('phase_id', ph.phase_id);
      for (const tk of (tks ?? [])) {
        await supabase.from('sy_deliverables').delete().eq('task_id', tk.task_id);
        await supabase.from('sy_task_events').delete().eq('task_id', tk.task_id);
      }
      await supabase.from('sy_tasks').delete().eq('phase_id', ph.phase_id);
    }
    await supabase.from('sy_phases').delete().eq('program_id', program_id);
    const { error } = await supabase.from('sy_programs').delete().eq('id', program_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === 'update_scope') {
    const { program_id, scope } = body;
    if (!program_id) return NextResponse.json({ error: 'program_id required' }, { status: 400 });
    const { error } = await supabase.from('sy_programs').update({ scope: scope || null }).eq('id', program_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === 'update_tested') {
    const { task_id, tested, actor } = body;
    if (!task_id) return NextResponse.json({ error: 'task_id required' }, { status: 400 });
    const { error } = await supabase.from('sy_tasks').update({
      tested: !!tested,
      tested_at: tested ? new Date().toISOString() : null,
      tested_by: tested ? (actor || 'user') : null,
    }).eq('id', task_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await supabase.from('sy_task_events').insert({
      task_id, actor_type: 'human', actor: actor || 'user',
      event: tested ? 'Task marked as tested' : 'Task test status cleared',
    });
    return NextResponse.json({ ok: true });
  }

  if (action === 'update_discrepancy_note') {
    const { task_id, discrepancy_note } = body;
    if (!task_id) return NextResponse.json({ error: 'task_id required' }, { status: 400 });
    const { error } = await supabase.from('sy_tasks').update({ discrepancy_note: discrepancy_note || null }).eq('id', task_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

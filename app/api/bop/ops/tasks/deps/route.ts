import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const taskId = new URL(req.url).searchParams.get('task_id');
  if (!taskId) return NextResponse.json({ error: 'task_id required' }, { status: 400 });

  let q = supabase
    .from('op_task_dependencies')
    .select('id, task_id, depends_on_id, op_tasks!op_task_dependencies_depends_on_id_fkey(id, task_number, title, status)');
  if (taskId !== '__all') q = q.eq('task_id', taskId);
  const { data, error } = await q;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const deps = (data ?? []).map((d: any) => ({
    id: d.id,
    task_id: d.task_id,
    depends_on_id: d.depends_on_id,
    task_number: d.op_tasks?.task_number,
    title: d.op_tasks?.title,
    status: d.op_tasks?.status,
  }));

  return NextResponse.json({ deps });
}

export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const { task_id, depends_on_id } = await req.json();
  if (!task_id || !depends_on_id) return NextResponse.json({ error: 'task_id and depends_on_id required' }, { status: 400 });

  const { data, error } = await supabase
    .from('op_task_dependencies')
    .insert({ task_id, depends_on_id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ dep: data });
}

export async function DELETE(req: NextRequest) {
  const supabase = getServerClient();
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { error } = await supabase
    .from('op_task_dependencies')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: true });
}

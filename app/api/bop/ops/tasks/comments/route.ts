import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const taskId = new URL(req.url).searchParams.get('task_id');
  if (!taskId) return NextResponse.json({ error: 'task_id required' }, { status: 400 });

  const { data, error } = await supabase
    .from('op_task_comments')
    .select('*')
    .eq('task_id', taskId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ comments: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const { task_id, body, parent_comment_id, author_id } = await req.json();
  if (!task_id || !body) return NextResponse.json({ error: 'task_id and body required' }, { status: 400 });

  const { data, error } = await supabase
    .from('op_task_comments')
    .insert({
      task_id,
      body,
      parent_comment_id: parent_comment_id ?? null,
      author_id: author_id ?? '00000000-0000-0000-0000-000000000000',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase
    .from('op_task_events')
    .insert({ task_id, event_type: 'commented', actor_id: author_id ?? null, payload: { comment_id: data.id } });

  return NextResponse.json({ comment: data });
}

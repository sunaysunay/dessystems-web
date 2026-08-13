import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const taskId = new URL(req.url).searchParams.get('task_id');
  if (!taskId) return NextResponse.json({ error: 'task_id required' }, { status: 400 });

  const { data, error } = await supabase
    .from('op_task_events')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ events: data ?? [] });
}

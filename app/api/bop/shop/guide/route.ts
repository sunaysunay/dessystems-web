import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const module = sp.get('module');
  const submodule = sp.get('submodule');
  const userId = sp.get('user_id');

  if (!module || !submodule) {
    return NextResponse.json({ error: 'module and submodule are required' }, { status: 400 });
  }

  const supabase = getServerClient();

  const { data: steps, error } = await supabase
    .from('guide_steps')
    .select('*')
    .eq('module_code', module)
    .eq('submodule', submodule)
    .eq('is_active', true)
    .order('step_order', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let completed = false;
  if (userId) {
    const { data: progress } = await supabase
      .from('user_guide_progress')
      .select('id')
      .eq('user_id', userId)
      .eq('module_code', module)
      .eq('submodule', submodule)
      .maybeSingle();
    completed = !!progress;
  }

  return NextResponse.json({ steps: steps ?? [], completed });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { module_code, submodule, user_id } = body;

  if (!module_code || !submodule || !user_id) {
    return NextResponse.json({ error: 'module_code, submodule, and user_id are required' }, { status: 400 });
  }

  const supabase = getServerClient();

  const { error } = await supabase
    .from('user_guide_progress')
    .upsert(
      { user_id, module_code, submodule, completed_at: new Date().toISOString() },
      { onConflict: 'user_id,module_code,submodule' }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

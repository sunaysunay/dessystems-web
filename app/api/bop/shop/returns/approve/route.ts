import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { return_id, action, approved_by, notes } = body;

  if (!return_id || !action) {
    return NextResponse.json({ error: 'return_id and action are required' }, { status: 400 });
  }

  if (action !== 'approve' && action !== 'reject') {
    return NextResponse.json({ error: 'action must be approve or reject' }, { status: 400 });
  }

  const supabase = getServerClient();

  const { data: existing, error: fetchErr } = await supabase
    .from('shop_returns')
    .select('id, status')
    .eq('id', return_id)
    .single();

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: 'return not found' }, { status: 404 });

  if (existing.status !== 'requested') {
    return NextResponse.json(
      { error: `cannot ${action} a return with status '${existing.status}'` },
      { status: 409 },
    );
  }

  const now = new Date().toISOString();

  const update: Record<string, unknown> = action === 'approve'
    ? { status: 'approved', approved_at: now, approved_by: approved_by ?? null }
    : { status: 'rejected', notes: notes ?? null };

  const { data, error } = await supabase
    .from('shop_returns')
    .update(update)
    .eq('id', return_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ return: data });
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { id, action, approved_by } = body;

  if (!id || !action) {
    return NextResponse.json({ error: 'id and action are required' }, { status: 400 });
  }
  if (!approved_by) {
    return NextResponse.json({ error: 'approved_by is required' }, { status: 400 });
  }
  if (action !== 'approve' && action !== 'reject') {
    return NextResponse.json({ error: 'action must be approve or reject' }, { status: 400 });
  }

  const supabase = getServerClient();

  const { data: existing, error: fetchErr } = await supabase
    .from('shop_refund_requests')
    .select('status')
    .eq('id', id)
    .single();

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: 'refund request not found' }, { status: 404 });
  if (existing.status !== 'pending') {
    return NextResponse.json({ error: `cannot ${action} a request with status '${existing.status}'` }, { status: 409 });
  }

  const { data, error } = await supabase
    .from('shop_refund_requests')
    .update({
      status: action === 'approve' ? 'approved' : 'rejected',
      approved_by,
      approved_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ refund_request: data });
}

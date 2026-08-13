import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export async function GET() {
  const supabase = getServerClient();
  const { data, error } = await supabase
    .from('bop_change_log')
    .select('*')
    .eq('action', 'ACCESS_REQUEST')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch role names for display
  const roleIds = [...new Set((data ?? []).map((r: any) => r.object_id).filter(Boolean))];
  let roleIndex: Record<string,string> = {};
  if (roleIds.length > 0) {
    const { data: roles } = await supabase.from('bop_roles').select('id, name').in('id', roleIds);
    for (const r of (roles ?? [])) roleIndex[r.id] = r.name;
  }

  const requests = (data ?? []).map((r: any) => ({
    id: r.id,
    requestor_email: r.actor_email,
    role_id: r.object_id,
    role_name: roleIndex[r.object_id] ?? r.object_id,
    justification: r.new_value?.justification ?? '',
    priority: r.new_value?.priority ?? 'medium',
    valid_to: r.new_value?.valid_to ?? null,
    status: r.new_value?.status ?? 'pending',
    reviewed_by: r.new_value?.reviewed_by ?? null,
    review_note: r.new_value?.review_note ?? null,
    created_at: r.created_at,
  }));

  return NextResponse.json({ requests });
}

export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const body = await req.json();
  const { role_id, justification, priority, valid_to } = body;
  if (!role_id || !justification) return NextResponse.json({ error: 'role_id and justification required' }, { status: 400 });

  const { error } = await supabase.from('bop_change_log').insert({
    action: 'ACCESS_REQUEST',
    object_type: 'role',
    object_id: role_id,
    new_value: { justification, priority: priority ?? 'medium', valid_to: valid_to || null, status: 'pending' },
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

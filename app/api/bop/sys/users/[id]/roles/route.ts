import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { isSuperAdmin } from '@/lib/api-guard';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await isSuperAdmin())) return NextResponse.json({ error: 'forbidden — super_admin only' }, { status: 403 });
  const supabase = getServerClient();
  const { role_id, valid_from, valid_to, granted_by } = await req.json();
  const { error } = await supabase.from('bop_user_roles').upsert({
    user_id: id, role_id,
    valid_from: valid_from || null,
    valid_to: valid_to || null,
    granted_by: granted_by || 'admin',
    granted_at: new Date().toISOString(),
  }, { onConflict: 'user_id,role_id' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await isSuperAdmin())) return NextResponse.json({ error: 'forbidden — super_admin only' }, { status: 403 });
  const supabase = getServerClient();
  const role_id = req.nextUrl.searchParams.get('role_id');
  if (!role_id) return NextResponse.json({ error: 'role_id required' }, { status: 400 });
  const { error } = await supabase.from('bop_user_roles')
    .delete().eq('user_id', id).eq('role_id', role_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

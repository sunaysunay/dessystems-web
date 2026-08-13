import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { isSuperAdmin } from '@/lib/api-guard';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await isSuperAdmin())) return NextResponse.json({ error: 'forbidden — super_admin only' }, { status: 403 });
  const supabase = getServerClient();
  const body = await req.json();

  if (body.action === 'suspend') {
    const { error } = await supabase.auth.admin.updateUserById(id, { ban_duration: '876600h' });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'activate') {
    const { error } = await supabase.auth.admin.updateUserById(id, { ban_duration: 'none' });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // Update profile (email + metadata)
  const update: any = {};
  if (body.email) update.email = body.email;
  if (body.full_name !== undefined) update.user_metadata = { full_name: body.full_name };

  const { error } = await supabase.auth.admin.updateUserById(id, update);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

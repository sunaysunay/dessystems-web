import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { isSuperAdmin } from '@/lib/api-guard';

export async function POST(req: NextRequest) {
  if (!(await isSuperAdmin())) return NextResponse.json({ error: 'forbidden — super_admin only' }, { status: 403 });
  const supabase = getServerClient();
  const { email, full_name } = await req.json();
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { full_name: full_name || '' },
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ user: data.user });
}

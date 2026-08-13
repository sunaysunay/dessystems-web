import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getServerClient();
  const { data, error } = await supabase
    .from('bop_role_screens')
    .select('role_id, access_level, bop_roles(id, name)')
    .eq('screen_id', id);
  if (error) return NextResponse.json({ roles: [] });
  const roles = (data ?? []).map((r: any) => ({
    role_id: r.role_id,
    role_name: r.bop_roles?.name ?? '—',
    access_level: r.access_level,
  }));
  return NextResponse.json({ roles });
}

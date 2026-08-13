// app/api/bop/mkt/studio/sessions/[id]/cancel/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { callerUid } from '@/lib/api-guard';

export const dynamic = 'force-dynamic';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const uid = await callerUid();
  if (!uid) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const sb = getServerClient();

  // Verify ownership
  const { data: session } = await sb
    .from('bop_studio_sessions')
    .select('id, status, created_by')
    .eq('id', id)
    .single();

  if (!session) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (session.created_by !== uid) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (['completed', 'cancelled'].includes(session.status))
    return NextResponse.json({ error: 'already terminal' }, { status: 409 });

  // Reset processing images → pending, cancel session
  await sb
    .from('bop_studio_images')
    .update({ status: 'pending' })
    .eq('session_id', id)
    .eq('status', 'processing');

  await sb
    .from('bop_studio_sessions')
    .update({ status: 'draft' })
    .eq('id', id);

  return NextResponse.json({ ok: true });
}

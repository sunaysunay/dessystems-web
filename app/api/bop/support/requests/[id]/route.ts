import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { callerUid, isSuperAdmin } from '@/lib/api-guard';

export const dynamic = 'force-dynamic';

// GET /api/bop/support/requests/[id] — request + thread
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const uid = await callerUid();
  if (!uid) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const supabase = getServerClient();
  const { data: request, error } = await supabase
    .from('sup_requests')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!request) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (!(await isSuperAdmin()) && request.created_by !== uid) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { data: messages } = await supabase
    .from('sup_messages')
    .select('*')
    .eq('request_id', id)
    .order('created_at', { ascending: true });

  return NextResponse.json({ request, messages: messages ?? [] });
}

// PATCH /api/bop/support/requests/[id] — admin: status, priority, resolution
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await isSuperAdmin())) return NextResponse.json({ error: 'admin only' }, { status: 403 });

  const supabase = getServerClient();
  const body = await req.json();
  const allowed: Record<string, any> = {};
  if (body.status     !== undefined) allowed.status     = body.status;
  if (body.priority   !== undefined) allowed.priority   = body.priority;
  if (body.resolution !== undefined) allowed.resolution = body.resolution;

  const { data, error } = await supabase
    .from('sup_requests')
    .update(allowed)
    .eq('id', id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ request: data });
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { callerUid, isSuperAdmin } from '@/lib/api-guard';
import { notifyAdminReplied, notifyUserReplied } from '@/lib/support/notify';

export const dynamic = 'force-dynamic';

// POST /api/bop/support/requests/[id]/messages
// Appends a reply; trigger flips request status automatically.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const uid = await callerUid();
  if (!uid) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const supabase = getServerClient();
  const { data: request, error: rErr } = await supabase
    .from('sup_requests')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (rErr || !request) return NextResponse.json({ error: 'request not found' }, { status: 404 });
  if (request.status === 'closed') return NextResponse.json({ error: 'request is closed' }, { status: 409 });

  const isAdmin = await isSuperAdmin();
  if (!isAdmin && request.created_by !== uid) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { body: bodyText } = await req.json();
  if (!bodyText?.trim()) return NextResponse.json({ error: 'body required' }, { status: 400 });

  const senderRole = isAdmin ? 'admin' : 'user';
  const { data: message, error: mErr } = await supabase
    .from('sup_messages')
    .insert({ request_id: Number(id), sender_id: uid, sender_role: senderRole, body: bodyText.trim() })
    .select()
    .single();
  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });

  // Side effects — non-blocking
  try {
    const { data: userProfile } = await supabase.auth.admin.getUserById(request.created_by);
    const userEmail = userProfile?.user?.email ?? request.created_by;

    if (isAdmin) {
      await notifyAdminReplied(request, userEmail, bodyText.trim());
    } else {
      await notifyUserReplied(request, userEmail, bodyText.trim());
    }
  } catch { /* non-blocking */ }

  return NextResponse.json({ message }, { status: 201 });
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { callerUid, isSuperAdmin } from '@/lib/api-guard';
import { getSignedUrl } from '@/lib/support/storage';

export const dynamic = 'force-dynamic';

// GET /api/bop/support/cases/[number]/attachments/[id]
// Returns a signed download URL for the attachment
export async function GET(_req: NextRequest, { params }: { params: Promise<{ number: string; id: string }> }) {
  const uid = await callerUid();
  if (!uid) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (!(await isSuperAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { number, id } = await params;
  const supabase = getServerClient();

  // Resolve case
  const { data: caseData } = await supabase
    .from('sup_requests')
    .select('id')
    .or(`request_no.eq.${number},case_number.eq.${number}`)
    .single();
  if (!caseData) return NextResponse.json({ error: 'Case not found' }, { status: 404 });

  // Get attachment and verify it belongs to this case via message
  const { data: attachment } = await supabase
    .from('sup_attachments')
    .select('id, storage_path, file_name, mime_type, message_id')
    .eq('id', Number(id))
    .single();

  if (!attachment) return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });

  // Verify message belongs to this case
  const { data: msg } = await supabase
    .from('sup_messages')
    .select('id')
    .eq('id', attachment.message_id)
    .eq('request_id', caseData.id)
    .single();
  if (!msg) return NextResponse.json({ error: 'Attachment does not belong to this case' }, { status: 403 });

  const { url, error } = await getSignedUrl(supabase, attachment.storage_path);
  if (error || !url) return NextResponse.json({ error: error || 'Failed to generate URL' }, { status: 500 });

  return NextResponse.json({
    url,
    file_name: attachment.file_name,
    mime_type: attachment.mime_type,
  });
}

// DELETE /api/bop/support/cases/[number]/attachments/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ number: string; id: string }> }) {
  const uid = await callerUid();
  if (!uid) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (!(await isSuperAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { number, id } = await params;
  const supabase = getServerClient();

  const { data: caseData } = await supabase
    .from('sup_requests')
    .select('id')
    .or(`request_no.eq.${number},case_number.eq.${number}`)
    .single();
  if (!caseData) return NextResponse.json({ error: 'Case not found' }, { status: 404 });

  const { data: attachment } = await supabase
    .from('sup_attachments')
    .select('id, storage_path, message_id')
    .eq('id', Number(id))
    .single();
  if (!attachment) return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });

  const { data: msg } = await supabase
    .from('sup_messages')
    .select('id')
    .eq('id', attachment.message_id)
    .eq('request_id', caseData.id)
    .single();
  if (!msg) return NextResponse.json({ error: 'Attachment does not belong to this case' }, { status: 403 });

  // Delete from storage
  await supabase.storage.from('sup-attachments').remove([attachment.storage_path]);

  // Delete metadata row
  await supabase.from('sup_attachments').delete().eq('id', attachment.id);

  return NextResponse.json({ deleted: true });
}

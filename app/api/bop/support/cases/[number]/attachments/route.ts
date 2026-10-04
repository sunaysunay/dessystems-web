import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { callerUid, isSuperAdmin } from '@/lib/api-guard';
import {
  MAX_FILE_SIZE,
  MAX_FILES_PER_MESSAGE,
  isAllowedMimeType,
  buildStoragePath,
  uploadAttachment,
  ensureSupBucket,
} from '@/lib/support/storage';

export const dynamic = 'force-dynamic';

// POST /api/bop/support/cases/[number]/attachments
// Upload a file attachment to a message in this case.
// Accepts multipart/form-data with fields: message_id, file
export async function POST(req: NextRequest, { params }: { params: Promise<{ number: string }> }) {
  const uid = await callerUid();
  if (!uid) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (!(await isSuperAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { number } = await params;
  const supabase = getServerClient();

  // Resolve case
  const { data: caseData } = await supabase
    .from('sup_requests')
    .select('id, tenant_id')
    .or(`request_no.eq.${number},case_number.eq.${number}`)
    .single();
  if (!caseData) return NextResponse.json({ error: 'Case not found' }, { status: 404 });

  // Parse multipart
  const formData = await req.formData();
  const messageIdStr = formData.get('message_id');
  const file = formData.get('file');

  if (!messageIdStr || !file || !(file instanceof File)) {
    return NextResponse.json({ error: 'message_id and file are required' }, { status: 400 });
  }

  const messageId = Number(messageIdStr);

  // Verify message belongs to this case
  const { data: msg } = await supabase
    .from('sup_messages')
    .select('id')
    .eq('id', messageId)
    .eq('request_id', caseData.id)
    .single();
  if (!msg) return NextResponse.json({ error: 'Message not found in this case' }, { status: 404 });

  // Validate file
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: `File too large. Max ${MAX_FILE_SIZE / 1024 / 1024} MB` }, { status: 400 });
  }
  if (!isAllowedMimeType(file.type)) {
    return NextResponse.json({ error: `File type '${file.type}' not allowed. Allowed: png, jpg, webp, gif, pdf` }, { status: 400 });
  }

  // Check existing attachment count for this message
  const { count } = await supabase
    .from('sup_attachments')
    .select('id', { count: 'exact', head: true })
    .eq('message_id', messageId);
  if ((count ?? 0) >= MAX_FILES_PER_MESSAGE) {
    return NextResponse.json({ error: `Max ${MAX_FILES_PER_MESSAGE} attachments per message` }, { status: 400 });
  }

  // Upload to storage
  await ensureSupBucket(supabase);
  const storagePath = buildStoragePath(caseData.tenant_id, caseData.id, messageId, file.name);
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadErr } = await uploadAttachment(supabase, storagePath, buffer, file.type);
  if (uploadErr) {
    return NextResponse.json({ error: `Upload failed: ${uploadErr}` }, { status: 500 });
  }

  // Insert metadata row
  const { data: attachment, error: dbErr } = await supabase
    .from('sup_attachments')
    .insert({
      message_id: messageId,
      tenant_id: caseData.tenant_id,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      storage_path: storagePath,
    })
    .select()
    .single();

  if (dbErr) {
    return NextResponse.json({ error: dbErr.message }, { status: 500 });
  }

  return NextResponse.json({ attachment }, { status: 201 });
}

// GET /api/bop/support/cases/[number]/attachments
// List all attachments for this case, grouped by message_id
export async function GET(_req: NextRequest, { params }: { params: Promise<{ number: string }> }) {
  const uid = await callerUid();
  if (!uid) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (!(await isSuperAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { number } = await params;
  const supabase = getServerClient();

  const { data: caseData } = await supabase
    .from('sup_requests')
    .select('id, tenant_id')
    .or(`request_no.eq.${number},case_number.eq.${number}`)
    .single();
  if (!caseData) return NextResponse.json({ error: 'Case not found' }, { status: 404 });

  // Get all message IDs for this case
  const { data: messages } = await supabase
    .from('sup_messages')
    .select('id')
    .eq('request_id', caseData.id);
  const messageIds = (messages ?? []).map(m => m.id);

  if (messageIds.length === 0) {
    return NextResponse.json({ attachments: [] });
  }

  const { data: attachments } = await supabase
    .from('sup_attachments')
    .select('id, message_id, file_name, file_size, mime_type, created_at')
    .in('message_id', messageIds)
    .order('created_at', { ascending: true });

  return NextResponse.json({ attachments: attachments ?? [] });
}

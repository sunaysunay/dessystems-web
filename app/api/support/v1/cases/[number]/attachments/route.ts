import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiKey, requireScope } from '@/lib/support/api-auth';
import { getServerClient } from '@/lib/supabase-server';
import {
  MAX_FILE_SIZE,
  MAX_FILES_PER_MESSAGE,
  isAllowedMimeType,
  buildStoragePath,
  uploadAttachment,
  ensureSupBucket,
} from '@/lib/support/storage';

export const dynamic = 'force-dynamic';

// POST /api/support/v1/cases/[number]/attachments
// Upload a file attachment to a message. External API.
// multipart/form-data: message_id (int), file (binary)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ number: string }> }
) {
  try {
    const auth = await authenticateApiKey(req.headers.get('authorization'));
    requireScope(auth.scopes, 'cases.write');

    const { number: caseNumber } = await params;
    const supabase = getServerClient();

    // Resolve case owned by this tenant
    const { data: caseData } = await supabase
      .from('sup_requests')
      .select('id, tenant_id')
      .eq('case_number', caseNumber)
      .eq('tenant_id', auth.tenant_id)
      .single();
    if (!caseData) return NextResponse.json({ error: 'Case not found' }, { status: 404 });

    const formData = await req.formData();
    const messageIdStr = formData.get('message_id');
    const file = formData.get('file');

    if (!messageIdStr || !file || !(file instanceof File)) {
      return NextResponse.json({ error: 'message_id and file are required (multipart/form-data)' }, { status: 400 });
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

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: `File exceeds ${MAX_FILE_SIZE / 1024 / 1024} MB limit` }, { status: 400 });
    }
    if (!isAllowedMimeType(file.type)) {
      return NextResponse.json({
        error: `File type '${file.type}' not allowed. Accepted: image/png, image/jpeg, image/webp, image/gif, application/pdf`,
      }, { status: 400 });
    }

    const { count } = await supabase
      .from('sup_attachments')
      .select('id', { count: 'exact', head: true })
      .eq('message_id', messageId);
    if ((count ?? 0) >= MAX_FILES_PER_MESSAGE) {
      return NextResponse.json({ error: `Max ${MAX_FILES_PER_MESSAGE} attachments per message` }, { status: 400 });
    }

    await ensureSupBucket(supabase);
    const storagePath = buildStoragePath(caseData.tenant_id, caseData.id, messageId, file.name);
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadErr } = await uploadAttachment(supabase, storagePath, buffer, file.type);
    if (uploadErr) {
      return NextResponse.json({ error: `Upload failed: ${uploadErr}` }, { status: 500 });
    }

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
      .select('id, file_name, file_size, mime_type, created_at')
      .single();

    if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

    return NextResponse.json({ attachment }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

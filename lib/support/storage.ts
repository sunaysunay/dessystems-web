import { getServerClient } from '@/lib/supabase-server';
import crypto from 'crypto';

export const SUP_BUCKET = 'sup-attachments';
export const MAX_FILE_SIZE = 7 * 1024 * 1024; // 7 MB
export const MAX_FILES_PER_MESSAGE = 5;

export const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'application/pdf',
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export function isAllowedMimeType(mime: string): mime is AllowedMimeType {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(mime);
}

export function sanitizeFileName(raw: string): string {
  return raw.replace(/[/\\]/g, '_').replace(/[^\w.\- ()]/g, '_').slice(0, 120) || 'file';
}

export function buildStoragePath(tenantId: number, caseId: number, messageId: number, fileName: string): string {
  const uid = crypto.randomUUID().slice(0, 8);
  const clean = sanitizeFileName(fileName);
  return `${tenantId}/${caseId}/${messageId}/${uid}_${clean}`;
}

type Supabase = ReturnType<typeof getServerClient>;

export async function ensureSupBucket(supabase: Supabase): Promise<void> {
  try {
    await supabase.storage.createBucket(SUP_BUCKET, {
      public: false,
      fileSizeLimit: MAX_FILE_SIZE,
    });
  } catch { /* exists */ }
}

export async function uploadAttachment(
  supabase: Supabase,
  storagePath: string,
  file: Buffer,
  contentType: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.storage
    .from(SUP_BUCKET)
    .upload(storagePath, file, { contentType, upsert: false });
  return { error: error?.message ?? null };
}

export async function getSignedUrl(
  supabase: Supabase,
  storagePath: string,
  expiresIn = 3600
): Promise<{ url: string | null; error: string | null }> {
  const { data, error } = await supabase.storage
    .from(SUP_BUCKET)
    .createSignedUrl(storagePath, expiresIn);
  return { url: data?.signedUrl ?? null, error: error?.message ?? null };
}

export async function deleteAttachment(
  supabase: Supabase,
  storagePath: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.storage
    .from(SUP_BUCKET)
    .remove([storagePath]);
  return { error: error?.message ?? null };
}

export interface AttachmentRow {
  id: number;
  message_id: number;
  tenant_id: number;
  file_name: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
  created_at: string;
}

import { getServerClient } from '@/lib/supabase-server';

// Offer attachments live in the private `portal-docs` bucket under offers/<offer_id>/.
// Storage is the source of truth — no extra table. 20 MB total per offer.

export const PORTAL_BUCKET = 'portal-docs';
export const MAX_OFFER_ATTACHMENT_BYTES = 20 * 1024 * 1024;

type Supabase = ReturnType<typeof getServerClient>;

export async function ensurePortalBucket(supabase: Supabase): Promise<void> {
  // Idempotent: creating an existing bucket errors, which we ignore.
  try { await supabase.storage.createBucket(PORTAL_BUCKET, { public: false }); } catch { /* exists */ }
}

export type OfferFile = { name: string; size: number; created_at: string | null; mime_type: string | null };

export async function listOfferFiles(supabase: Supabase, offerId: string): Promise<{ files: OfferFile[]; error: string | null }> {
  const { data, error } = await supabase.storage.from(PORTAL_BUCKET).list(`offers/${offerId}`, { limit: 100 });
  if (error) return { files: [], error: error.message };
  const files = (data ?? [])
    .filter(f => f.name && !f.name.startsWith('.'))
    .map(f => ({
      name: f.name,
      size: (f.metadata as any)?.size ?? 0,
      created_at: f.created_at ?? null,
      mime_type: (f.metadata as any)?.mimetype ?? null,
    }));
  return { files, error: null };
}

export function sanitizeFileName(raw: string): string {
  return raw.replace(/[/\\]/g, '_').replace(/[^\w.\- ()]/g, '_').slice(0, 120) || 'file';
}

import { getServerClient } from '@/lib/supabase-server';
import { generateHmacToken, verifyHmacToken, TOKEN_TTL } from './document-tokens';

export type DocumentType = 'order' | 'quotation' | 'invoice' | 'handover' | 'lead';
export type AccessMode = 'uuid_only' | 'otp' | 'hmac_token' | 'signed';

export const DOCUMENT_ACCESS_MODE: Record<DocumentType, AccessMode> = {
  order: 'otp',
  quotation: 'uuid_only',
  invoice: 'otp',
  handover: 'hmac_token',
  lead: 'uuid_only',
};

export async function createPublicLink(options: {
  tenantId: number;
  documentType: DocumentType;
  documentId: string;
  ttlMs?: number;
}): Promise<{ accessId: string; token?: string }> {
  const supabase = getServerClient();
  const mode = DOCUMENT_ACCESS_MODE[options.documentType];
  const expiresAt = new Date(
    Date.now() + (options.ttlMs || TOKEN_TTL.HMAC_MEDIUM),
  ).toISOString();

  const { data, error } = await supabase
    .from('bop_document_access')
    .upsert(
      {
        tenant_id: options.tenantId,
        document_type: options.documentType,
        document_id: options.documentId,
        access_mode: mode,
        expires_at: expiresAt,
      },
      { onConflict: 'tenant_id,document_type,document_id' },
    )
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create public link: ${error.message}`);
  }

  const accessId = data.id;
  let token: string | undefined;

  if (mode === 'hmac_token' || mode === 'signed') {
    token = generateHmacToken(
      `${options.documentType}:${options.documentId}`,
      options.ttlMs || TOKEN_TTL.HMAC_MEDIUM,
    );
  }

  return { accessId, token };
}

export async function verifyAccess(options: {
  documentType: DocumentType;
  documentId: string;
  token?: string;
}): Promise<{ valid: boolean; expired: boolean; accessId?: string }> {
  const supabase = getServerClient();
  const mode = DOCUMENT_ACCESS_MODE[options.documentType];

  const { data, error } = await supabase
    .from('bop_document_access')
    .select('id, expires_at')
    .eq('document_type', options.documentType)
    .eq('document_id', options.documentId)
    .single();

  if (error || !data) {
    return { valid: false, expired: false };
  }

  const expired = new Date(data.expires_at) < new Date();

  if (expired) {
    return { valid: false, expired: true, accessId: data.id };
  }

  if (mode === 'uuid_only') {
    return { valid: true, expired: false, accessId: data.id };
  }

  if ((mode === 'hmac_token' || mode === 'signed') && options.token) {
    const result = verifyHmacToken(
      options.token,
      `${options.documentType}:${options.documentId}`,
    );
    return { ...result, accessId: result.valid ? data.id : undefined };
  }

  if (mode === 'otp') {
    return { valid: true, expired: false, accessId: data.id };
  }

  return { valid: false, expired: false };
}

export async function trackView(accessId: string): Promise<void> {
  const supabase = getServerClient();
  const now = new Date().toISOString();

  await supabase.rpc('track_document_view', {
    p_access_id: accessId,
    p_now: now,
  });
}

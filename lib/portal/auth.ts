import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

const SECRET =
  process.env.DOCUMENT_TOKEN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const PORTAL_COOKIE = 'des_portal';
export const SESSION_DAYS = 30;

// Codes are read aloud over the phone — no O/0, I/1
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateAccessCode(length = 8): string {
  return Array.from({ length }, () => CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)]).join('');
}

export function normalizeCode(raw: string): string {
  return String(raw || '').replace(/[\s-]/g, '').toUpperCase();
}

export function hashCode(code: string, salt: string): string {
  return crypto.createHash('sha256').update(`${code}|${salt}`).digest('hex');
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

function hmac(payload: string): string {
  return crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
}

export function makeSessionToken(clientId: string, days = SESSION_DAYS): string {
  const exp = Date.now() + days * 864e5;
  return `${clientId}.${exp}.${hmac(`portal:${clientId}:${exp}`)}`;
}

export function verifySessionToken(token: string | undefined): string | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [clientId, exp, sig] = parts;
  if (!/^\d+$/.test(exp) || Number(exp) < Date.now()) return null;
  const expected = hmac(`portal:${clientId}:${exp}`);
  if (sig.length !== expected.length) return null;
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  return clientId;
}

export type PortalClient = {
  id: string;
  slug: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  locale: string;
  status: string;
  expires_at: string | null;
};

/** Resolve the portal session from the request cookie to an active client row. */
export async function getPortalClient(req: NextRequest): Promise<PortalClient | null> {
  const clientId = verifySessionToken(req.cookies.get(PORTAL_COOKIE)?.value);
  if (!clientId) return null;

  const supabase = getServerClient();
  const { data } = await supabase
    .from('portal_clients')
    .select('id, slug, name, contact_name, email, locale, status, expires_at')
    .eq('id', clientId)
    .single();

  if (!data || data.status !== 'active') return null;
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null;
  return data as PortalClient;
}

export function requestMeta(req: NextRequest): { ip: string; user_agent: string } {
  return {
    ip:
      req.headers.get('cf-connecting-ip') ||
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      'unknown',
    user_agent: (req.headers.get('user-agent') || '').slice(0, 180),
  };
}

export async function logPortalEvent(options: {
  clientId?: string | null;
  type: string;
  refId?: string | null;
  detail?: string | null;
  ip?: string;
  userAgent?: string;
}): Promise<void> {
  const supabase = getServerClient();
  await supabase.from('portal_events').insert({
    client_id: options.clientId ?? null,
    type: options.type,
    ref_id: options.refId ?? null,
    detail: options.detail ?? null,
    ip: options.ip ?? null,
    user_agent: options.userAgent ?? null,
  });
}

import crypto from 'crypto';

const TOKEN_SECRET =
  process.env.DOCUMENT_TOKEN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export function generateHmacToken(payload: string, ttlMs: number): string {
  const expiry = Date.now() + ttlMs;
  const hmac = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(`${payload}:${expiry}`)
    .digest('hex');
  return `${expiry}:${hmac}`;
}

export function verifyHmacToken(
  token: string,
  payload: string,
): { valid: boolean; expired: boolean } {
  const separatorIndex = token.indexOf(':');
  if (separatorIndex === -1) {
    return { valid: false, expired: false };
  }

  const expiry = Number(token.slice(0, separatorIndex));
  const hmac = token.slice(separatorIndex + 1);

  if (isNaN(expiry)) {
    return { valid: false, expired: false };
  }

  const expired = Date.now() > expiry;

  const expected = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(`${payload}:${expiry}`)
    .digest('hex');

  const valid = crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expected));

  return { valid: valid && !expired, expired };
}

export function generateOtp(
  context: string,
  ttlMs?: number,
): { code: string; token: string } {
  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  const token = generateHmacToken(`${context}:${code}`, ttlMs || 10 * 60 * 1000);
  return { code, token };
}

export function verifyOtp(
  code: string,
  token: string,
  context: string,
): { valid: boolean; expired: boolean } {
  return verifyHmacToken(token, `${context}:${code}`);
}

export const TOKEN_TTL = {
  OTP_SHORT: 5 * 60 * 1000,
  OTP_STANDARD: 10 * 60 * 1000,
  HMAC_SHORT: 15 * 60 * 1000,
  HMAC_MEDIUM: 72 * 60 * 60 * 1000,
} as const;

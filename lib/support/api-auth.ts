import { createHash, timingSafeEqual } from 'crypto';
import { getServerClient } from '@/lib/supabase-server';

interface ApiAuthResult {
  tenant_id: number;
  tenant_slug: string;
  client_id: number;
  client_name: string;
  scopes: string[];
}

function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

export async function authenticateApiKey(
  authHeader: string | null
): Promise<ApiAuthResult> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid Authorization header. Expected: Bearer <api_key>');
  }

  const apiKey = authHeader.slice(7).trim();
  if (!apiKey || apiKey.length < 16) {
    throw new Error('Invalid API key format');
  }

  const prefix = apiKey.slice(0, 8);
  const keyHash = hashKey(apiKey);

  const supabase = getServerClient();

  const { data: client, error } = await supabase
    .from('sup_api_clients')
    .select('id, tenant_id, name, key_prefix, secret_hash, scopes, rate_limit, is_active')
    .eq('key_prefix', prefix)
    .eq('is_active', true)
    .single();

  if (error || !client) {
    throw new Error('Invalid API key');
  }

  const hashBuffer = Buffer.from(keyHash, 'hex');
  const storedBuffer = Buffer.from(client.secret_hash, 'hex');

  if (hashBuffer.length !== storedBuffer.length || !timingSafeEqual(hashBuffer, storedBuffer)) {
    throw new Error('Invalid API key');
  }

  const { data: tenant } = await supabase
    .from('sup_tenants')
    .select('slug, status')
    .eq('id', client.tenant_id)
    .single();

  if (!tenant || tenant.status !== 'active') {
    throw new Error('Tenant is not active');
  }

  await supabase
    .from('sup_api_clients')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', client.id);

  return {
    tenant_id: client.tenant_id,
    tenant_slug: tenant.slug,
    client_id: client.id,
    client_name: client.name,
    scopes: client.scopes,
  };
}

export function requireScope(scopes: string[], required: string): void {
  if (!scopes.includes(required)) {
    throw new Error(`Insufficient scope. Required: ${required}`);
  }
}

export function generateApiKey(): { key: string; prefix: string; hash: string } {
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  const key = 'dsk_' + Buffer.from(bytes).toString('base64url');
  const prefix = key.slice(0, 8);
  const hash = hashKey(key);
  return { key, prefix, hash };
}

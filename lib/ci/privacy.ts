import { createHmac } from 'crypto';
import { getServerClient } from '@/lib/supabase-server';

const SALT_ROTATION_DAYS = 90;

export async function getActiveSalt(tenantId: number): Promise<string> {
  const supabase = getServerClient();
  const { data, error } = await supabase
    .from('ci_pseudonym_salt')
    .select('salt')
    .eq('tenant_id', tenantId)
    .is('active_until', null)
    .order('active_from', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) throw new Error(`No active salt for tenant ${tenantId}`);
  return data.salt;
}

export function pseudonymise(salt: string, rawCookieId: string): string {
  return createHmac('sha256', salt).update(rawCookieId).digest('hex');
}

export async function rotateSalt(tenantId: number): Promise<void> {
  const supabase = getServerClient();
  const now = new Date().toISOString();

  await supabase
    .from('ci_pseudonym_salt')
    .update({ active_until: now })
    .eq('tenant_id', tenantId)
    .is('active_until', null);

  const newSalt = createHmac('sha256', `${Date.now()}-${Math.random()}`)
    .update('ci-salt-rotate')
    .digest('hex');

  await supabase
    .from('ci_pseudonym_salt')
    .insert({
      tenant_id: tenantId,
      salt: newSalt,
      active_from: now,
    });
}

export async function destroyExpiredSalts(tenantId: number): Promise<number> {
  const supabase = getServerClient();
  const cutoff = new Date(Date.now() - SALT_ROTATION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data } = await supabase
    .from('ci_pseudonym_salt')
    .delete()
    .eq('tenant_id', tenantId)
    .not('active_until', 'is', null)
    .lt('active_until', cutoff)
    .select('id');

  return data?.length ?? 0;
}

export interface ConsentCheck {
  hasConsent: boolean;
  consentScope: string;
}

export async function checkConsent(
  tenantId: number,
  anonymousId: string,
): Promise<ConsentCheck> {
  const supabase = getServerClient();
  const { data } = await supabase
    .from('ci_consent_log')
    .select('consent_given, consent_scope')
    .eq('tenant_id', tenantId)
    .eq('anonymous_id', anonymousId)
    .order('recorded_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    hasConsent: data?.consent_given ?? false,
    consentScope: data?.consent_scope ?? 'analytics',
  };
}

export async function recordConsent(
  tenantId: number,
  anonymousId: string,
  consentGiven: boolean,
  opts?: { consentVersion?: string; ipHash?: string; userAgent?: string },
): Promise<void> {
  const supabase = getServerClient();
  await supabase.from('ci_consent_log').insert({
    tenant_id: tenantId,
    anonymous_id: anonymousId,
    consent_given: consentGiven,
    consent_version: opts?.consentVersion,
    ip_hash: opts?.ipHash,
    user_agent: opts?.userAgent,
  });
}

export async function linkIdentity(
  tenantId: number,
  anonymousId: string,
  customerId: string,
  source: 'login' | 'order' | 'manual',
): Promise<void> {
  const supabase = getServerClient();
  await supabase
    .from('ci_identity_link')
    .upsert({
      tenant_id: tenantId,
      anonymous_id: anonymousId,
      customer_id: customerId,
      link_source: source,
    }, { onConflict: 'tenant_id,anonymous_id,customer_id' });

  await supabase
    .from('ci_sessions')
    .update({ customer_id: customerId, updated_at: new Date().toISOString() })
    .eq('tenant_id', tenantId)
    .eq('anonymous_id', anonymousId)
    .is('customer_id', null);
}

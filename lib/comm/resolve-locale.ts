/** BOP Communication Center — locale resolution chain for multilanguage documents. */

import { getServerClient } from '@/lib/supabase-server';

export const SUPPORTED_LOCALES = ['en', 'nl', 'de', 'fr', 'tr'] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const COUNTRY_LOCALE_MAP: Record<string, SupportedLocale> = {
  NL: 'nl',
  BE: 'nl',
  DE: 'de',
  AT: 'de',
  CH: 'de',
  FR: 'fr',
  LU: 'fr',
  GB: 'en',
  US: 'en',
  AU: 'en',
  CA: 'en',
  IE: 'en',
  TR: 'tr',
};

export const LOCALE_LABELS: Record<SupportedLocale, string> = {
  en: 'English',
  nl: 'Nederlands',
  de: 'Deutsch',
  fr: 'Français',
  tr: 'Türkçe',
};

export function isSupportedLocale(value: string): value is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

function normalize(raw: string | null | undefined): SupportedLocale | null {
  if (!raw) return null;
  const base = raw.toLowerCase().split(/[-_]/)[0];
  return isSupportedLocale(base) ? base : null;
}

export async function resolveLocale(options: {
  override?: string | null;
  documentLocale?: string | null;
  partnerLocale?: string | null;
  partnerCountry?: string | null;
  leadLocale?: string | null;
  tenantId?: number;
  supabase?: any;
}): Promise<SupportedLocale> {
  const fromOverride = normalize(options.override);
  if (fromOverride) return fromOverride;

  const fromDocument = normalize(options.documentLocale);
  if (fromDocument) return fromDocument;

  const fromPartner = normalize(options.partnerLocale);
  if (fromPartner) return fromPartner;

  if (options.partnerCountry) {
    const mapped = COUNTRY_LOCALE_MAP[options.partnerCountry.toUpperCase()];
    if (mapped) return mapped;
  }

  const fromLead = normalize(options.leadLocale);
  if (fromLead) return fromLead;

  if (options.tenantId != null) {
    const sb = options.supabase ?? getServerClient();
    const { data } = await sb
      .from('bop_tenants')
      .select('default_language')
      .eq('tenant_id', options.tenantId)
      .single();
    const fromTenant = normalize(data?.default_language);
    if (fromTenant) return fromTenant;
  }

  return 'en';
}

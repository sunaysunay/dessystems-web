export const locales = ['nl', 'en', 'de', 'tr', 'fr'] as const;
export type Locale = typeof locales[number];
export const defaultLocale: Locale = 'nl';

export const localeLabels: Record<Locale, string> = {
  nl: '🇳🇱 NL',
  en: '🇬🇧 EN',
  de: '🇩🇪 DE',
  tr: '🇹🇷 TR',
  fr: '🇫🇷 FR',
};

'use client';
import { defaultLocale, locales, type Locale } from '@/i18n/config';

export function getClientLocale(): Locale {
  if (typeof document === 'undefined') return defaultLocale;
  const match = document.cookie.match(/bop_locale=([^;]+)/);
  const val = match?.[1];
  return (locales.includes(val as Locale) ? val : defaultLocale) as Locale;
}

export function setClientLocale(locale: Locale) {
  document.cookie = `bop_locale=${locale};path=/;max-age=31536000;samesite=lax`;
  window.location.reload();
}
